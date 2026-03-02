import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

export class BankingController extends BaseController<any> {
  protected modelName = 'Banking';

  // Stubs to satisfy abstract methods (not used)
  list = async (_req: Request, res: Response, _next: NextFunction) => { this.successResponse(res, []); };
  getById = async (_req: Request, res: Response, _next: NextFunction) => { this.successResponse(res, null); };
  create = async (_req: Request, res: Response, _next: NextFunction) => { this.successResponse(res, null); };
  update = async (_req: Request, res: Response, _next: NextFunction) => { this.successResponse(res, null); };
  delete = async (_req: Request, res: Response, _next: NextFunction) => { this.successResponse(res, null); };

  listConnections = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.successResponse(res, []);
    } catch (error) {
      next(error);
    }
  };

  connect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bankId, businessRegNo } = req.body;
      if (!bankId) throw BadRequestError('bankId is required');
      this.successResponse(res, { bankId, businessRegNo, status: 'connected' }, 'Connected');
    } catch (error) {
      next(error);
    }
  };

  disconnect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankId = req.params.bankId;
      this.successResponse(res, null, 'Disconnected');
    } catch (error) {
      next(error);
    }
  };

  getAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const demoAccounts = [
        { id: 'demo-1', externalAccountNo: '123-456-7890', externalAccountName: 'Main Account', accountId: null },
        { id: 'demo-2', externalAccountNo: '987-654-3210', externalAccountName: 'Savings', accountId: null },
      ];
      this.successResponse(res, demoAccounts);
    } catch (error) {
      next(error);
    }
  };

  linkAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { glAccountId } = req.body;
      if (!glAccountId) throw BadRequestError('glAccountId is required');
      this.successResponse(res, { linked: true }, 'Linked');
    } catch (error) {
      next(error);
    }
  };

  unlinkAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.successResponse(res, { linked: false }, 'Unlinked');
    } catch (error) {
      next(error);
    }
  };

  importStatement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file;
      const format = (req.body.format as string) || 'generic_csv';
      if (!file) throw BadRequestError('No file uploaded');

      const content = fs.readFileSync(file.path, 'utf8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw BadRequestError('File is empty');

      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const idx = {
        date: header.findIndex((h) => h.includes('date')),
        description: header.findIndex((h) => h.includes('description') || h.includes('details') || h.includes('narration')),
        reference: header.findIndex((h) => h.includes('ref')),
        debit: header.findIndex((h) => h.includes('debit') || h.includes('withdrawal')),
        credit: header.findIndex((h) => h.includes('credit') || h.includes('deposit')),
        balance: header.findIndex((h) => h.includes('balance')),
        amount: header.findIndex((h) => h === 'amount'),
      };

      const toNumber = (s: string | undefined) => {
        if (!s) return 0;
        const n = Number(String(s).replace(/[^\d.-]/g, ''));
        return isNaN(n) ? 0 : n;
      };

      const txs: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const raw = lines[i];
        const cols = raw.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const dateStr = idx.date >= 0 ? cols[idx.date] : '';
        const desc = idx.description >= 0 ? cols[idx.description] : '';
        const ref = idx.reference >= 0 ? cols[idx.reference] : '';
        let debit = idx.debit >= 0 ? toNumber(cols[idx.debit]) : 0;
        let credit = idx.credit >= 0 ? toNumber(cols[idx.credit]) : 0;
        if (idx.amount >= 0 && (debit === 0 && credit === 0)) {
          const amt = toNumber(cols[idx.amount]);
          if (amt < 0) debit = Math.abs(amt); else credit = amt;
        }
        const balance = idx.balance >= 0 ? toNumber(cols[idx.balance]) : null;
        const date = dateStr ? new Date(dateStr) : new Date();

        if (!desc && debit === 0 && credit === 0) continue;

        txs.push({
          transactionDate: date,
          description: desc,
          reference: ref || null,
          debit: debit || null,
          credit: credit || null,
          balance: balance || null,
          status: 'pending',
          importSource: format.includes('csv') ? 'csv' : format.includes('ofx') ? 'ofx' : 'qif',
          rawData: { row: cols },
        });
      }

      this.successResponse(res, { imported: txs.length });
    } catch (error) {
      next(error);
    }
  };

  listStatements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.paginatedResponse(res, [], 0, 1, 20);
    } catch (error) {
      next(error);
    }
  };

  listBookEntries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      const { page, pageSize, skip, take } = this.getPagination(req);
      const dateRange = this.getDateRange(req, 'journal.journalDate');
      if (!accountId) throw BadRequestError('accountId is required');
      const where: any = { accountId };
      if (dateRange) Object.assign(where, dateRange);
      const [rows, total] = await Promise.all([
        prisma.journalEntryDetail.findMany({
          where, skip, take,
          orderBy: { journal: { journalDate: 'desc' } },
          include: { journal: true },
        }),
        prisma.journalEntryDetail.count({ where }),
      ]);
      const data = rows.map((r) => ({
        id: r.id,
        date: r.journal.journalDate,
        description: r.description || r.journal.description || '',
        reference: r.journal.journalNo,
        debit: Number(r.debitAmount || 0) || null,
        credit: Number(r.creditAmount || 0) || null,
        status: 'pending' as const,
      }));
      this.paginatedResponse(res, data, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  match = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bankIds, bookIds } = req.body as { bankIds: string[]; bookIds: number[] };
      if (!bankIds || !bookIds || bankIds.length === 0 || bookIds.length === 0) {
        throw BadRequestError('bankIds and bookIds are required');
      }
      // Simulated match
      this.successResponse(res, { matched: bankIds.length }, 'Matched');
    } catch (error) {
      next(error);
    }
  };

  exclude = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Simulated exclude
      this.successResponse(res, null, 'Excluded');
    } catch (error) {
      next(error);
    }
  };

  autoMatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Simulated auto-match
      this.successResponse(res, { matched: 0 });
    } catch (error) {
      next(error);
    }
  };

  completeReconciliation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountId, periodStart, periodEnd, openingBalance, statementBalance, notes } = req.body;
      if (!accountId || !periodStart || !periodEnd || statementBalance === undefined) {
        throw BadRequestError('Missing required fields');
      }
      const rec = {
        accountId: parseInt(accountId),
        periodStart,
        periodEnd,
        openingBalance: Number(openingBalance || 0),
        statementBalance: Number(statementBalance),
        status: 'draft',
        notes: notes || null,
      };
      this.successResponse(res, rec, 'Reconciliation saved');
    } catch (error) {
      next(error);
    }
  };
}
