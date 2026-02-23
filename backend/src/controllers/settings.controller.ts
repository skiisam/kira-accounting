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

  createCurrency = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, symbol, exchangeRate } = req.body;
      const currency = await prisma.currency.create({ data: { code, name, symbol, exchangeRate: exchangeRate || 1 } });
      res.status(201).json({ success: true, data: currency, message: 'Currency created' });
    } catch (error) { next(error); }
  };
  updateCurrency = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const { name, symbol, exchangeRate } = req.body;
      const currency = await prisma.currency.update({ where: { code }, data: { name, symbol, exchangeRate } });
      res.json({ success: true, data: currency, message: 'Currency updated' });
    } catch (error) { next(error); }
  };
  deleteCurrency = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      await prisma.currency.delete({ where: { code } });
      res.json({ success: true, message: 'Currency deleted' });
    } catch (error) { next(error); }
  };
  updateExchangeRate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const { exchangeRate } = req.body;
      const currency = await prisma.currency.update({ where: { code }, data: { exchangeRate } });
      res.json({ success: true, data: currency, message: 'Exchange rate updated' });
    } catch (error) { next(error); }
  };

  // Tax Codes
  listTaxCodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taxCodes = await prisma.taxCode.findMany({ orderBy: { code: 'asc' } });
      res.json({ success: true, data: taxCodes });
    } catch (error) {
      next(error);
    }
  };

  createTaxCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, rate, taxType, isActive } = req.body;
      const taxCode = await prisma.taxCode.create({ data: { code, name, rate, taxType, isActive: isActive ?? true } });
      res.status(201).json({ success: true, data: taxCode, message: 'Tax code created' });
    } catch (error) { next(error); }
  };
  updateTaxCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const { name, rate, taxType, isActive } = req.body;
      const taxCode = await prisma.taxCode.update({ where: { code }, data: { name, rate, taxType, isActive } });
      res.json({ success: true, data: taxCode, message: 'Tax code updated' });
    } catch (error) { next(error); }
  };
  deleteTaxCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      await prisma.taxCode.delete({ where: { code } });
      res.json({ success: true, message: 'Tax code deleted' });
    } catch (error) { next(error); }
  };

  // UOM
  listUOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uoms = await prisma.uOM.findMany({ orderBy: { code: 'asc' } });
      res.json({ success: true, data: uoms });
    } catch (error) {
      next(error);
    }
  };

  createUOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name } = req.body;
      const uom = await prisma.uOM.create({ data: { code, name } });
      res.status(201).json({ success: true, data: uom, message: 'UOM created' });
    } catch (error) { next(error); }
  };
  updateUOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { code, name } = req.body;
      const uom = await prisma.uOM.update({ where: { id: parseInt(id) }, data: { code, name } });
      res.json({ success: true, data: uom, message: 'UOM updated' });
    } catch (error) { next(error); }
  };
  deleteUOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.uOM.delete({ where: { id: parseInt(id) } });
      res.json({ success: true, message: 'UOM deleted' });
    } catch (error) { next(error); }
  };

  // Locations
  listLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locations = await prisma.location.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: locations });
    } catch (error) {
      next(error);
    }
  };

  createLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, address, isDefault, isActive } = req.body;
      const location = await prisma.location.create({ data: { code, name, address, isDefault: isDefault ?? false, isActive: isActive ?? true } });
      res.status(201).json({ success: true, data: location, message: 'Location created' });
    } catch (error) { next(error); }
  };
  updateLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { code, name, address, isDefault, isActive } = req.body;
      const location = await prisma.location.update({ where: { id: parseInt(id) }, data: { code, name, address, isDefault, isActive } });
      res.json({ success: true, data: location, message: 'Location updated' });
    } catch (error) { next(error); }
  };
  deleteLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.location.update({ where: { id: parseInt(id) }, data: { isActive: false } });
      res.json({ success: true, message: 'Location deactivated' });
    } catch (error) { next(error); }
  };

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

  // Product Types
  listProductTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await prisma.productType.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  };

  createProductType = stubHandler('Create Product Type');
  updateProductType = stubHandler('Update Product Type');
  deleteProductType = stubHandler('Delete Product Type');

  // Payment Methods
  listPaymentMethods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const methods = await prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: methods });
    } catch (error) {
      next(error);
    }
  };

  createPaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, paymentType, accountId, isActive } = req.body;
      const method = await prisma.paymentMethod.create({ data: { code, name, paymentType, accountId, isActive: isActive ?? true } });
      res.status(201).json({ success: true, data: method, message: 'Payment method created' });
    } catch (error) { next(error); }
  };
  updatePaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { code, name, paymentType, accountId, isActive } = req.body;
      const method = await prisma.paymentMethod.update({ where: { id: parseInt(id) }, data: { code, name, paymentType, accountId, isActive } });
      res.json({ success: true, data: method, message: 'Payment method updated' });
    } catch (error) { next(error); }
  };
  deletePaymentMethod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.paymentMethod.update({ where: { id: parseInt(id) }, data: { isActive: false } });
      res.json({ success: true, message: 'Payment method deactivated' });
    } catch (error) { next(error); }
  };

  // Document Series
  listDocumentSeries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const series = await prisma.documentSeries.findMany({ orderBy: [{ documentType: 'asc' }, { seriesCode: 'asc' }] });
      res.json({ success: true, data: series });
    } catch (error) {
      next(error);
    }
  };

  createDocumentSeries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentType, seriesCode, prefix, nextNumber, numberLength, isDefault } = req.body;
      const series = await prisma.documentSeries.create({
        data: { documentType, seriesCode: seriesCode || 'DEFAULT', prefix, nextNumber: nextNumber || 1, numberLength: numberLength || 6, isDefault: isDefault ?? true },
      });
      res.status(201).json({ success: true, data: series, message: 'Document series created' });
    } catch (error) {
      next(error);
    }
  };

  updateDocumentSeries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { prefix, nextNumber, numberLength, isDefault } = req.body;
      const series = await prisma.documentSeries.update({
        where: { id: parseInt(id) },
        data: { prefix, nextNumber, numberLength, isDefault },
      });
      res.json({ success: true, data: series, message: 'Document series updated' });
    } catch (error) {
      next(error);
    }
  };

  // Fiscal Years
  listFiscalYears = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const years = await prisma.fiscalYear.findMany({ orderBy: { startDate: 'desc' }, include: { periods: true } });
      res.json({ success: true, data: years });
    } catch (error) {
      next(error);
    }
  };

  createFiscalYear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, startDate, endDate, isClosed } = req.body;
      const fiscalYear = await prisma.fiscalYear.create({
        data: { name, startDate: new Date(startDate), endDate: new Date(endDate), isClosed: isClosed ?? false },
      });
      res.status(201).json({ success: true, data: fiscalYear, message: 'Fiscal year created' });
    } catch (error) {
      next(error);
    }
  };

  updateFiscalYear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, startDate, endDate, isClosed } = req.body;
      const fiscalYear = await prisma.fiscalYear.update({
        where: { id: parseInt(id) },
        data: { 
          name, 
          startDate: startDate ? new Date(startDate) : undefined, 
          endDate: endDate ? new Date(endDate) : undefined, 
          isClosed 
        },
      });
      res.json({ success: true, data: fiscalYear, message: 'Fiscal year updated' });
    } catch (error) {
      next(error);
    }
  };
  closeFiscalYear = stubHandler('Close Fiscal Year');

  /**
   * Lock a fiscal year to prevent editing/deleting transactions
   * POST /api/v1/settings/fiscal-year/:id/lock
   */
  lockFiscalYear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { lock = true } = req.body as { lock?: boolean };

      // Find the fiscal year
      const fiscalYear = await prisma.fiscalYear.findUnique({
        where: { id },
        include: { periods: true },
      });

      if (!fiscalYear) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Fiscal year not found' },
        });
      }

      // Update fiscal year and all its periods in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update the fiscal year's isClosed flag (used for locking)
        await tx.fiscalYear.update({
          where: { id },
          data: {
            isClosed: lock,
            closedDate: lock ? new Date() : null,
            closedBy: lock ? req.user?.userId : null,
          },
        });

        // Lock/unlock all periods in this fiscal year
        const periodResult = await tx.fiscalPeriod.updateMany({
          where: { yearId: id },
          data: {
            isLocked: lock,
            lockedDate: lock ? new Date() : null,
            lockedBy: lock ? req.user?.userId : null,
          },
        });

        return { periodsUpdated: periodResult.count };
      });

      res.json({
        success: true,
        data: {
          id,
          name: fiscalYear.name,
          isLocked: lock,
          periodsUpdated: result.periodsUpdated,
        },
        message: lock
          ? `Fiscal year "${fiscalYear.name}" has been locked. Transactions in this period cannot be edited or deleted.`
          : `Fiscal year "${fiscalYear.name}" has been unlocked.`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if a date falls within a locked fiscal period
   * GET /api/v1/settings/fiscal-year/check-lock?date=YYYY-MM-DD
   */
  checkFiscalYearLock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateStr = req.query.date as string;
      if (!dateStr) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Date parameter is required' },
        });
      }

      const checkDate = new Date(dateStr);

      // Find the fiscal period containing this date
      const period = await prisma.fiscalPeriod.findFirst({
        where: {
          startDate: { lte: checkDate },
          endDate: { gte: checkDate },
        },
        include: {
          fiscalYear: true,
        },
      });

      if (!period) {
        return res.json({
          success: true,
          data: {
            date: dateStr,
            isLocked: false,
            reason: 'No fiscal period found for this date',
          },
        });
      }

      const isLocked = period.isLocked || period.fiscalYear.isClosed;

      res.json({
        success: true,
        data: {
          date: dateStr,
          isLocked,
          fiscalYear: period.fiscalYear.name,
          period: period.periodName || `Period ${period.periodNo}`,
          reason: isLocked ? 'This fiscal period is locked' : null,
        },
      });
    } catch (error) {
      next(error);
    }
  };

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
