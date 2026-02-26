import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { MODULE_PERMISSIONS, STAFF_PERMISSIONS, ActionType } from '../constants/permissions';
import { clearPermissionCache } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';

/**
 * Access Rights Controller
 * Handles user groups and permissions management
 */
export class AccessRightsController {
  /**
   * GET /api/v1/access-rights/groups
   * List all user groups with their permissions
   */
  listGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await prisma.userGroup.findMany({
        orderBy: { code: 'asc' },
        include: {
          _count: { select: { users: true, accessRights: true } },
          accessRights: true,
        },
      });

      // Transform access rights to permission format for each group
      const data = groups.map(group => ({
        id: group.id,
        code: group.code,
        name: group.name,
        description: group.description,
        isActive: group.isActive,
        userCount: group._count.users,
        permissions: this.transformAccessRightsToPermissions(group.accessRights),
      }));

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/access-rights/groups/:id
   * Get single group with permissions
   */
  getGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw ValidationError({ message: 'Invalid group ID' });
      }

      const group = await prisma.userGroup.findUnique({
        where: { id },
        include: {
          _count: { select: { users: true } },
          accessRights: true,
          users: {
            select: { id: true, code: true, name: true, email: true, isActive: true },
            take: 50,
          },
        },
      });

      if (!group) {
        throw NotFoundError('User group not found');
      }

      res.json({
        success: true,
        data: {
          id: group.id,
          code: group.code,
          name: group.name,
          description: group.description,
          isActive: group.isActive,
          userCount: group._count.users,
          permissions: this.transformAccessRightsToPermissions(group.accessRights),
          users: group.users,
          modules: MODULE_PERMISSIONS,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/access-rights/groups
   * Create user group
   */
  createGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, description, copyFromGroupId, permissions } = req.body;

      if (!code || !name) {
        throw ValidationError({ message: 'Code and name are required', fields: ['code', 'name'] });
      }

      // Check for duplicate code
      const existing = await prisma.userGroup.findUnique({ 
        where: { code: code.toUpperCase() } 
      });
      if (existing) {
        throw ValidationError({ message: 'Group code already exists' });
      }

      // Determine permissions to use
      let initialPermissions: Record<string, ActionType[]> = STAFF_PERMISSIONS;

      if (permissions) {
        // Use provided permissions
        initialPermissions = permissions;
      } else if (copyFromGroupId) {
        // Copy from another group
        const sourceRights = await prisma.accessRight.findMany({ 
          where: { groupId: copyFromGroupId } 
        });
        initialPermissions = {};
        for (const ar of sourceRights) {
          initialPermissions[ar.moduleCode] = this.extractActionsFromAccessRight(ar);
        }
      }

      // Create group with permissions in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const group = await tx.userGroup.create({
          data: {
            code: code.toUpperCase(),
            name,
            description,
          },
        });

        // Create access rights
        await this.createAccessRightsForGroup(tx, group.id, initialPermissions);

        return group;
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'User group created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/access-rights/groups/:id
   * Update user group
   */
  updateGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw ValidationError({ message: 'Invalid group ID' });
      }

      const { name, description, isActive } = req.body;

      // Check group exists
      const existing = await prisma.userGroup.findUnique({ where: { id } });
      if (!existing) {
        throw NotFoundError('User group not found');
      }

      // Prevent deactivating ADMIN group
      if (existing.code === 'ADMIN' && isActive === false) {
        throw ValidationError({ message: 'Cannot deactivate the ADMIN group' });
      }

      const group = await prisma.userGroup.update({
        where: { id },
        data: { 
          name: name ?? existing.name, 
          description: description ?? existing.description, 
          isActive: isActive ?? existing.isActive 
        },
      });

      res.json({
        success: true,
        data: group,
        message: 'User group updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/access-rights/groups/:id
   * Delete user group
   */
  deleteGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw ValidationError({ message: 'Invalid group ID' });
      }

      const group = await prisma.userGroup.findUnique({ 
        where: { id },
        include: { _count: { select: { users: true } } }
      });

      if (!group) {
        throw NotFoundError('User group not found');
      }

      // Prevent deleting ADMIN group
      if (group.code === 'ADMIN') {
        throw ValidationError({ message: 'Cannot delete the ADMIN group' });
      }

      // Check if group has users
      if (group._count.users > 0) {
        throw ValidationError({
          message: `Cannot delete group with ${group._count.users} user(s). Reassign users first.`,
        });
      }

      // Delete in transaction
      await prisma.$transaction(async (tx) => {
        await tx.accessRight.deleteMany({ where: { groupId: id } });
        await tx.userGroup.delete({ where: { id } });
      });

      // Clear permission cache
      clearPermissionCache(id);

      res.json({
        success: true,
        message: 'User group deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/access-rights/groups/:id/permissions
   * Update permissions for a group
   */
  updatePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw ValidationError({ message: 'Invalid group ID' });
      }

      const { permissions } = req.body as { permissions: Record<string, string[]> };

      if (!permissions || typeof permissions !== 'object') {
        throw ValidationError({ message: 'Permissions object is required' });
      }

      // Verify group exists
      const group = await prisma.userGroup.findUnique({ where: { id } });
      if (!group) {
        throw NotFoundError('User group not found');
      }

      // Update permissions in transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing access rights
        await tx.accessRight.deleteMany({ where: { groupId: id } });

        // Create new access rights
        for (const [moduleCode, actions] of Object.entries(permissions)) {
          const actionsSet = new Set(actions);
          await tx.accessRight.create({
            data: {
              groupId: id,
              moduleCode,
              functionCode: 'ALL',
              canView: actionsSet.has('view'),
              canAdd: actionsSet.has('create'),
              canEdit: actionsSet.has('edit'),
              canDelete: actionsSet.has('delete'),
              canPrint: actionsSet.has('view'),
              canExport: actionsSet.has('view'),
              customPermissions: {
                post: actionsSet.has('post'),
                void: actionsSet.has('void'),
                adjust: actionsSet.has('adjust'),
                transfer: actionsSet.has('transfer'),
                manage: actionsSet.has('manage'),
              },
            },
          });
        }
      });

      // Clear permission cache for this group
      clearPermissionCache(id);

      res.json({
        success: true,
        message: 'Permissions updated successfully',
        data: { groupId: id, permissions },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/access-rights/modules
   * Get available modules and their actions
   */
  getModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: MODULE_PERMISSIONS,
      });
    } catch (error) {
      next(error);
    }
  };

  // ========== Helper Methods ==========

  /**
   * Transform access rights array to permissions object
   */
  private transformAccessRightsToPermissions(
    accessRights: Array<{
      moduleCode: string;
      canView: boolean;
      canAdd: boolean;
      canEdit: boolean;
      canDelete: boolean;
      customPermissions: any;
    }>
  ): Record<string, string[]> {
    const permissions: Record<string, string[]> = {};
    
    for (const ar of accessRights) {
      permissions[ar.moduleCode] = this.extractActionsFromAccessRight(ar);
    }
    
    return permissions;
  }

  /**
   * Extract action strings from an access right record
   */
  private extractActionsFromAccessRight(ar: {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    customPermissions: any;
  }): ActionType[] {
    const actions: ActionType[] = [];
    
    if (ar.canView) actions.push('view');
    if (ar.canAdd) actions.push('create');
    if (ar.canEdit) actions.push('edit');
    if (ar.canDelete) actions.push('delete');
    
    const custom = (ar.customPermissions as Record<string, boolean>) || {};
    for (const [action, allowed] of Object.entries(custom)) {
      if (allowed) actions.push(action as ActionType);
    }
    
    return actions;
  }

  /**
   * Create access rights for a group
   */
  private async createAccessRightsForGroup(
    tx: any,
    groupId: number,
    permissions: Record<string, ActionType[]>
  ): Promise<void> {
    for (const [moduleCode, actions] of Object.entries(permissions)) {
      const actionsSet = new Set(actions);
      await tx.accessRight.create({
        data: {
          groupId,
          moduleCode,
          functionCode: 'ALL',
          canView: actionsSet.has('view'),
          canAdd: actionsSet.has('create'),
          canEdit: actionsSet.has('edit'),
          canDelete: actionsSet.has('delete'),
          canPrint: actionsSet.has('view'),
          canExport: actionsSet.has('view'),
          customPermissions: {
            post: actionsSet.has('post'),
            void: actionsSet.has('void'),
            adjust: actionsSet.has('adjust'),
            transfer: actionsSet.has('transfer'),
            manage: actionsSet.has('manage'),
          },
        },
      });
    }
  }
  /**
   * GET /api/v1/access-rights/my-permissions
   * Get current user's permissions
   */
  getMyPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          group: {
            include: {
              accessRights: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: { message: 'User not found' } });
      }

      res.json({
        isAdmin: user.isAdmin,
        groupId: user.groupId,
        groupCode: user.group?.code || '',
        permissions: user.group?.accessRights?.map(ar => ({
          moduleCode: ar.moduleCode,
          functionCode: ar.functionCode,
          canView: ar.canView,
          canAdd: ar.canAdd,
          canEdit: ar.canEdit,
          canDelete: ar.canDelete,
          canPrint: ar.canPrint,
          canExport: ar.canExport,
          customPermissions: ar.customPermissions as Record<string, boolean> | undefined,
        })) || [],
      });
    } catch (error) {
      next(error);
    }
  };
}

export const accessRightsController = new AccessRightsController();
