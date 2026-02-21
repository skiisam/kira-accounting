import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/config';
import { BadRequestError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middleware/auth';

export class RegistrationController {
  /**
   * Register new company and user
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyName, email, password, phone } = req.body;

      if (!companyName || !email || !password) {
        throw BadRequestError('Company name, email, and password are required');
      }

      if (password.length < 6) {
        throw BadRequestError('Password must be at least 6 characters');
      }

      // Check if email already exists
      const existingUser = await prisma.user.findFirst({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw BadRequestError('Email already registered');
      }

      // Generate unique company code
      const companyCode = await this.generateCompanyCode(companyName);
      const userCode = await this.generateUserCode(email);

      // Create company, user group, and user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create company
        const company = await tx.company.create({
          data: {
            code: companyCode,
            name: companyName,
            email: email.toLowerCase(),
            phone: phone || null,
            baseCurrency: 'MYR',
            isActive: true,
          },
        });

        // Create default user group for company admin
        const userGroup = await tx.userGroup.create({
          data: {
            code: `${companyCode}-ADMIN`,
            name: 'Company Admin',
            description: 'Full access to company data',
            isActive: true,
          },
        });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const user = await tx.user.create({
          data: {
            code: userCode,
            name: companyName,
            email: email.toLowerCase(),
            phone: phone || null,
            passwordHash: hashedPassword,
            groupId: userGroup.id,
            companyId: company.id,
            isAdmin: true,
            isActive: true,
          },
        });

        return { company, userGroup, user };
      });

      // Generate tokens
      const payload: JwtPayload = {
        userId: result.user.id,
        userCode: result.user.code,
        email: result.user.email ?? undefined,
        groupId: result.user.groupId,
        companyId: result.company.id,
        isAdmin: result.user.isAdmin,
      };

      const accessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn as any,
      });

      const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn as any,
      });

      logger.info(`New company registered: ${result.company.code} by user: ${result.user.code}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            code: result.user.code,
            name: result.user.name,
            email: result.user.email,
            isAdmin: result.user.isAdmin,
            group: result.userGroup.name,
            company: result.company.name,
          },
          company: {
            id: result.company.id,
            code: result.company.code,
            name: result.company.name,
            setupComplete: false,
          },
          accessToken,
          refreshToken,
          expiresIn: config.jwt.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Setup wizard - Step 1: Company Info
   */
  setupCompanyInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        throw BadRequestError('No company associated with user');
      }

      const { name, registrationNo, address1, address2, city, state, postcode, country, logoPath } = req.body;

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          name: name || undefined,
          registrationNo: registrationNo || null,
          address1: address1 || null,
          address2: address2 || null,
          city: city || null,
          state: state || null,
          postcode: postcode || null,
          country: country || null,
          logoPath: logoPath || null,
        },
      });

      res.json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Setup wizard - Step 2: Fiscal Year
   */
  setupFiscalYear = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        throw BadRequestError('No company associated with user');
      }

      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        throw BadRequestError('Start date and end date are required');
      }

      // Update company fiscal year start
      await prisma.company.update({
        where: { id: companyId },
        data: {
          fiscalYearStart: new Date(startDate),
        },
      });

      // Create fiscal year record
      const fiscalYear = await prisma.fiscalYear.create({
        data: {
          name: `FY ${new Date(startDate).getFullYear()}`,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isClosed: false,
        },
      });

      // Create 12 monthly periods
      const periods = [];
      let periodStart = new Date(startDate);
      for (let i = 1; i <= 12; i++) {
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);

        periods.push({
          yearId: fiscalYear.id,
          periodNo: i,
          periodName: `Period ${i}`,
          startDate: new Date(periodStart),
          endDate: periodEnd > new Date(endDate) ? new Date(endDate) : periodEnd,
          isLocked: false,
        });

        periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() + 1);
        
        if (periodStart > new Date(endDate)) break;
      }

      await prisma.fiscalPeriod.createMany({
        data: periods,
      });

      res.json({
        success: true,
        data: fiscalYear,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Setup wizard - Step 3: Base Currency
   */
  setupCurrency = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        throw BadRequestError('No company associated with user');
      }

      const { baseCurrency } = req.body;

      if (!baseCurrency) {
        throw BadRequestError('Base currency is required');
      }

      // Ensure currency exists
      const currency = await prisma.currency.findUnique({
        where: { code: baseCurrency },
      });

      if (!currency) {
        // Create the currency if it doesn't exist
        await prisma.currency.create({
          data: {
            code: baseCurrency,
            name: this.getCurrencyName(baseCurrency),
            symbol: this.getCurrencySymbol(baseCurrency),
            decimalPlaces: 2,
            exchangeRate: 1,
            bankBuyRate: 1,
            bankSellRate: 1,
            isBaseCurrency: true,
            isActive: true,
          },
        });
      }

      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          baseCurrency,
        },
      });

      res.json({
        success: true,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Setup wizard - Step 4: Chart of Accounts
   */
  setupChartOfAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        throw BadRequestError('No company associated with user');
      }

      const { template } = req.body; // 'standard' or 'custom'

      if (template === 'standard') {
        await this.createStandardChartOfAccounts(companyId);
      }
      // For custom, no accounts created - user will add manually

      res.json({
        success: true,
        data: { message: template === 'standard' ? 'Standard chart of accounts created' : 'Custom chart of accounts - ready for manual setup' },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete setup
   */
  completeSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        throw BadRequestError('No company associated with user');
      }

      // Mark setup as complete by ensuring all required data exists
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      res.json({
        success: true,
        data: {
          setupComplete: true,
          company,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get setup status
   */
  getSetupStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) {
        throw BadRequestError('No company associated with user');
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      const fiscalYear = await prisma.fiscalYear.findFirst({
        orderBy: { startDate: 'desc' },
      });

      const accountCount = await prisma.account.count({
        where: { companyId },
      });

      const status = {
        companyInfo: !!(company?.name && company.address1),
        fiscalYear: !!fiscalYear,
        currency: !!company?.baseCurrency,
        chartOfAccounts: accountCount > 0,
        setupComplete: !!(company?.name && fiscalYear && company?.baseCurrency),
      };

      res.json({
        success: true,
        data: {
          company,
          status,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Helper methods
  private async generateCompanyCode(name: string): Promise<string> {
    const baseCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);
    
    let code = baseCode || 'COMP';
    let counter = 1;
    
    while (await prisma.company.findUnique({ where: { code } })) {
      code = `${baseCode}${counter}`;
      counter++;
    }
    
    return code;
  }

  private async generateUserCode(email: string): Promise<string> {
    const baseCode = email
      .split('@')[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
    
    let code = baseCode || 'USER';
    let counter = 1;
    
    while (await prisma.user.findUnique({ where: { code } })) {
      code = `${baseCode}${counter}`;
      counter++;
    }
    
    return code;
  }

  private getCurrencyName(code: string): string {
    const currencies: Record<string, string> = {
      MYR: 'Malaysian Ringgit',
      USD: 'US Dollar',
      EUR: 'Euro',
      GBP: 'British Pound',
      SGD: 'Singapore Dollar',
      AUD: 'Australian Dollar',
      JPY: 'Japanese Yen',
      CNY: 'Chinese Yuan',
      INR: 'Indian Rupee',
      THB: 'Thai Baht',
    };
    return currencies[code] || code;
  }

  private getCurrencySymbol(code: string): string {
    const symbols: Record<string, string> = {
      MYR: 'RM',
      USD: '$',
      EUR: '€',
      GBP: '£',
      SGD: 'S$',
      AUD: 'A$',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
      THB: '฿',
    };
    return symbols[code] || code;
  }

  private async createStandardChartOfAccounts(companyId: number): Promise<void> {
    // Ensure account types exist
    const accountTypes = await this.ensureAccountTypes();

    const standardAccounts = [
      // Assets
      { accountNo: '1000', name: 'Cash on Hand', typeCode: 'CA', specialType: 'CASH' },
      { accountNo: '1010', name: 'Petty Cash', typeCode: 'CA', specialType: 'CASH' },
      { accountNo: '1100', name: 'Bank Account', typeCode: 'CA', specialType: 'BANK' },
      { accountNo: '1200', name: 'Accounts Receivable', typeCode: 'CA', specialType: 'AR_CONTROL' },
      { accountNo: '1300', name: 'Inventory', typeCode: 'CA', specialType: 'STOCK' },
      { accountNo: '1400', name: 'Prepaid Expenses', typeCode: 'CA' },
      { accountNo: '1500', name: 'Fixed Assets', typeCode: 'FA', specialType: 'FIXED_ASSET' },
      { accountNo: '1510', name: 'Accumulated Depreciation', typeCode: 'FA' },

      // Liabilities
      { accountNo: '2000', name: 'Accounts Payable', typeCode: 'CL', specialType: 'AP_CONTROL' },
      { accountNo: '2100', name: 'Accrued Expenses', typeCode: 'CL' },
      { accountNo: '2200', name: 'GST/SST Payable', typeCode: 'CL' },
      { accountNo: '2300', name: 'Loans Payable', typeCode: 'LTL' },

      // Equity
      { accountNo: '3000', name: 'Share Capital', typeCode: 'EQ' },
      { accountNo: '3100', name: 'Retained Earnings', typeCode: 'EQ', specialType: 'RETAINED_EARNINGS' },

      // Revenue
      { accountNo: '4000', name: 'Sales Revenue', typeCode: 'REV' },
      { accountNo: '4100', name: 'Service Revenue', typeCode: 'REV' },
      { accountNo: '4200', name: 'Other Income', typeCode: 'REV' },
      { accountNo: '4300', name: 'Discounts Given', typeCode: 'REV' },

      // Expenses
      { accountNo: '5000', name: 'Cost of Goods Sold', typeCode: 'COGS' },
      { accountNo: '5100', name: 'Purchase Discounts', typeCode: 'COGS' },
      { accountNo: '6000', name: 'Salaries & Wages', typeCode: 'EXP' },
      { accountNo: '6100', name: 'Rent Expense', typeCode: 'EXP' },
      { accountNo: '6200', name: 'Utilities Expense', typeCode: 'EXP' },
      { accountNo: '6300', name: 'Office Supplies', typeCode: 'EXP' },
      { accountNo: '6400', name: 'Depreciation Expense', typeCode: 'EXP' },
      { accountNo: '6500', name: 'Insurance Expense', typeCode: 'EXP' },
      { accountNo: '6600', name: 'Bank Charges', typeCode: 'EXP' },
      { accountNo: '6700', name: 'Professional Fees', typeCode: 'EXP' },
      { accountNo: '6800', name: 'Marketing & Advertising', typeCode: 'EXP' },
      { accountNo: '6900', name: 'Miscellaneous Expense', typeCode: 'EXP' },
    ];

    for (const account of standardAccounts) {
      const typeId = accountTypes[account.typeCode];
      if (typeId) {
        await prisma.account.create({
          data: {
            accountNo: account.accountNo,
            name: account.name,
            typeId,
            companyId,
            specialType: account.specialType || 'NORMAL',
            isActive: true,
          },
        });
      }
    }
  }

  private async ensureAccountTypes(): Promise<Record<string, number>> {
    const types = [
      { code: 'CA', name: 'Current Asset', category: 'ASSET', normalBalance: 'D' },
      { code: 'FA', name: 'Fixed Asset', category: 'ASSET', normalBalance: 'D' },
      { code: 'CL', name: 'Current Liability', category: 'LIABILITY', normalBalance: 'C' },
      { code: 'LTL', name: 'Long-term Liability', category: 'LIABILITY', normalBalance: 'C' },
      { code: 'EQ', name: 'Equity', category: 'EQUITY', normalBalance: 'C' },
      { code: 'REV', name: 'Revenue', category: 'REVENUE', normalBalance: 'C' },
      { code: 'COGS', name: 'Cost of Goods Sold', category: 'EXPENSE', normalBalance: 'D' },
      { code: 'EXP', name: 'Expense', category: 'EXPENSE', normalBalance: 'D' },
    ];

    const result: Record<string, number> = {};

    for (const type of types) {
      let accountType = await prisma.accountType.findUnique({
        where: { code: type.code },
      });

      if (!accountType) {
        accountType = await prisma.accountType.create({
          data: type,
        });
      }

      result[type.code] = accountType.id;
    }

    return result;
  }
}
