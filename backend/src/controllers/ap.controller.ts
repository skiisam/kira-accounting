import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import { DocumentService } from '../services/document.service';

export class APController extends BaseController<any> {
  protected modelName = 'AP Invoice';
  private documentService = new DocumentService();

  listInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: any = { isVoid: false };

      if (req.query.status) where.status = req.query.status;
      if (req.query.vendorId) where.vendorId = parseInt(req.query.vendorId as string);

      const [invoices, total] = await Promise.all([
        prisma.aPInvoice.findMany({
          where, skip, take,
          orderBy: { invoiceDate: 'desc' },
          include: { vendor: { select: { code: true, name: true } } },
        }),
        prisma.aPInvoice.count({ where }),
      ]);

      this.paginatedResponse(res, invoices, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await prisma.aPInvoice.findUnique({
        where: { id },
        include: { vendor: true, details: { orderBy: { lineNo: 'asc' } } },
      });

      if (!invoice) this.notFound(id);
      let sourceNo: string | undefined = undefined;
      if (invoice.sourceType === 'PURCHASE_INVOICE' && invoice.sourceId) {
        const src = await prisma.purchaseHeader.findUnique({ where: { id: invoice.sourceId } });
        sourceNo = src?.documentNo || undefined;
      }
      this.successResponse(res, { ...invoice, sourceNo } as any);
    } catch (error) {
      next(error);
    }
  };

  createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      this.validateRequired(data, ['vendorId', 'details']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const invoiceNo = await this.documentService.getNextNumber('AP_INVOICE');
      const invoiceDate = new Date(data.invoiceDate || new Date());
      const dueDate =
        data.dueDate
          ? new Date(data.dueDate)
          : new Date(invoiceDate.getTime() + (vendor.creditTermDays || 0) * 24 * 60 * 60 * 1000);

      const invoice = await prisma.aPInvoice.create({
        data: {
          invoiceNo,
          invoiceDate,
          dueDate,
          vendorId: vendor.id,
          vendorCode: vendor.code,
          vendorName: vendor.name,
          supplierInvoiceNo: data.supplierInvoiceNo,
          reference: data.reference,
          description: data.description,
          subTotal: data.subTotal || 0,
          discountAmount: data.discountAmount || 0,
          taxAmount: data.taxAmount || 0,
          netTotal: data.netTotal || 0,
          outstandingAmount: data.netTotal || 0,
          currencyCode: data.currencyCode || vendor.currencyCode,
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

  updateInvoice = stubHandler('Update AP Invoice');
  deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.aPInvoice.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      if (existing.sourceType === 'PURCHASE_INVOICE' || existing.sourceId) {
        res.status(400).json({
          success: false,
          error: { code: 'LINKED_DOCUMENT', message: 'Cannot delete linked AP Invoice. Void instead.' },
        });
        return;
      }

      if (await this.isDateLocked(existing.invoiceDate)) {
        res.status(400).json({
          success: false,
          error: { code: 'PERIOD_LOCKED', message: 'Cannot delete invoice in a locked period.' },
        });
        return;
      }

      if (Number(existing!.paidAmount) > 0) {
        await prisma.aPInvoice.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'Invoice voided');
        return;
      }

      await prisma.aPInvoiceDetail.deleteMany({ where: { invoiceId: id } });
      await prisma.aPInvoice.delete({ where: { id } });
      this.deletedResponse(res);
    } catch (error) {
      next(error);
    }
  };
  postInvoice = stubHandler('Post AP Invoice');
  voidInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.aPInvoice.findUnique({ where: { id } });
      if (!existing) this.notFound(id);
      await prisma.aPInvoice.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
      this.successResponse(res, null, 'Invoice voided');
    } catch (error) {
      next(error);
    }
  };

  listPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: any = { isVoid: false };

      const [payments, total] = await Promise.all([
        prisma.aPPayment.findMany({
          where, skip, take,
          orderBy: { paymentDate: 'desc' },
          include: { vendor: { select: { code: true, name: true } } },
        }),
        prisma.aPPayment.count({ where }),
      ]);

      this.paginatedResponse(res, payments, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await prisma.aPPayment.findUnique({
        where: { id },
        include: { vendor: true, paymentMethod: true, knockoffs: true },
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
      this.validateRequired(data, ['vendorId', 'paymentMethodId', 'paymentAmount', 'knockoffs']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const paymentNo = await this.documentService.getNextNumber('AP_PAYMENT');

      const payment = await prisma.aPPayment.create({
        data: {
          paymentNo,
          paymentDate: new Date(data.paymentDate || new Date()),
          vendorId: vendor.id,
          vendorCode: vendor.code,
          vendorName: vendor.name,
          paymentMethodId: data.paymentMethodId,
          bankAccountId: data.bankAccountId || data.paymentMethodId,
          chequeNo: data.chequeNo,
          chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
          reference: data.reference,
          description: data.description,
          paymentAmount: data.paymentAmount,
          currencyCode: data.currencyCode || vendor.currencyCode,
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
          await prisma.aPInvoice.update({
            where: { id: k.documentId },
            data: {
              paidAmount: { increment: k.knockoffAmount },
              outstandingAmount: { decrement: k.knockoffAmount },
              status: k.outstandingBefore - k.knockoffAmount <= 0 ? 'PAID' : 'PARTIAL',
            },
          });
        } else if (k.documentType === 'CREDIT_NOTE' || k.documentType === 'DEBIT_NOTE') {
          // For CN/DN, update PurchaseHeader status
          const absKnockoff = Math.abs(k.knockoffAmount);
          const absOutstanding = Math.abs(k.outstandingBefore);
          await prisma.purchaseHeader.update({
            where: { id: k.documentId },
            data: {
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

  updatePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.aPPayment.findUnique({ where: { id } });
      if (!existing) this.notFound(id);
      if (existing!.isPosted) throw BadRequestError('Cannot edit posted payment');

      // For simplicity, don't allow editing - just void and create new
      throw BadRequestError('Please void this payment and create a new one');
    } catch (error) {
      next(error);
    }
  };

  deletePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.aPPayment.findUnique({
        where: { id },
        include: { knockoffs: true },
      });
      if (!existing) this.notFound(id);

      // Reverse the knockoffs
      for (const k of existing!.knockoffs) {
        if (k.documentType === 'INVOICE') {
          await prisma.aPInvoice.update({
            where: { id: k.documentId },
            data: {
              paidAmount: { decrement: Number(k.knockoffAmount) },
              outstandingAmount: { increment: Number(k.knockoffAmount) },
              status: 'OPEN',
            },
          });
        }
      }

      await prisma.aPPaymentKnockoff.deleteMany({ where: { paymentId: id } });
      await prisma.aPPayment.delete({ where: { id } });
      this.deletedResponse(res);
    } catch (error) {
      next(error);
    }
  };

  voidPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.aPPayment.findUnique({
        where: { id },
        include: { knockoffs: true },
      });
      if (!existing) this.notFound(id);
      if (existing!.isVoid) throw BadRequestError('Payment already voided');

      // Reverse the knockoffs
      for (const k of existing!.knockoffs) {
        if (k.documentType === 'INVOICE') {
          await prisma.aPInvoice.update({
            where: { id: k.documentId },
            data: {
              paidAmount: { decrement: Number(k.knockoffAmount) },
              outstandingAmount: { increment: Number(k.knockoffAmount) },
              status: 'OPEN',
            },
          });
        }
      }

      await prisma.aPPayment.update({
        where: { id },
        data: { isVoid: true },
      });

      this.successResponse(res, null, 'Payment voided');
    } catch (error) {
      next(error);
    }
  };

  listDebitNotes = stubHandler('List AP Debit Notes');
  createDebitNote = stubHandler('Create AP Debit Note');
  listCreditNotes = stubHandler('List AP Credit Notes');
  createCreditNote = stubHandler('Create AP Credit Note');
  createContra = stubHandler('Create AP Contra');

  getOutstandingDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = parseInt(req.params.vendorId);

      // Fetch outstanding AP Invoices
      const invoices = await prisma.aPInvoice.findMany({
        where: { vendorId, status: { in: ['OPEN', 'PARTIAL'] }, isVoid: false },
        select: { id: true, invoiceNo: true, invoiceDate: true, dueDate: true, netTotal: true, outstandingAmount: true },
        orderBy: { invoiceDate: 'asc' },
      });

      // Fetch outstanding Credit Notes (reduce amount owed to vendor)
      const creditNotes = await prisma.purchaseHeader.findMany({
        where: {
          vendorId,
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
        },
        orderBy: { documentDate: 'asc' },
      });

      // Fetch outstanding Debit Notes (increase amount owed to vendor)
      const debitNotes = await prisma.purchaseHeader.findMany({
        where: {
          vendorId,
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
        })),
        ...creditNotes.map(cn => ({
          id: cn.id,
          documentType: 'CREDIT_NOTE' as const,
          invoiceNo: cn.documentNo,
          invoiceDate: cn.documentDate,
          dueDate: cn.dueDate,
          netTotal: -Number(cn.netTotal), // Negative for CN (reduces payable)
          outstandingAmount: -Number(cn.netTotal), // CN fully outstanding until knocked off
        })),
        ...debitNotes.map(dn => ({
          id: dn.id,
          documentType: 'DEBIT_NOTE' as const,
          invoiceNo: dn.documentNo,
          invoiceDate: dn.documentDate,
          dueDate: dn.dueDate,
          netTotal: Number(dn.netTotal), // Positive for DN (increases payable)
          outstandingAmount: Number(dn.netTotal), // DN fully outstanding until knocked off
        })),
      ];

      // Sort by date
      documents.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

      this.successResponse(res, documents);
    } catch (error) {
      next(error);
    }
  };

  getAgingReport = stubHandler('AP Aging Report');
  getVendorAging = stubHandler('Vendor Aging');

  list = this.listInvoices;
  getById = this.getInvoice;
  create = this.createInvoice;
  update = stubHandler('Update AP');
  delete = stubHandler('Delete AP');
}
