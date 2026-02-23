import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { ConflictError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class AccountController extends BaseController<any> {
  protected modelName = 'Account';

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
}
