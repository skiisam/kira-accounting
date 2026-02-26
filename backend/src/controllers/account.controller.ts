import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { ConflictError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class AccountController extends BaseController<any> {
  protected modelName = 'Account';

  // Load COA template into current company's chart (default: trading)
  loadTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user?.companyId || null;
      const templateId = (req.body?.templateId as string) || 'trading';
      const glFormat = (req.body?.glFormat as string) || '0000';
      const dryRun = req.body?.dryRun === true;

      // Build accounts based on selected template
      const toCreate = this.buildCoaTemplate(templateId, glFormat);

      let created = 0;
      let existing = 0;
      for (const acc of toCreate) {
        const exists = await prisma.account.findFirst({
          where: { accountNo: acc.accountNo, ...(companyId ? { companyId } : {}) },
        });
        if (exists) {
          existing += 1;
          continue;
        }
        if (!dryRun) {
          await prisma.account.create({
            data: {
              accountNo: acc.accountNo,
              name: acc.name,
              typeId: acc.typeId,
              companyId,
              isParent: acc.isGroup || false,
              specialType: acc.specialType || undefined,
              isActive: true,
            } as any,
          });
          created += 1;
        }
      }

      if (dryRun) {
        const willCreate = toCreate.length - existing;
        this.successResponse(
          res, 
          { templateId, total: toCreate.length, existing, willCreate, created: 0, dryRun: true }, 
          existing > 0 ? 'Template already partially loaded; importing will add missing accounts only' : 'Ready to import template'
        );
        return;
      }

      this.successResponse(
        res, 
        { created, existing, templateId, dryRun: false }, 
        created > 0 ? 'Chart of Accounts loaded' : 'No new accounts created'
      );
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const companyId = req.user?.companyId;

      const where: Prisma.AccountWhereInput = {
        isActive: req.query.includeInactive === 'true' ? undefined : true,
        ...(companyId ? { companyId } : {}),
      };

      if (req.query.typeId) where.typeId = parseInt(req.query.typeId as string);
      if (req.query.typeCode) {
        // Find type by code and filter by that type
        const accountType = await prisma.accountType.findUnique({ where: { code: req.query.typeCode as string } });
        if (accountType) where.typeId = accountType.id;
      }
      if (req.query.specialType) where.specialType = req.query.specialType as string;
      if (req.query.search) {
        where.OR = [
          { accountNo: { contains: req.query.search as string, mode: 'insensitive' } },
          { name: { contains: req.query.search as string, mode: 'insensitive' } },
        ];
      }

      const [accounts, total] = await Promise.all([
        prisma.account.findMany({
          where, skip, take,
          orderBy: { accountNo: 'asc' },
          include: { type: true, parent: { select: { accountNo: true, name: true } } },
        }),
        prisma.account.count({ where }),
      ]);

      this.paginatedResponse(res, accounts, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getTree = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user?.companyId;
      const accounts = await prisma.account.findMany({
        where: { isActive: true, ...(companyId ? { companyId } : {}) },
        orderBy: { accountNo: 'asc' },
        include: { type: true },
      });

      // Build tree structure
      const tree = this.buildTree(accounts);
      this.successResponse(res, tree);
    } catch (error) {
      next(error);
    }
  };

  private buildTree(accounts: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    accounts.forEach(acc => {
      map.set(acc.id, { ...acc, children: [] });
    });

    accounts.forEach(acc => {
      const node = map.get(acc.id);
      if (acc.parentId && map.has(acc.parentId)) {
        map.get(acc.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
      const companyId = req.user?.companyId;

      const accounts = await prisma.account.findMany({
        where: {
          isActive: true,
          isParent: false, // Only postable accounts
          ...(companyId ? { companyId } : {}),
          OR: [
            { accountNo: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { accountNo: 'asc' },
        select: { id: true, accountNo: true, name: true, specialType: true },
      });

      this.successResponse(res, accounts);
    } catch (error) {
      next(error);
    }
  };

  lookup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountNo = req.query.accountNo as string;
      const companyId = req.user?.companyId;
      
      const account = await prisma.account.findFirst({
        where: {
          accountNo: { startsWith: accountNo, mode: 'insensitive' },
          isActive: true,
          ...(companyId ? { companyId } : {}),
        },
        include: { type: true },
      });

      if (!account) this.notFound(accountNo);
      this.successResponse(res, account);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const companyId = req.user?.companyId;
      
      const account = await prisma.account.findFirst({
        where: { id, ...(companyId ? { companyId } : {}) },
        include: { type: true, parent: true, children: true, bankAccount: true },
      });

      if (!account) this.notFound(id);
      this.successResponse(res, account);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const companyId = req.user?.companyId;
      this.validateRequired(data, ['accountNo', 'name', 'typeId']);

      // Check for existing account within same company
      const existing = await prisma.account.findFirst({ 
        where: { accountNo: data.accountNo, ...(companyId ? { companyId } : {}) } 
      });
      if (existing) throw ConflictError(`Account ${data.accountNo} already exists`);

      const account = await prisma.account.create({
        data: {
          accountNo: data.accountNo,
          name: data.name,
          name2: data.name2,
          typeId: data.typeId,
          parentId: data.parentId,
          companyId: companyId || null,
          specialType: data.specialType || 'NORMAL',
          isParent: data.isParent || false,
          currencyCode: data.currencyCode,
          taxCode: data.taxCode,
          openingBalance: data.openingBalance || 0,
          openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : null,
          createdBy: req.user?.userId,
        },
        include: { type: true },
      });

      // Create bank account details if applicable
      if (data.specialType === 'BANK' && data.bankDetails) {
        await prisma.bankAccount.create({
          data: {
            accountId: account.id,
            bankName: data.bankDetails.bankName,
            bankBranch: data.bankDetails.bankBranch,
            bankAccountNo: data.bankDetails.bankAccountNo,
            swiftCode: data.bankDetails.swiftCode,
            overdraftLimit: data.bankDetails.overdraftLimit,
          },
        });
      }

      this.createdResponse(res, account);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const existing = await prisma.account.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      if (data.accountNo && data.accountNo !== existing!.accountNo) {
        const duplicate = await prisma.account.findFirst({ where: { accountNo: data.accountNo, companyId: existing!.companyId } });
        if (duplicate) throw ConflictError(`Account ${data.accountNo} already exists`);
      }

      const account = await prisma.account.update({
        where: { id },
        data: {
          accountNo: data.accountNo,
          name: data.name,
          name2: data.name2,
          typeId: data.typeId,
          parentId: data.parentId,
          specialType: data.specialType,
          isParent: data.isParent,
          currencyCode: data.currencyCode,
          taxCode: data.taxCode,
          isActive: data.isActive,
          modifiedBy: req.user?.userId,
        },
        include: { type: true },
      });

      this.successResponse(res, account, 'Account updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.account.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      if (existing!.isSystem) {
        throw ConflictError('Cannot delete system account');
      }

      // Check for transactions
      const hasTransactions = await prisma.journalEntryDetail.findFirst({ where: { accountId: id } });

      if (hasTransactions) {
        await prisma.account.update({ where: { id }, data: { isActive: false } });
        this.successResponse(res, null, 'Account deactivated (has transactions)');
      } else {
        await prisma.account.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  getLedger = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = parseInt(req.params.id);
      const { skip, take, page, pageSize } = this.getPagination(req);
      const dateRange = this.getDateRange(req, 'journal.journalDate');

      const where: any = { accountId };
      if (dateRange) Object.assign(where, dateRange);

      const [entries, total] = await Promise.all([
        prisma.journalEntryDetail.findMany({
          where,
          skip, take,
          orderBy: { journal: { journalDate: 'desc' } },
          include: {
            journal: {
              select: { journalNo: true, journalDate: true, description: true, sourceType: true, sourceNo: true },
            },
          },
        }),
        prisma.journalEntryDetail.count({ where }),
      ]);

      this.paginatedResponse(res, entries, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = parseInt(req.params.id);
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

      const account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { type: true },
      });

      if (!account) this.notFound(accountId);

      // Get sum of debits and credits
      const result = await prisma.journalEntryDetail.aggregate({
        where: {
          accountId,
          journal: {
            journalDate: { lte: asOfDate },
            isVoid: false,
          },
        },
        _sum: {
          debitAmount: true,
          creditAmount: true,
        },
      });

      const debitTotal = Number(result._sum.debitAmount || 0);
      const creditTotal = Number(result._sum.creditAmount || 0);
      const openingBalance = Number(account!.openingBalance || 0);

      // Calculate balance based on normal balance
      const isDebitNormal = account!.type.normalBalance === 'D';
      const balance = isDebitNormal
        ? openingBalance + debitTotal - creditTotal
        : openingBalance + creditTotal - debitTotal;

      this.successResponse(res, {
        accountId,
        accountNo: account!.accountNo,
        name: account!.name,
        asOfDate,
        openingBalance,
        debitTotal,
        creditTotal,
        balance,
      });
    } catch (error) {
      next(error);
    }
  };

  listTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await prisma.accountType.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
      this.successResponse(res, types);
    } catch (error) {
      next(error);
    }
  };

  getTrialBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();
      const companyId = req.user?.companyId;

      const accounts = await prisma.account.findMany({
        where: { isActive: true, isParent: false, ...(companyId ? { companyId } : {}) },
        include: { type: true },
        orderBy: { accountNo: 'asc' },
      });

      const trialBalance = await Promise.all(
        accounts.map(async (account) => {
          const result = await prisma.journalEntryDetail.aggregate({
            where: {
              accountId: account.id,
              journal: { journalDate: { lte: asOfDate }, isVoid: false },
            },
            _sum: { debitAmount: true, creditAmount: true },
          });

          const debit = Number(result._sum.debitAmount || 0);
          const credit = Number(result._sum.creditAmount || 0);
          const opening = Number(account.openingBalance || 0);
          const isDebitNormal = account.type.normalBalance === 'D';
          const balance = isDebitNormal ? opening + debit - credit : opening + credit - debit;

          return {
            accountNo: account.accountNo,
            accountName: account.name,
            category: account.type.category,
            debit: isDebitNormal && balance > 0 ? balance : (isDebitNormal ? 0 : Math.abs(Math.min(0, balance))),
            credit: !isDebitNormal && balance > 0 ? balance : (!isDebitNormal ? 0 : Math.abs(Math.min(0, balance))),
          };
        })
      );

      const totals = trialBalance.reduce(
        (acc, row) => ({ debit: acc.debit + row.debit, credit: acc.credit + row.credit }),
        { debit: 0, credit: 0 }
      );

      this.successResponse(res, { asOfDate, accounts: trialBalance, totals });
    } catch (error) {
      next(error);
    }
  };

  // Internal helper mirroring settings wizard
  private buildCoaTemplate(templateId: string, glFormat: string) {
    const prefix = glFormat === 'XXXXX' ? '1' : '';
    const pad = glFormat === 'XXXXX' ? 5 : 4;
    const formatCode = (num: number) => prefix + num.toString().padStart(pad - prefix.length, '0');

    const typeIds: Record<string, number> = {
      ASSET: 1,
      LIABILITY: 2,
      EQUITY: 3,
      REVENUE: 4,
      COGS: 5,
      EXPENSE: 6,
    };

    const baseAccounts = [
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
      { accountNo: formatCode(2000), name: 'Liabilities', typeId: typeIds.LIABILITY, isGroup: true },
      { accountNo: formatCode(2100), name: 'Current Liabilities', typeId: typeIds.LIABILITY, isGroup: true },
      { accountNo: formatCode(2110), name: 'Accounts Payable', typeId: typeIds.LIABILITY },
      { accountNo: formatCode(2120), name: 'Accrued Expenses', typeId: typeIds.LIABILITY },
      { accountNo: formatCode(2130), name: 'SST/GST Payable', typeId: typeIds.LIABILITY },
      { accountNo: formatCode(2200), name: 'Long-term Liabilities', typeId: typeIds.LIABILITY, isGroup: true },
      { accountNo: formatCode(2210), name: 'Bank Loans', typeId: typeIds.LIABILITY },
      { accountNo: formatCode(3000), name: 'Equity', typeId: typeIds.EQUITY, isGroup: true },
      { accountNo: formatCode(3100), name: 'Share Capital', typeId: typeIds.EQUITY },
      { accountNo: formatCode(3200), name: 'Retained Earnings', typeId: typeIds.EQUITY },
      { accountNo: formatCode(3300), name: 'Current Year Earnings', typeId: typeIds.EQUITY },
      { accountNo: formatCode(4000), name: 'Revenue', typeId: typeIds.REVENUE, isGroup: true },
      { accountNo: formatCode(4100), name: 'Sales Revenue', typeId: typeIds.REVENUE },
      { accountNo: formatCode(4200), name: 'Service Revenue', typeId: typeIds.REVENUE },
      { accountNo: formatCode(4900), name: 'Other Income', typeId: typeIds.REVENUE },
      { accountNo: formatCode(5000), name: 'Cost of Goods Sold', typeId: typeIds.COGS, isGroup: true },
      { accountNo: formatCode(5100), name: 'Cost of Sales', typeId: typeIds.COGS },
      { accountNo: formatCode(5200), name: 'Direct Labour', typeId: typeIds.COGS },
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

    const industryAccounts: Record<string, any[]> = {
      trading: [
        // Equity
        { accountNo: '100-0000', name: 'Capital', typeId: typeIds.EQUITY },
        { accountNo: '150-0000', name: 'Retained Earning', typeId: typeIds.EQUITY, specialType: 'RETAINED_EARNINGS' },
        { accountNo: '151-0000', name: 'Reserves', typeId: typeIds.EQUITY },
        // Fixed Assets
        { accountNo: '200-0000', name: 'Fixed Assets', typeId: typeIds.ASSET },
        { accountNo: '200-2000', name: 'Furnitures & Fittings', typeId: typeIds.ASSET },
        { accountNo: '200-3000', name: 'Accum. Deprn. - Furnitures & Fittings', typeId: typeIds.ASSET },
        { accountNo: '200-2005', name: 'Office Equipment', typeId: typeIds.ASSET },
        { accountNo: '200-3005', name: 'Accum. Deprn. - Office Equipment', typeId: typeIds.ASSET },
        { accountNo: '200-4000', name: 'Motor Vehicles', typeId: typeIds.ASSET },
        { accountNo: '200-4005', name: 'Accum. Deprn. - Motor Vehicles', typeId: typeIds.ASSET },
        // Other Assets
        { accountNo: '210-0000', name: 'Goodwill', typeId: typeIds.ASSET },
        // Current Assets
        { accountNo: '300-0000', name: 'Trade Debtors', typeId: typeIds.ASSET, specialType: 'AR_CONTROL' },
        { accountNo: '305-0000', name: 'Other Debtors', typeId: typeIds.ASSET },
        { accountNo: '310-0000', name: 'Cash at Bank', typeId: typeIds.ASSET, specialType: 'BANK' },
        { accountNo: '320-0000', name: 'Cash in Hand', typeId: typeIds.ASSET, specialType: 'CASH' },
        { accountNo: '330-0000', name: 'Stock', typeId: typeIds.ASSET, specialType: 'STOCK' },
        { accountNo: '340-0000', name: 'Deposit & Prepayment', typeId: typeIds.ASSET },
        // Current Liabilities
        { accountNo: '400-0000', name: 'Trade Creditors', typeId: typeIds.LIABILITY, specialType: 'AP_CONTROL' },
        { accountNo: '405-0000', name: 'Other Creditors', typeId: typeIds.LIABILITY },
        { accountNo: '410-0000', name: 'Accruals', typeId: typeIds.LIABILITY },
        { accountNo: '420-0000', name: 'Hire Purchase Creditor', typeId: typeIds.LIABILITY },
        { accountNo: '420-1000', name: 'Hire Purchase Interest Suspense', typeId: typeIds.LIABILITY },
        { accountNo: '430-0000', name: 'Sales Tax', typeId: typeIds.LIABILITY },
        { accountNo: '490-0000', name: 'Deposit Received', typeId: typeIds.LIABILITY },
        { accountNo: '490-3000', name: 'Temporary Account for Contra', typeId: typeIds.LIABILITY },
        // Sales
        { accountNo: '500-0000', name: 'Sales', typeId: typeIds.REVENUE },
        { accountNo: '500-1000', name: 'Cash Sales', typeId: typeIds.REVENUE },
        // Sales Adjustments
        { accountNo: '510-0000', name: 'Return Inwards', typeId: typeIds.REVENUE },
        { accountNo: '520-0000', name: 'Discount Allowed', typeId: typeIds.EXPENSE },
        // COGS
        { accountNo: '600-0000', name: 'Stocks at the Beginning of Year', typeId: typeIds.COGS },
        { accountNo: '610-0000', name: 'Purchases', typeId: typeIds.COGS },
        { accountNo: '612-0000', name: 'Purchases Return', typeId: typeIds.COGS },
        { accountNo: '615-0000', name: 'Carriage Inwards', typeId: typeIds.COGS },
        { accountNo: '620-0000', name: 'Stocks at the End of Year', typeId: typeIds.COGS },
        // Other Incomes
        { accountNo: '530-0000', name: 'Gain on Foreign Exchange', typeId: typeIds.REVENUE },
        { accountNo: '540-0000', name: 'Discount Received', typeId: typeIds.REVENUE },
        // Expenses (common)
        { accountNo: '901-0000', name: 'Advertisement', typeId: typeIds.EXPENSE },
        { accountNo: '902-0000', name: 'Bank Charges', typeId: typeIds.EXPENSE },
        { accountNo: '903-0000', name: 'Depreciation of Fixed Assets', typeId: typeIds.EXPENSE },
        { accountNo: '904-0000', name: 'Salaries', typeId: typeIds.EXPENSE },
        { accountNo: '905-0000', name: 'Travelling Expenses', typeId: typeIds.EXPENSE },
        { accountNo: '906-0000', name: 'Upkeep of Motor Vehicle', typeId: typeIds.EXPENSE },
        { accountNo: '907-0000', name: 'Water & Electricity', typeId: typeIds.EXPENSE },
        { accountNo: '908-0000', name: 'Loss on Foreign Exchange', typeId: typeIds.EXPENSE },
        { accountNo: '909-0000', name: 'Telephone Charges', typeId: typeIds.EXPENSE },
        { accountNo: '910-0000', name: 'Printing & Stationery', typeId: typeIds.EXPENSE },
        { accountNo: '913-0000', name: 'Interest Expense', typeId: typeIds.EXPENSE },
        { accountNo: '914-0000', name: 'Postages & Stamps', typeId: typeIds.EXPENSE },
        { accountNo: '915-0000', name: 'Commission & Allowances', typeId: typeIds.EXPENSE },
        { accountNo: '916-0000', name: 'Office Rental', typeId: typeIds.EXPENSE },
        { accountNo: '919-0000', name: 'General Expenses', typeId: typeIds.EXPENSE },
        // Taxation
        { accountNo: '950-0000', name: 'Taxation', typeId: typeIds.EXPENSE },
      ],
    };

    if (templateId === 'trading' && industryAccounts.trading?.length) {
      return industryAccounts.trading;
    }
    return [...baseAccounts, ...(industryAccounts[templateId] || [])];
  }
}
