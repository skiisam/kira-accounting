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

  updateCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      
      // Get first company or create if doesn't exist
      let company = await prisma.company.findFirst();
      
      if (!company) {
        company = await prisma.company.create({
          data: {
            code: 'MAIN',
            name: data.name || 'My Company',
            ...data,
          },
        });
      } else {
        company = await prisma.company.update({
          where: { id: company.id },
          data: {
            name: data.name,
            name2: data.name2,
            registrationNo: data.registrationNo,
            tinNo: data.tinNo,
            taxRegistrationNo: data.taxRegistrationNo,
            salesTaxNo: data.salesTaxNo,
            serviceTaxNo: data.serviceTaxNo,
            natureOfBusiness: data.natureOfBusiness,
            address1: data.address1,
            address2: data.address2,
            address3: data.address3,
            address4: data.address4,
            postcode: data.postcode,
            city: data.city,
            state: data.state,
            country: data.country,
            phone: data.phone,
            mobile: data.mobile,
            fax: data.fax,
            email: data.email,
            website: data.website,
            contactPerson: data.contactPerson,
            billingAddress1: data.billingAddress1,
            billingAddress2: data.billingAddress2,
            billingAddress3: data.billingAddress3,
            billingPostcode: data.billingPostcode,
            billingCity: data.billingCity,
            billingState: data.billingState,
            billingCountry: data.billingCountry,
            billingContactPerson: data.billingContactPerson,
            billingEmail: data.billingEmail,
            billingPhone: data.billingPhone,
            billingMobile: data.billingMobile,
            billingFax: data.billingFax,
            logoPath: data.logoPath,
            signaturePath: data.signaturePath,
            // Letterhead settings
            letterheadFontFamily: data.letterheadFontFamily,
            letterheadFontSize: data.letterheadFontSize,
            letterheadFontColor: data.letterheadFontColor,
            letterheadAlignment: data.letterheadAlignment,
            letterheadShowLogo: data.letterheadShowLogo,
            letterheadShowAddress: data.letterheadShowAddress,
            letterheadShowContact: data.letterheadShowContact,
            letterheadShowRegNo: data.letterheadShowRegNo,
            letterheadCustomText: data.letterheadCustomText,
            letterheadFooterText: data.letterheadFooterText,
            baseCurrency: data.baseCurrency,
          },
        });
      }
      
      res.json({ success: true, data: company, message: 'Company information updated' });
    } catch (error) {
      next(error);
    }
  };

  // Setup Wizard - First time setup
  setupWizard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;

      // Use transaction to set up everything
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create or update Company
        let company = await tx.company.findFirst();
        const companyData = {
          name: data.companyName,
          registrationNo: data.registrationNo,
          address1: data.address1,
          city: data.city,
          state: data.state,
          postcode: data.postcode,
          country: data.country,
          baseCurrency: data.currency,
          taxRegistrationNo: data.sstNo || data.gstNo,
        };

        if (!company) {
          company = await tx.company.create({
            data: { code: 'MAIN', ...companyData },
          });
        } else {
          company = await tx.company.update({
            where: { id: company.id },
            data: companyData,
          });
        }

        // 2. Create Fiscal Year
        const fyStart = new Date(data.fiscalYearStart);
        const fyEnd = new Date(fyStart);
        fyEnd.setFullYear(fyEnd.getFullYear() + 1);
        fyEnd.setDate(fyEnd.getDate() - 1);

        const existingFY = await tx.fiscalYear.findFirst({
          where: { startDate: fyStart },
        });

        if (!existingFY) {
          await tx.fiscalYear.create({
            data: {
              name: `FY ${fyStart.getFullYear()}`,
              startDate: fyStart,
              endDate: fyEnd,
              isClosed: false,
            },
          });
        }

        // 3. Create base currency if not exists
        const currencyExists = await tx.currency.findUnique({
          where: { code: data.currency },
        });
        if (!currencyExists) {
          await tx.currency.create({
            data: {
              code: data.currency,
              name: data.currency,
              symbol: data.currency,
              isBaseCurrency: true,
            },
          });
        }

        // 4. Create default tax codes based on settings
        if (data.enableSST) {
          const sstExists = await tx.taxCode.findUnique({ where: { code: 'SST' } });
          if (!sstExists) {
            await tx.taxCode.createMany({
              data: [
                { code: 'SST', name: 'Sales & Service Tax', rate: 6, taxType: 'OUTPUT' },
                { code: 'SST-E', name: 'SST Exempt', rate: 0, taxType: 'EXEMPT' },
              ],
              skipDuplicates: true,
            });
          }
        }

        if (data.enableGST) {
          const gstExists = await tx.taxCode.findUnique({ where: { code: 'GST' } });
          if (!gstExists) {
            await tx.taxCode.createMany({
              data: [
                { code: 'GST', name: 'GST Standard Rate', rate: 6, taxType: 'OUTPUT' },
                { code: 'GST-ZR', name: 'GST Zero Rated', rate: 0, taxType: 'ZERO_RATED' },
                { code: 'GST-E', name: 'GST Exempt', rate: 0, taxType: 'EXEMPT' },
              ],
              skipDuplicates: true,
            });
          }
        }

        // 5. Create Chart of Accounts based on template
        const coaTemplates = this.getCoaTemplate(data.coaTemplate, data.glFormat);
        for (const account of coaTemplates) {
          const exists = await tx.account.findFirst({ 
            where: { accountNo: account.accountNo } 
          });
          if (!exists) {
            await tx.account.create({ 
              data: {
                accountNo: account.accountNo,
                name: account.name,
                typeId: account.typeId,
                companyId: company.id,
                isParent: account.isGroup || false,
                isActive: true,
              } as any
            });
          }
        }

        return { company };
      });

      res.json({
        success: true,
        data: result,
        message: 'Setup completed successfully! Welcome to KIRA Accounting.',
      });
    } catch (error) {
      next(error);
    }
  };

  // Get COA template based on industry
  private getCoaTemplate = (templateId: string, glFormat: string) => {
    const prefix = glFormat === 'XXXXX' ? '1' : '';
    const pad = glFormat === 'XXXXX' ? 5 : 4;
    const formatCode = (num: number) => prefix + num.toString().padStart(pad - prefix.length, '0');

    // Account type IDs (must match AccountType table)
    const typeIds: Record<string, number> = {
      'ASSET': 1, 'LIABILITY': 2, 'EQUITY': 3, 'REVENUE': 4, 'COGS': 5, 'EXPENSE': 6
    };

    // Base accounts common to all templates
    const baseAccounts = [
      // Assets (1xxx)
      { accountNo: formatCode(1000), name: 'Assets', typeId: typeIds.ASSET, isGroup: true },
      { accountNo: formatCode(1100), name: 'Current Assets', typeId: typeIds.ASSET, isGroup: true },
      { accountNo: formatCode(1110), name: 'Cash and Bank', typeId: typeIds.ASSET, isGroup: true },
      { accountNo: formatCode(1111), name: 'Petty Cash', typeId: typeIds.ASSET },
      { accountNo: formatCode(1112), name: 'Cash in Bank', typeId: typeIds.ASSET },
      { accountNo: formatCode(1120), name: 'Accounts Receivable', typeId: typeIds.ASSET },
      { accountNo: formatCode(1130), name: 'Inventory', typeId: typeIds.ASSET },
      { accountNo: formatCode(1140), name: 'Prepaid Expenses', typeId: typeIds.ASSET },
      { accountNo: formatCode(1200), name: 'Fixed Assets', typeId: typeIds.ASSET, isGroup: true },
      { accountNo: formatCode(1210), name: 'Property, Plant & Equipment', typeId: typeIds.ASSET },
      { accountNo: formatCode(1220), name: 'Accumulated Depreciation', typeId: typeIds.ASSET },
      // Liabilities (2xxx)
      { accountNo: formatCode(2000), name: 'Liabilities', typeId: typeIds.LIABILITY, isGroup: true },
      { accountNo: formatCode(2100), name: 'Current Liabilities', typeId: typeIds.LIABILITY, isGroup: true },
      { accountNo: formatCode(2110), name: 'Accounts Payable', typeId: typeIds.LIABILITY },
      { accountNo: formatCode(2120), name: 'Accrued Expenses', typeId: typeIds.LIABILITY },
      { accountNo: formatCode(2130), name: 'SST/GST Payable', typeId: typeIds.LIABILITY },
      { accountNo: formatCode(2200), name: 'Long-term Liabilities', typeId: typeIds.LIABILITY, isGroup: true },
      { accountNo: formatCode(2210), name: 'Bank Loans', typeId: typeIds.LIABILITY },
      // Equity (3xxx)
      { accountNo: formatCode(3000), name: 'Equity', typeId: typeIds.EQUITY, isGroup: true },
      { accountNo: formatCode(3100), name: 'Share Capital', typeId: typeIds.EQUITY },
      { accountNo: formatCode(3200), name: 'Retained Earnings', typeId: typeIds.EQUITY },
      { accountNo: formatCode(3300), name: 'Current Year Earnings', typeId: typeIds.EQUITY },
      // Revenue (4xxx)
      { accountNo: formatCode(4000), name: 'Revenue', typeId: typeIds.REVENUE, isGroup: true },
      { accountNo: formatCode(4100), name: 'Sales Revenue', typeId: typeIds.REVENUE },
      { accountNo: formatCode(4200), name: 'Service Revenue', typeId: typeIds.REVENUE },
      { accountNo: formatCode(4900), name: 'Other Income', typeId: typeIds.REVENUE },
      // Cost of Goods Sold (5xxx)
      { accountNo: formatCode(5000), name: 'Cost of Goods Sold', typeId: typeIds.COGS, isGroup: true },
      { accountNo: formatCode(5100), name: 'Cost of Sales', typeId: typeIds.COGS },
      { accountNo: formatCode(5200), name: 'Direct Labour', typeId: typeIds.COGS },
      // Expenses (6xxx)
      { accountNo: formatCode(6000), name: 'Operating Expenses', typeId: typeIds.EXPENSE, isGroup: true },
      { accountNo: formatCode(6100), name: 'Salaries & Wages', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6110), name: 'EPF Contribution', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6120), name: 'SOCSO Contribution', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6200), name: 'Rental Expense', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6210), name: 'Utilities', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6220), name: 'Telecommunication', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6300), name: 'Office Supplies', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6400), name: 'Professional Fees', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6500), name: 'Depreciation Expense', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6600), name: 'Bank Charges', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6700), name: 'Marketing & Advertising', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6800), name: 'Travel & Entertainment', typeId: typeIds.EXPENSE },
      { accountNo: formatCode(6900), name: 'Miscellaneous Expenses', typeId: typeIds.EXPENSE },
    ];

    // Industry-specific additions
    const industryAccounts: Record<string, any[]> = {
      'manufacturing': [
        { accountNo: formatCode(1135), name: 'Raw Materials', typeId: typeIds.ASSET },
        { accountNo: formatCode(1136), name: 'Work in Progress', typeId: typeIds.ASSET },
        { accountNo: formatCode(1137), name: 'Finished Goods', typeId: typeIds.ASSET },
        { accountNo: formatCode(5300), name: 'Manufacturing Overhead', typeId: typeIds.COGS },
      ],
      'it-services': [
        { accountNo: formatCode(4110), name: 'Software Development Revenue', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Consulting Revenue', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4130), name: 'Maintenance Revenue', typeId: typeIds.REVENUE },
        { accountNo: formatCode(6410), name: 'Software Licenses', typeId: typeIds.EXPENSE },
        { accountNo: formatCode(6420), name: 'Cloud Services', typeId: typeIds.EXPENSE },
      ],
      'recruitment': [
        { accountNo: formatCode(4110), name: 'Placement Fees', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Contract Staffing Revenue', typeId: typeIds.REVENUE },
        { accountNo: formatCode(6430), name: 'Recruitment Advertising', typeId: typeIds.EXPENSE },
      ],
      'accounting': [
        { accountNo: formatCode(4110), name: 'Audit Fees', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Tax Services', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4130), name: 'Bookkeeping Fees', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4140), name: 'Secretarial Services', typeId: typeIds.REVENUE },
      ],
      'insurance': [
        { accountNo: formatCode(4110), name: 'Commission Income', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Renewal Commission', typeId: typeIds.REVENUE },
        { accountNo: formatCode(6440), name: 'Agent Commissions Paid', typeId: typeIds.EXPENSE },
      ],
      'travel': [
        { accountNo: formatCode(4110), name: 'Tour Package Sales', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Ticket Commission', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4130), name: 'Hotel Commission', typeId: typeIds.REVENUE },
        { accountNo: formatCode(5110), name: 'Tour Costs', typeId: typeIds.COGS },
      ],
      'retail': [
        { accountNo: formatCode(4110), name: 'Store Sales', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Online Sales', typeId: typeIds.REVENUE },
        { accountNo: formatCode(6450), name: 'Store Rental', typeId: typeIds.EXPENSE },
        { accountNo: formatCode(6460), name: 'POS System Fees', typeId: typeIds.EXPENSE },
      ],
      'car-workshop': [
        { accountNo: formatCode(4110), name: 'Labour Revenue', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Parts Sales', typeId: typeIds.REVENUE },
        { accountNo: formatCode(1138), name: 'Spare Parts Inventory', typeId: typeIds.ASSET },
        { accountNo: formatCode(5110), name: 'Cost of Parts Sold', typeId: typeIds.COGS },
      ],
      'fnb': [
        { accountNo: formatCode(4110), name: 'Food Sales', typeId: typeIds.REVENUE },
        { accountNo: formatCode(4120), name: 'Beverage Sales', typeId: typeIds.REVENUE },
        { accountNo: formatCode(1138), name: 'Food Inventory', typeId: typeIds.ASSET },
        { accountNo: formatCode(5110), name: 'Cost of Food', typeId: typeIds.COGS },
        { accountNo: formatCode(5120), name: 'Cost of Beverages', typeId: typeIds.COGS },
      ],
    };

    return [...baseAccounts, ...(industryAccounts[templateId] || [])];
  };

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

  refreshCurrencyRates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const company = await prisma.company.findFirst();
      const base = company?.baseCurrency || 'MYR';
      const currencies = await prisma.currency.findMany({ where: { isActive: true } });
      const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
      let rates: Record<string, number> = {};
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('rate fetch failed');
        const data = (await resp.json()) as any;
        if (!data || !data.rates) throw new Error('invalid rate payload');
        rates = data.rates as Record<string, number>;
      } catch {
        return res.status(502).json({ success: false, message: 'Failed to fetch live rates' });
      }
      const updates = [];
      for (const c of currencies) {
        if (c.code === base) continue;
        const r = rates[c.code];
        if (typeof r === 'number' && isFinite(r)) {
          updates.push(prisma.currency.update({ where: { code: c.code }, data: { exchangeRate: r } }));
        }
      }
      await Promise.all(updates);
      const updated = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
      res.json({ success: true, data: updated, message: 'Currency rates refreshed' });
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
      const {
        code, name, rate, taxType, isActive,
        calcMethod, roundingMode, roundingPrecision,
        includeDiscount, includeFreight, includeService,
        sstType, gstCategory, remarks, customRules,
      } = req.body;
      const data = {
        code, name, rate, taxType, isActive: isActive ?? true,
        calcMethod, roundingMode, roundingPrecision,
        includeDiscount, includeFreight, includeService,
        sstType, gstCategory, remarks, customRules,
      } as any;
      const taxCode = await prisma.taxCode.create({ data });
      res.status(201).json({ success: true, data: taxCode, message: 'Tax code created' });
    } catch (error) { next(error); }
  };
  updateTaxCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const {
        name, rate, taxType, isActive,
        calcMethod, roundingMode, roundingPrecision,
        includeDiscount, includeFreight, includeService,
        sstType, gstCategory, remarks, customRules,
      } = req.body;
      const data = {
        name, rate, taxType, isActive,
        calcMethod, roundingMode, roundingPrecision,
        includeDiscount, includeFreight, includeService,
        sstType, gstCategory, remarks, customRules,
      } as any;
      const taxCode = await prisma.taxCode.update({ where: { code }, data });
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
      let uoms = await prisma.uOM.findMany({ orderBy: { code: 'asc' } });
      if (uoms.length === 0) {
        await prisma.uOM.createMany({
          data: [
            { code: 'PCS', name: 'Pieces' },
            { code: 'UNIT', name: 'Unit' },
            { code: 'BOX', name: 'Box' },
          ],
          skipDuplicates: true,
        });
        uoms = await prisma.uOM.findMany({ orderBy: { code: 'asc' } });
      }
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
      let groups = await prisma.productGroup.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      if (groups.length === 0) {
        await prisma.productGroup.create({
          data: { code: 'GENERAL', name: 'General', displayOrder: 1, isActive: true },
        }).catch(() => null);
        groups = await prisma.productGroup.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      }
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
      let types = await prisma.productType.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      if (types.length === 0) {
        await prisma.productType.createMany({
          data: [
            { code: 'FINISHED', name: 'Finished Goods' },
            { code: 'SERVICE', name: 'Service' },
            { code: 'RAW', name: 'Raw Material' },
          ],
          skipDuplicates: true,
        });
        types = await prisma.productType.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      }
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

  // Payment Terms
  listPaymentTerms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const terms = await prisma.paymentTerm.findMany({ where: { isActive: true }, orderBy: { code: 'asc' } });
      res.json({ success: true, data: terms });
    } catch (error) {
      next(error);
    }
  };

  createPaymentTerm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, days, description } = req.body;
      const term = await prisma.paymentTerm.create({ data: { code, name, days: days || 0, description } });
      res.status(201).json({ success: true, data: term, message: 'Payment term created' });
    } catch (error) { next(error); }
  };

  updatePaymentTerm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { code, name, days, description, isActive } = req.body;
      const term = await prisma.paymentTerm.update({ where: { id: parseInt(id) }, data: { code, name, days, description, isActive } });
      res.json({ success: true, data: term, message: 'Payment term updated' });
    } catch (error) { next(error); }
  };

  deletePaymentTerm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.paymentTerm.update({ where: { id: parseInt(id) }, data: { isActive: false } });
      res.json({ success: true, message: 'Payment term deactivated' });
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
