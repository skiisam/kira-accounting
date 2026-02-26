import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ForbiddenError } from './errorHandler';
import { ModuleCode, ActionType } from '../constants/permissions';

/**
 * Permission cache for quick lookups
 * Key: groupId, Value: Map<moduleCode, Set<actions>>
 */
const permissionCache = new Map<number, Map<string, Set<string>>>();

/**
 * Clear permission cache for a specific group or all groups
 */
export function clearPermissionCacheForGroup(groupId?: number): void {
  if (groupId !== undefined) {
    permissionCache.delete(groupId);
  } else {
    permissionCache.clear();
  }
}

/**
 * Load permissions for a group from database
 */
async function loadGroupPermissions(groupId: number): Promise<Map<string, Set<string>>> {
  // Check cache first
  if (permissionCache.has(groupId)) {
    return permissionCache.get(groupId)!;
  }

  const accessRights = await prisma.accessRight.findMany({
    where: { groupId },
  });

  const permissions = new Map<string, Set<string>>();

  for (const ar of accessRights) {
    const actions = new Set<string>();

    // Map boolean fields to actions
    if (ar.canView) actions.add('view');
    if (ar.canAdd) actions.add('create');
    if (ar.canEdit) actions.add('edit');
    if (ar.canDelete) actions.add('delete');
    if (ar.canPrint) actions.add('print');
    if (ar.canExport) actions.add('export');

    // Add custom permissions
    const custom = (ar.customPermissions as Record<string, boolean>) || {};
    for (const [action, allowed] of Object.entries(custom)) {
      if (allowed) actions.add(action);
    }

    permissions.set(ar.moduleCode, actions);
  }

  // Cache the result
  permissionCache.set(groupId, permissions);
  return permissions;
}

/**
 * Check if user has permission for a specific module and action
 * Middleware factory that returns an Express middleware
 * 
 * @param module - Module code (e.g., 'SALES', 'PURCHASE', 'AR')
 * @param action - Action type (e.g., 'view', 'create', 'edit', 'delete', 'post', 'void')
 * 
 * @example
 * // Require view permission for SALES module
 * router.get('/sales', authenticate, checkPermission('SALES', 'view'), salesController.list);
 * 
 * // Require create permission for AR module
 * router.post('/ar/invoices', authenticate, checkPermission('AR', 'create'), arController.create);
 */
export function checkPermission(module: ModuleCode | string, action: ActionType | string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Admin users have full access
      if (req.user?.isAdmin) {
        return next();
      }

      // User must be authenticated
      if (!req.user) {
        return next(ForbiddenError('Authentication required'));
      }

      const { groupId } = req.user;

      // Load permissions for user's group
      const permissions = await loadGroupPermissions(groupId);

      // Check if user has the required permission
      const modulePermissions = permissions.get(module);
      
      if (!modulePermissions || !modulePermissions.has(action)) {
        return next(ForbiddenError(
          `Access denied: You don't have ${action} permission for ${module}`
        ));
      }

      // Permission granted
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param checks - Array of {module, action} pairs to check
 * 
 * @example
 * // Allow access if user can view SALES or view REPORTS
 * router.get('/dashboard', 
 *   authenticate, 
 *   checkAnyPermission([
 *     { module: 'SALES', action: 'view' },
 *     { module: 'REPORTS', action: 'view' }
 *   ]), 
 *   dashboardController.get
 * );
 */
export function checkAnyPermission(
  checks: Array<{ module: ModuleCode | string; action: ActionType | string }>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Admin users have full access
      if (req.user?.isAdmin) {
        return next();
      }

      // User must be authenticated
      if (!req.user) {
        return next(ForbiddenError('Authentication required'));
      }

      const { groupId } = req.user;

      // Load permissions for user's group
      const permissions = await loadGroupPermissions(groupId);

      // Check if user has any of the required permissions
      const hasAny = checks.some(({ module, action }) => {
        const modulePermissions = permissions.get(module);
        return modulePermissions && modulePermissions.has(action);
      });

      if (!hasAny) {
        return next(ForbiddenError('Access denied: Insufficient permissions'));
      }

      // Permission granted
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has all of the specified permissions
 * 
 * @param checks - Array of {module, action} pairs to check
 * 
 * @example
 * // Require both SALES create and AR create permissions
 * router.post('/convert-to-invoice', 
 *   authenticate, 
 *   checkAllPermissions([
 *     { module: 'SALES', action: 'create' },
 *     { module: 'AR', action: 'create' }
 *   ]), 
 *   salesController.convertToInvoice
 * );
 */
export function checkAllPermissions(
  checks: Array<{ module: ModuleCode | string; action: ActionType | string }>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Admin users have full access
      if (req.user?.isAdmin) {
        return next();
      }

      // User must be authenticated
      if (!req.user) {
        return next(ForbiddenError('Authentication required'));
      }

      const { groupId } = req.user;

      // Load permissions for user's group
      const permissions = await loadGroupPermissions(groupId);

      // Check if user has all of the required permissions
      const missingPermissions: string[] = [];
      
      for (const { module, action } of checks) {
        const modulePermissions = permissions.get(module);
        if (!modulePermissions || !modulePermissions.has(action)) {
          missingPermissions.push(`${module}/${action}`);
        }
      }

      if (missingPermissions.length > 0) {
        return next(ForbiddenError(
          `Access denied: Missing permissions for ${missingPermissions.join(', ')}`
        ));
      }

      // All permissions granted
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper function to check permission in code (not as middleware)
 * Useful for conditional logic within handlers
 * 
 * @param req - Express request with user info
 * @param module - Module code
 * @param action - Action type
 * @returns Promise<boolean>
 * 
 * @example
 * async function handler(req, res) {
 *   const canDelete = await hasPermission(req, 'SALES', 'delete');
 *   if (canDelete) {
 *     // Show delete button
 *   }
 * }
 */
export async function hasPermission(
  req: Request,
  module: ModuleCode | string,
  action: ActionType | string
): Promise<boolean> {
  // Admin users have full access
  if (req.user?.isAdmin) {
    return true;
  }

  // User must be authenticated
  if (!req.user) {
    return false;
  }

  const { groupId } = req.user;
  const permissions = await loadGroupPermissions(groupId);
  const modulePermissions = permissions.get(module);

  return modulePermissions ? modulePermissions.has(action) : false;
}

/**
 * Get all permissions for the current user
 * Useful for sending permission info to frontend
 * 
 * @param req - Express request with user info
 * @returns Promise<Record<string, string[]>>
 */
export async function getUserPermissions(
  req: Request
): Promise<{ isAdmin: boolean; permissions: Record<string, string[]> }> {
  if (req.user?.isAdmin) {
    // Admin gets all permissions - return empty permissions object
    // Frontend should treat isAdmin=true as having all permissions
    return { isAdmin: true, permissions: {} };
  }

  if (!req.user) {
    return { isAdmin: false, permissions: {} };
  }

  const { groupId } = req.user;
  const permissions = await loadGroupPermissions(groupId);

  // Convert Map<string, Set<string>> to Record<string, string[]>
  const result: Record<string, string[]> = {};
  for (const [module, actions] of permissions.entries()) {
    result[module] = Array.from(actions);
  }

  return { isAdmin: false, permissions: result };
}
