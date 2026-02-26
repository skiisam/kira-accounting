import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { resolveTenantClientByCompanyId, withTenantClient } from '../config/tenant';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { prisma } from '../config/database';
import { ModuleCode, ActionType } from '../constants/permissions';

export interface JwtPayload {
  userId: number;
  userCode: string;
  email?: string;
  groupId: number;
  companyId?: number;
  isAdmin: boolean;
}

// Cached permissions per group (refreshed on update)
const permissionCache = new Map<number, Map<string, Set<string>>>();

export function clearPermissionCache(groupId?: number) {
  if (groupId) {
    permissionCache.delete(groupId);
  } else {
    permissionCache.clear();
  }
}

async function loadGroupPermissions(groupId: number): Promise<Map<string, Set<string>>> {
  if (permissionCache.has(groupId)) {
    return permissionCache.get(groupId)!;
  }

  const accessRights = await prisma.accessRight.findMany({
    where: { groupId },
  });

  const permissions = new Map<string, Set<string>>();
  
  for (const ar of accessRights) {
    const actions = new Set<string>();
    const custom = (ar.customPermissions as Record<string, boolean>) || {};
    
    // Map old boolean fields to actions
    if (ar.canView) actions.add('view');
    if (ar.canAdd) actions.add('create');
    if (ar.canEdit) actions.add('edit');
    if (ar.canDelete) actions.add('delete');
    
    // Add custom permissions (post, void, adjust, transfer, manage)
    for (const [action, allowed] of Object.entries(custom)) {
      if (allowed) actions.add(action);
    }
    
    permissions.set(ar.moduleCode, actions);
  }

  permissionCache.set(groupId, permissions);
  return permissions;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      permissions?: Map<string, Set<string>>;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, code: true, isActive: true, groupId: true, companyId: true, isAdmin: true, email: true },
    });

    if (!user || !user.isActive) {
      throw UnauthorizedError('User not found or inactive');
    }

    req.user = {
      userId: user.id,
      userCode: user.code,
      email: user.email ?? undefined,
      groupId: user.groupId,
      companyId: user.companyId ?? undefined,
      isAdmin: user.isAdmin,
    };
    
    // Load permissions for non-admin users
    if (!decoded.isAdmin) {
      req.permissions = await loadGroupPermissions(decoded.groupId);
    }
    const companyId = req.user.companyId;
    if (companyId) {
      const tenantClient = await resolveTenantClientByCompanyId(companyId);
      await withTenantClient(tenantClient, async () => {
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isAdmin) {
    return next(ForbiddenError('Admin access required'));
  }
  next();
};

/**
 * Check if user has specific permission
 * @param moduleCode - Module code (SALES, PURCHASE, etc.)
 * @param action - Action (view, create, edit, delete, post, void, etc.)
 */
export const requirePermission = (moduleCode: ModuleCode | string, action: ActionType | string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Admins have full access
      if (req.user?.isAdmin) {
        return next();
      }

      const permissions = req.permissions;
      if (!permissions) {
        return next(ForbiddenError('Permission check failed'));
      }

      const modulePermissions = permissions.get(moduleCode);
      if (!modulePermissions || !modulePermissions.has(action)) {
        return next(ForbiddenError(`No permission: ${moduleCode}/${action}`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has any of the specified permissions
 */
export const requireAnyPermission = (checks: Array<{ module: ModuleCode | string; action: ActionType | string }>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.isAdmin) {
        return next();
      }

      const permissions = req.permissions;
      if (!permissions) {
        return next(ForbiddenError('Permission check failed'));
      }

      const hasAny = checks.some(({ module, action }) => {
        const modulePermissions = permissions.get(module);
        return modulePermissions && modulePermissions.has(action);
      });

      if (!hasAny) {
        return next(ForbiddenError('Insufficient permissions'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper to check permission in code (for conditional logic)
 */
export function hasPermission(
  permissions: Map<string, Set<string>> | undefined,
  moduleCode: string,
  action: string,
  isAdmin?: boolean
): boolean {
  if (isAdmin) return true;
  if (!permissions) return false;
  const modulePermissions = permissions.get(moduleCode);
  return modulePermissions ? modulePermissions.has(action) : false;
}
