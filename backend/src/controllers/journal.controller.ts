import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import { DocumentService } from '../services/document.service';

export class JournalController extends BaseController<any> {
  protected modelName = 'Journal Entry';
  private documentService = new DocumentService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: any = { isVoid: false };

      if (req.query.journalTypeId) where.journalTypeId = parseInt(req.query.journalTypeId as string);
      
      const dateRange = this.getDateRange(req, 'journalDate');
      if (dateRange) Object.assign(where, dateRange);

      const [journals, total] = await Promise.all([
        prisma.journalEntry.findMany({
          where, skip, take,
          orderBy: { journalDate: 'desc' },
          include: { journalType: true },
        }),
        prisma.journalEntry.count({ where }),
      ]);

      this.paginatedResponse(res, journals, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const journal = await prisma.journalEntry.findUnique({
        where: { id },
        include: { journalType: true, details: { orderBy: { lineNo: 'asc' } } },
      });

      if (!journal) this.notFound(id);
      this.successResponse(res, journal);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      this.validateRequired(data, ['details']);

      // Validate debit = credit
      let totalDebit = 0, totalCredit = 0;
      data.details.forEach((d: any) => {
        totalDebit += d.debitAmount || 0;
        totalCredit += d.creditAmount || 0;
      });

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw BadRequestError('Debit and credit totals must be equal');
      }

      const journalNo = await this.documentService.getNextNumber('JOURNAL');

      const journal = await prisma.journalEntry.create({
        data: {
          journalNo,
          journalDate: new Date(data.journalDate || new Date()),
          postingDate: data.postingDate ? new Date(data.postingDate) : new Date(),
          journalTypeId: data.journalTypeId,
          reference: data.reference,
          description: data.description,
          totalDebit,
          totalCredit,
          currencyCode: data.currencyCode,
          exchangeRate: data.exchangeRate || 1,
          createdBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              accountId: d.accountId,
              description: d.description,
              debitAmount: d.debitAmount || 0,
              creditAmount: d.creditAmount || 0,
              debitAmountLocal: (d.debitAmount || 0) * (data.exchangeRate || 1),
              creditAmountLocal: (d.creditAmount || 0) * (data.exchangeRate || 1),
              taxCode: d.taxCode,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
              projectId: d.projectId,
              departmentId: d.departmentId,
            })),
          },
        },
        include: { details: true },
      });

      this.createdResponse(res, journal);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const existing = await prisma.journalEntry.findUnique({ where: { id } });
      if (!existing) this.notFound(id);
      if (existing!.isPosted) throw BadRequestError('Cannot edit posted journal');

      let totalDebit = 0, totalCredit = 0;
      data.details?.forEach((d: any) => {
        totalDebit += d.debitAmount || 0;
        totalCredit += d.creditAmount || 0;
      });

      if (data.details && Math.abs(totalDebit - totalCredit) > 0.01) {
        throw BadRequestError('Debit and credit totals must be equal');
      }

      await prisma.journalEntryDetail.deleteMany({ where: { journalId: id } });

      const journal = await prisma.journalEntry.update({
        where: { id },
        data: {
          journalDate: data.journalDate ? new Date(data.journalDate) : undefined,
          journalTypeId: data.journalTypeId,
          reference: data.reference,
          description: data.description,
          totalDebit,
          totalCredit,
          modifiedBy: req.user?.userId,
          details: data.details ? {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              accountId: d.accountId,
              description: d.description,
              debitAmount: d.debitAmount || 0,
              creditAmount: d.creditAmount || 0,
              taxCode: d.taxCode,
            })),
          } : undefined,
        },
        include: { details: true },
      });

      this.successResponse(res, journal, 'Journal updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.journalEntry.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      if (existing!.sourceType) {
        await prisma.journalEntry.update({ where: { id }, data: { isVoid: true } });
        this.successResponse(res, null, 'Journal voided');
      } else {
        await prisma.journalEntryDetail.deleteMany({ where: { journalId: id } });
        await prisma.journalEntry.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  post = stubHandler('Post Journal');
  void = stubHandler('Void Journal');
  reverse = stubHandler('Reverse Journal');

  listTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await prisma.journalType.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
      this.successResponse(res, types);
    } catch (error) {
      next(error);
    }
  };

  listRecurring = stubHandler('List Recurring Journals');
  createRecurring = stubHandler('Create Recurring Journal');
  generateFromRecurring = stubHandler('Generate from Recurring');

  listTemplates = stubHandler('List Journal Templates');
  saveTemplate = stubHandler('Save Journal Template');
  applyTemplate = stubHandler('Apply Journal Template');
}
