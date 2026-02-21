import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { stubHandler } from './base.controller';
import bcrypt from 'bcryptjs';
import { MODULE_PERMISSIONS, ADMIN_PERMISSIONS, STAFF_PERMISSIONS, ActionType } from '../constants/permissions';
import { clearPermissionCache } from '../middleware/auth';

export class SettingsController {
  // Company
  getCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const company = await prisma.company.findFirst();
      res.json({ success: true, data: company });
    } catch (error) {
      next(error);
    }
  };

  updateCompany = stubHandler('Update Company');

  // Users
  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        include: { group: true },
        orderBy: { code: 'asc' },
      });
      res.json({ success: true, data: users.map(u => ({ ...u, passwordHash: undefined })) });
    } catch (error) {
      next(error);
    }
  };

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const user = await prisma.user.findUnique({ where: { id }, include: { group: true } });
      if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });
      res.json({ success: true, data: { ...user, passwordHash: undefined } });
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const passwordHash = await bcrypt.hash(data.password || 'changeme', 10);
      
      const user = await prisma.user.create({
        data: {
          code: data.code.toUpperCase(),
          name: data.name,
          email: data.email,
          passwordHash,
          phone: data.phone,
          groupId: data.groupId,
          isAdmin: data.isAdmin || false,
        },
      });

      res.status(201).json({ success: true, data: { ...user, passwordHash: undefined } });
    } catch (error) {
      next(error);
    }
  };

  changeUserPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { newPassword } = req.body as { newPassword?: string };
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters' } });
      }
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (!user) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id }, data: { passwordHash } });
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  updateUser = stubHandler('Update User');
  deleteUser = stubHandler('Delete User');

  // User Groups
  listUserGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await prisma.userGroup.findMany({
        orderBy: { code: 'asc' },
        include: {
          _count: { select: { users: true } },
        },
      });
      res.json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  };

  getUserGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const group = await prisma.userGroup.findUnique({
        where: { id },
        include: {
          _count: { select: { users: true } },
          accessRights: true,
        },
      });
      if (!group) {
        return res.status(404).json({ success: false, error: { message: 'User group not found' } });
      }
      res.json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  };

  createUserGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, description, copyFromGroupId } = req.body;

      // Check for duplicate code
      const existing = await prisma.userGroup.findUnique({ where: { code: code.toUpperCase() } });
      if (existing) {
        return res.status(400).json({ success: false, error: { message: 'Group code already exists' } });
      }

      const group = await prisma.userGroup.create({
        data: {
          code: code.toUpperCase(),
          name,
          description,
        },
      });

      // Copy permissions from another group or use staff defaults
      let permissions: Record<string, ActionType[]> = STAFF_PERMISSIONS;
      if (copyFromGroupId) {
        const sourceRights = await prisma.accessRight.findMany({ where: { groupId: copyFromGroupId } });
        permissions = {};
        for (const ar of sourceRights) {
          const actions: ActionType[] = [];
          if (ar.canView) actions.push('view');
          if (ar.canAdd) actions.push('create');
          if (ar.canEdit) actions.push('edit');
          if (ar.canDelete) actions.push('delete');
          const custom = (ar.customPermissions as Record<string, boolean>) || {};
          for (const [action, allowed] of Object.entries(custom)) {
            if (allowed) actions.push(action as ActionType);
          }
          permissions[ar.moduleCode] = actions;
        }
      }

      // Create access rights for the new group
      await this.createAccessRightsForGroup(group.id, permissions);

      res.status(201).json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  };

  updateUserGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, isActive } = req.body;

      const group = await prisma.userGroup.update({
        where: { id },
        data: { name, description, isActive },
      });

      res.json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  };

  deleteUserGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      // Check if group has users
      const usersCount = await prisma.user.count({ where: { groupId: id } });
      if (usersCount > 0) {
        return res.status(400).json({
          success: false,
          error: { message: `Cannot delete group with ${usersCount} user(s). Reassign users first.` },
        });
      }

      // Delete access rights first
      await prisma.accessRight.deleteMany({ where: { groupId: id } });
      await prisma.userGroup.delete({ where: { id } });

      clearPermissionCache(id);

      res.json({ success: true, message: 'User group deleted' });
    } catch (error) {
      next(error);
    }
  };

  // Access Rights
  getAccessRights = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groupId = parseInt(req.params.groupId);

      const accessRights = await prisma.accessRight.findMany({
        where: { groupId },
      });

      // Transform to frontend format: { moduleCode: [actions] }
      const permissions: Record<string, string[]> = {};
      for (const ar of accessRights) {
        const actions: string[] = [];
        if (ar.canView) actions.push('view');
        if (ar.canAdd) actions.push('create');
        if (ar.canEdit) actions.push('edit');
        if (ar.canDelete) actions.push('delete');
        const custom = (ar.customPermissions as Record<string, boolean>) || {};
        for (const [action, allowed] of Object.entries(custom)) {
          if (allowed) actions.push(action);
        }
        permissions[ar.moduleCode] = actions;
      }

      res.json({
        success: true,
        data: {
          groupId,
          permissions,
          modules: MODULE_PERMISSIONS,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateAccessRights = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const { permissions } = req.body as { permissions: Record<string, string[]> };

      // Delete existing access rights for this group
      await prisma.accessRight.deleteMany({ where: { groupId } });

      // Create new access rights
      for (const [moduleCode, actions] of Object.entries(permissions)) {
        const actionsSet = new Set(actions);
        await prisma.accessRight.create({
          data: {
            groupId,
            moduleCode,
            functionCode: 'ALL', // We use moduleCode for simplicity
            canView: actionsSet.has('view'),
            canAdd: actionsSet.has('create'),
            canEdit: actionsSet.has('edit'),
            canDelete: actionsSet.has('delete'),
            canPrint: actionsSet.has('view'), // Print = View
            canExport: actionsSet.has('view'), // Export = View
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

      // Clear permission cache for this group
      clearPermissionCache(groupId);

      res.json({ success: true, message: 'Access rights updated' });
    } catch (error) {
      next(error);
    }
  };

  // Helper to create access rights for a new group
  private createAccessRightsForGroup = async (groupId: number, permissions: Record<string, ActionType[]>) => {
    for (const [moduleCode, actions] of Object.entries(permissions)) {
      const actionsSet = new Set(actions);
      await prisma.accessRight.create({
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
  };

  // Get current user's permissions (for frontend)
  getMyPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.isAdmin) {
        // Admin gets all permissions
        const permissions: Record<string, string[]> = {};
        for (const mod of MODULE_PERMISSIONS) {
          permissions[mod.code] = [...mod.actions];
        }
        return res.json({
          success: true,
          data: { isAdmin: true, permissions, modules: MODULE_PERMISSIONS },
        });
      }

      const accessRights = await prisma.accessRight.findMany({
        where: { groupId: req.user?.groupId },
      });

      const permissions: Record<string, string[]> = {};
      for (const ar of accessRights) {
        const actions: string[] = [];
        if (ar.canView) actions.push('view');
        if (ar.canAdd) actions.push('create');
        if (ar.canEdit) actions.push('edit');
        if (ar.canDelete) actions.push('delete');
        const custom = (ar.customPermissions as Record<string, boolean>) || {};
        for (const [action, allowed] of Object.entries(custom)) {
          if (allowed) actions.push(action);
        }
        permissions[ar.moduleCode] = actions;
      }

      res.json({
        success: true,
        data: { isAdmin: false, permissions, modules: MODULE_PERMISSIONS },
      });
    } catch (error) {
      next(error);
    }
  };

  // Currencies
  listCurrencies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currencies = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
      res.json({ success: true, data: currencies });
    } catch (error) {
      next(error);
    }
  };

  createCurrency = stubHandler('Create Currency');
  updateCurrency = stubHandler('Update Currency');
  deleteCurrency = stubHandler('Delete Currency');
  updateExchangeRate = stubHandler('Update Exchange Rate');

  // Tax Codes
  listTaxCodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taxCodes = await prisma.taxCode.findMany({ orderBy: { code: 'asc' } });
      res.json({ success: true, data: taxCodes });
    } catch (error) {
      next(error);
    }
  };

  createTaxCode = stubHandler('Create Tax Code');
  updateTaxCode = stubHandler('Update Tax Code');
  deleteTaxCode = stubHandler('Delete Tax Code');

  // UOM
  listUOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uoms = await prisma.uOM.findMany({ orderBy: { code: 'asc' } });
      res.json({ success: true, data: uoms });
    } catch (error) {
      next(error);
    }
  };

  createUOM = stubHandler('Create UOM');
  updateUOM = stubHandler('Update UOM');
  deleteUOM = stubHandler('Delete UOM');

  // Locations
  listLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locations = await prisma.location.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: locations });
    } catch (error) {
      next(error);
    }
  };

  createLocation = stubHandler('Create Location');
  updateLocation = stubHandler('Update Location');
  deleteLocation = stubHandler('Delete Location');

  // Areas
  listAreas = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const areas = await prisma.area.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: areas });
    } catch (error) {
      next(error);
    }
  };

  createArea = stubHandler('Create Area');
  updateArea = stubHandler('Update Area');
  deleteArea = stubHandler('Delete Area');

  // Sales Agents
  listSalesAgents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await prisma.salesAgent.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: agents });
    } catch (error) {
      next(error);
    }
  };

  createSalesAgent = stubHandler('Create Sales Agent');
  updateSalesAgent = stubHandler('Update Sales Agent');
  deleteSalesAgent = stubHandler('Delete Sales Agent');

  // Purchase Agents
  listPurchaseAgents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await prisma.purchaseAgent.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: agents });
    } catch (error) {
      next(error);
    }
  };

  createPurchaseAgent = stubHandler('Create Purchase Agent');
  updatePurchaseAgent = stubHandler('Update Purchase Agent');
  deletePurchaseAgent = stubHandler('Delete Purchase Agent');

  // Product Groups
  listProductGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await prisma.productGroup.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  };

  createProductGroup = stubHandler('Create Product Group');
  updateProductGroup = stubHandler('Update Product Group');
  deleteProductGroup = stubHandler('Delete Product Group');

  // Payment Methods
  listPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const methods = await prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: methods });
    } catch (error) {
      next(error);
    }
  };

  createPaymentMethod = stubHandler('Create Payment Method');
  updatePaymentMethod = stubHandler('Update Payment Method');
  deletePaymentMethod = stubHandler('Delete Payment Method');

  // Document Series
  listDocumentSeries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const series = await prisma.documentSeries.findMany({ orderBy: [{ documentType: 'asc' }, { seriesCode: 'asc' }] });
      res.json({ success: true, data: series });
    } catch (error) {
      next(error);
    }
  };

  createDocumentSeries = stubHandler('Create Document Series');
  updateDocumentSeries = stubHandler('Update Document Series');

  // Fiscal Years
  listFiscalYears = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const years = await prisma.fiscalYear.findMany({ orderBy: { startDate: 'desc' }, include: { periods: true } });
      res.json({ success: true, data: years });
    } catch (error) {
      next(error);
    }
  };

  createFiscalYear = stubHandler('Create Fiscal Year');
  updateFiscalYear = stubHandler('Update Fiscal Year');
  closeFiscalYear = stubHandler('Close Fiscal Year');

  // Projects
  listProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await prisma.project.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: projects });
    } catch (error) {
      next(error);
    }
  };

  createProject = stubHandler('Create Project');
  updateProject = stubHandler('Update Project');
  deleteProject = stubHandler('Delete Project');

  // Departments
  listDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const depts = await prisma.department.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: depts });
    } catch (error) {
      next(error);
    }
  };

  createDepartment = stubHandler('Create Department');
  updateDepartment = stubHandler('Update Department');
  deleteDepartment = stubHandler('Delete Department');

  // Audit Trail
  getAuditTrail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const trails = await prisma.auditTrail.findMany({
        take: limit,
        orderBy: { auditDate: 'desc' },
      });
      res.json({ success: true, data: trails });
    } catch (error) {
      next(error);
    }
  };

  // System
  createBackup = stubHandler('Create Backup');
  restoreBackup = stubHandler('Restore Backup');
}
