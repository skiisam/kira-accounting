import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import { DocumentService } from '../services/document.service';

export class ARController extends BaseController<any> {
  protected modelName = 'AR Invoice';
  private documentService = new DocumentService();

  // ==================== INVOICES ====================

  listInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: any = { isVoid: false };

      if (req.query.status) where.status = req.query.status;
      if (req.query.customerId) where.customerId = parseInt(req.query.customerId as string);

      const dateRange = this.getDateRange(req, 'invoiceDate');
      if (dateRange) Object.assign(where, dateRange);

      const [invoices, total] = await Promise.all([
        prisma.aRInvoice.findMany({
          where, skip, take,
          orderBy: { invoiceDate: 'desc' },
          include: { customer: { select: { code: true, name: true } } },
        }),
        prisma.aRInvoice.count({ where }),
      ]);

      this.paginatedResponse(res, invoices, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await prisma.aRInvoice.findUnique({
        where: { id },
        include: { customer: true, details: { orderBy: { lineNo: 'asc' } } },
      });

      if (!invoice) this.notFound(id);
      this.successResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  };

  createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      this.validateRequired(data, ['customerId', 'details']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const invoiceNo = await this.documentService.getNextNumber('AR_INVOICE');

      const invoice = await prisma.aRInvoice.create({
        data: {
          invoiceNo,
          invoiceDate: new Date(data.invoiceDate || new Date()),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          customerId: customer.id,
          customerCode: customer.code,
          customerName: customer.name,
          reference: data.reference,
          description: data.description,
          subTotal: data.subTotal || 0,
          discountAmount: data.discountAmount || 0,
          taxAmount: data.taxAmount || 0,
          netTotal: data.netTotal || 0,
          outstandingAmount: data.netTotal || 0,
          currencyCode: data.currencyCode || customer.currencyCode,
          exchangeRate: data.exchangeRate || 1,
          createdBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              accountId: d.accountId,
              description: d.description,
              amount: d.amount,
              taxCode: d.taxCode,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
              subTotal: d.subTotal || d.amount,
            })),
          },
        },
        include: { details: true },
      });

      this.createdResponse(res, invoice);
    } catch (error) {
      next(error);
    }
  };

  updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const existing = await prisma.aRInvoice.findUnique({ where: { id } });
      if (!existing) this.notFound(id);
      if (existing!.isPosted) throw BadRequestError('Cannot edit posted invoice');

      await prisma.aRInvoiceDetail.deleteMany({ where: { invoiceId: id } });

      const invoice = await prisma.aRInvoice.update({
        where: { id },
        data: {
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          reference: data.reference,
          description: data.description,
          subTotal: data.subTotal,
          discountAmount: data.discountAmount,
          taxAmount: data.taxAmount,
          netTotal: data.netTotal,
          outstandingAmount: data.netTotal,
          modifiedBy: req.user?.userId,
          details: {
            create: data.details?.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              accountId: d.accountId,
              description: d.description,
              amount: d.amount,
              taxCode: d.taxCode,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
              subTotal: d.subTotal || d.amount,
            })),
          },
        },
        include: { details: true },
      });

      this.successResponse(res, invoice, 'Invoice updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.aRInvoice.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      if (Number(existing!.paidAmount) > 0) {
        await prisma.aRInvoice.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'Invoice voided');
      } else {
        await prisma.aRInvoiceDetail.deleteMany({ where: { invoiceId: id } });
        await prisma.aRInvoice.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  postInvoice = stubHandler('Post AR Invoice');
  voidInvoice = stubHandler('Void AR Invoice');

  // ==================== PAYMENTS ====================

  listPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: any = { isVoid: false };

      if (req.query.customerId) where.customerId = parseInt(req.query.customerId as string);

      const [payments, total] = await Promise.all([
        prisma.aRPayment.findMany({
          where, skip, take,
          orderBy: { paymentDate: 'desc' },
          include: { customer: { select: { code: true, name: true } }, paymentMethod: true },
        }),
        prisma.aRPayment.count({ where }),
      ]);

      this.paginatedResponse(res, payments, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await prisma.aRPayment.findUnique({
        where: { id },
        include: { customer: true, paymentMethod: true, knockoffs: true },
      });

      if (!payment) this.notFound(id);
      this.successResponse(res, payment);
    } catch (error) {
      next(error);
    }
  };

  createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      this.validateRequired(data, ['customerId', 'paymentMethodId', 'paymentAmount', 'knockoffs']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const paymentNo = await this.documentService.getNextNumber('AR_PAYMENT');

      const payment = await prisma.aRPayment.create({
        data: {
          paymentNo,
          paymentDate: new Date(data.paymentDate || new Date()),
          customerId: customer.id,
          customerCode: customer.code,
          customerName: customer.name,
          paymentMethodId: data.paymentMethodId,
          bankAccountId: data.bankAccountId || data.paymentMethodId,
          chequeNo: data.chequeNo,
          chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
          reference: data.reference,
          description: data.description,
          paymentAmount: data.paymentAmount,
          currencyCode: data.currencyCode || customer.currencyCode,
          exchangeRate: data.exchangeRate || 1,
          createdBy: req.user?.userId,
          knockoffs: {
            create: data.knockoffs.map((k: any) => ({
              documentType: k.documentType,
              documentId: k.documentId,
              documentNo: k.documentNo,
              documentDate: k.documentDate ? new Date(k.documentDate) : null,
              documentAmount: k.documentAmount,
              outstandingBefore: k.outstandingBefore,
              knockoffAmount: k.knockoffAmount,
              outstandingAfter: k.outstandingBefore - k.knockoffAmount,
            })),
          },
        },
        include: { knockoffs: true },
      });

      // Update document outstanding amounts based on document type
      for (const k of data.knockoffs) {
        if (k.documentType === 'INVOICE') {
          await prisma.aRInvoice.update({
            where: { id: k.documentId },
            data: {
              paidAmount: { increment: k.knockoffAmount },
              outstandingAmount: { decrement: k.knockoffAmount },
              status: k.outstandingBefore - k.knockoffAmount <= 0 ? 'PAID' : 'PARTIAL',
            },
          });
        } else if (k.documentType === 'CREDIT_NOTE' || k.documentType === 'DEBIT_NOTE') {
          // For CN/DN, update SalesHeader status
          const absKnockoff = Math.abs(k.knockoffAmount);
          const absOutstanding = Math.abs(k.outstandingBefore);
          await prisma.salesHeader.update({
            where: { id: k.documentId },
            data: {
              paidAmount: { increment: absKnockoff },
              status: absOutstanding - absKnockoff <= 0.01 ? 'CLOSED' : 'PARTIAL',
            },
          });
        }
      }

      this.createdResponse(res, payment);
    } catch (error) {
      next(error);
    }
  };

  updatePayment = stubHandler('Update AR Payment');
  deletePayment = stubHandler('Delete AR Payment');
  voidPayment = stubHandler('Void AR Payment');

  // ==================== CREDIT/DEBIT NOTES ====================

  listCreditNotes = stubHandler('List AR Credit Notes');
  getCreditNote = stubHandler('Get AR Credit Note');
  createCreditNote = stubHandler('Create AR Credit Note');

  listDebitNotes = stubHandler('List AR Debit Notes');
  createDebitNote = stubHandler('Create AR Debit Note');

  createContra = stubHandler('Create AR Contra');

  // ==================== QUERIES ====================

  getOutstandingDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.params.customerId);

      // Fetch outstanding AR Invoices
      const invoices = await prisma.aRInvoice.findMany({
        where: {
          customerId,
          status: { in: ['OPEN', 'PARTIAL'] },
          isVoid: false,
        },
        select: {
          id: true,
          invoiceNo: true,
          invoiceDate: true,
          dueDate: true,
          netTotal: true,
          outstandingAmount: true,
          currencyCode: true,
        },
        orderBy: { invoiceDate: 'asc' },
      });

      // Fetch outstanding Credit Notes (reduce amount owed)
      const creditNotes = await prisma.salesHeader.findMany({
        where: {
          customerId,
          documentType: 'CREDIT_NOTE',
          status: { in: ['OPEN', 'PARTIAL'] },
          isVoid: false,
        },
        select: {
          id: true,
          documentNo: true,
          documentDate: true,
          dueDate: true,
          netTotal: true,
          currencyCode: true,
        },
        orderBy: { documentDate: 'asc' },
      });

      // Fetch outstanding Debit Notes (increase amount owed)
      const debitNotes = await prisma.salesHeader.findMany({
        where: {
          customerId,
          documentType: 'DEBIT_NOTE',
          status: { in: ['OPEN', 'PARTIAL'] },
          isVoid: false,
        },
        select: {
          id: true,
          documentNo: true,
          documentDate: true,
          dueDate: true,
          netTotal: true,
          currencyCode: true,
        },
        orderBy: { documentDate: 'asc' },
      });

      // Combine all documents with type indicator
      const documents = [
        ...invoices.map(inv => ({
          id: inv.id,
          documentType: 'INVOICE' as const,
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          netTotal: Number(inv.netTotal),
          outstandingAmount: Number(inv.outstandingAmount),
          currencyCode: inv.currencyCode,
        })),
        ...creditNotes.map(cn => ({
          id: cn.id,
          documentType: 'CREDIT_NOTE' as const,
          invoiceNo: cn.documentNo,
          invoiceDate: cn.documentDate,
          dueDate: cn.dueDate,
          netTotal: -Number(cn.netTotal), // Negative for CN (reduces receivable)
          outstandingAmount: -Number(cn.netTotal), // CN fully outstanding until knocked off
          currencyCode: cn.currencyCode,
        })),
        ...debitNotes.map(dn => ({
          id: dn.id,
          documentType: 'DEBIT_NOTE' as const,
          invoiceNo: dn.documentNo,
          invoiceDate: dn.documentDate,
          dueDate: dn.dueDate,
          netTotal: Number(dn.netTotal), // Positive for DN (increases receivable)
          outstandingAmount: Number(dn.netTotal), // DN fully outstanding until knocked off
          currencyCode: dn.currencyCode,
        })),
      ];

      // Sort by date
      documents.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

      this.successResponse(res, documents);
    } catch (error) {
      next(error);
    }
  };

  getAgingReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

      const customers = await prisma.customer.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
      });

      const aging = await Promise.all(
        customers.map(async (customer) => {
          const invoices = await prisma.aRInvoice.findMany({
            where: { customerId: customer.id, status: { in: ['OPEN', 'PARTIAL'] }, isVoid: false },
          });

          const buckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };

          invoices.forEach(inv => {
            const dueDate = inv.dueDate || inv.invoiceDate;
            const daysDue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const amount = Number(inv.outstandingAmount);

            if (daysDue <= 0) buckets.current += amount;
            else if (daysDue <= 30) buckets.days1to30 += amount;
            else if (daysDue <= 60) buckets.days31to60 += amount;
            else if (daysDue <= 90) buckets.days61to90 += amount;
            else buckets.over90 += amount;
          });

          const total = Object.values(buckets).reduce((a, b) => a + b, 0);
          if (total === 0) return null;

          return { ...customer, ...buckets, total };
        })
      );

      const result = aging.filter(Boolean);
      this.successResponse(res, { asOfDate, customers: result });
    } catch (error) {
      next(error);
    }
  };

  getCustomerAging = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

      const invoices = await prisma.aRInvoice.findMany({
        where: { customerId, status: { in: ['OPEN', 'PARTIAL'] }, isVoid: false },
      });

      const buckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 };

      invoices.forEach(inv => {
        const dueDate = inv.dueDate || inv.invoiceDate;
        const daysDue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = Number(inv.outstandingAmount);

        if (daysDue <= 0) buckets.current += amount;
        else if (daysDue <= 30) buckets.days1to30 += amount;
        else if (daysDue <= 60) buckets.days31to60 += amount;
        else if (daysDue <= 90) buckets.days61to90 += amount;
        else buckets.over90 += amount;

        buckets.total += amount;
      });

      this.successResponse(res, { customerId, asOfDate, aging: buckets, invoices });
    } catch (error) {
      next(error);
    }
  };

  // Required abstract methods
  list = this.listInvoices;
  getById = this.getInvoice;
  create = this.createInvoice;
  update = this.updateInvoice;
  delete = this.deleteInvoice;
}
