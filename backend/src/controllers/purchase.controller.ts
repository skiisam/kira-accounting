import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import { DocumentService } from '../services/document.service';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

export class PurchaseController extends BaseController<any> {
  protected modelName = 'Purchase';
  private documentService = new DocumentService();

  // Helper to normalize data - accept both 'items' and 'details'
  private normalizeData(data: any) {
    if (data.items && !data.details) {
      data.details = data.items;
    }
    // Also accept 'docDate' as alias for 'documentDate'
    if (data.docDate && !data.documentDate) {
      data.documentDate = data.docDate;
    }
    return data;
  }

  // ==================== PURCHASE ORDERS ====================

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.PurchaseHeaderWhereInput = { documentType: 'PURCHASE_ORDER', isVoid: false };

      if (req.query.status) where.status = req.query.status as string;
      if (req.query.vendorId) where.vendorId = parseInt(req.query.vendorId as string);

      const [documents, total] = await Promise.all([
        prisma.purchaseHeader.findMany({
          where, skip, take,
          orderBy: { documentDate: 'desc' },
          include: { vendor: { select: { code: true, name: true } } },
        }),
        prisma.purchaseHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'PURCHASE_ORDER' },
        include: { vendor: true, purchaseAgent: true, details: { include: { product: true }, orderBy: { lineNo: 'asc' } } },
      });

      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['vendorId', 'details']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const documentNo = await this.documentService.getNextNumber('PURCHASE_ORDER');
      const doc = await this.createPurchaseDocument('PURCHASE_ORDER', documentNo, data, vendor, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);

      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_ORDER' } });
      if (!existing) this.notFound(id);
      if (existing!.status !== 'OPEN') throw BadRequestError('Cannot edit non-open PO');

      const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

      await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });

      const doc = await prisma.purchaseHeader.update({
        where: { id },
        data: {
          documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          reference: data.reference,
          description: data.description,
          subTotal, discountAmount, taxAmount, netTotal,
          modifiedBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              productId: d.productId,
              productCode: d.productCode,
              description: d.description,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              discountAmount: d.discountAmount || 0,
              subTotal: d.subTotal,
              taxCode: d.taxCode,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
              outstandingQty: d.quantity,
            })),
          },
        },
        include: { details: true },
      });

      this.successResponse(res, doc, 'Purchase Order updated');
    } catch (error) {
      next(error);
    }
  };

  deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_ORDER' } });
      if (!existing) this.notFound(id);

      if (existing!.transferStatus === 'TRANSFERRED' || existing!.transferStatus === 'PARTIAL') {
        await prisma.purchaseHeader.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'Purchase Order voided');
      } else {
        await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });
        await prisma.purchaseHeader.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  // ==================== PURCHASE REQUESTS ====================
  listRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.PurchaseHeaderWhereInput = { documentType: 'PURCHASE_REQUEST', isVoid: false };
      if (req.query.status) where.status = req.query.status as string;
      if (req.query.vendorId) where.vendorId = parseInt(req.query.vendorId as string);
      const [documents, total] = await Promise.all([
        prisma.purchaseHeader.findMany({ where, skip, take, orderBy: { documentDate: 'desc' } }),
        prisma.purchaseHeader.count({ where }),
      ]);
      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'PURCHASE_REQUEST' },
        include: { vendor: true, purchaseAgent: true, details: { include: { product: true }, orderBy: { lineNo: 'asc' } } },
      });
      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['details']);
      let vendor: any = null;
      if (data.vendorId) {
        vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
        if (!vendor) throw BadRequestError('Vendor not found');
      } else {
        vendor = { id: undefined, code: null, name: null, currencyCode: data.currencyCode || 'MYR', creditTermDays: 0 };
      }
      const documentNo = await this.documentService.getNextNumber('PURCHASE_REQUEST');
      const doc = await this.createPurchaseDocument('PURCHASE_REQUEST', documentNo, data, vendor, req.user?.userId);
      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);
      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_REQUEST' } });
      if (!existing) this.notFound(id);
      if (existing!.status !== 'OPEN') throw BadRequestError('Cannot edit non-open document');
      const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);
      await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });
      const doc = await prisma.purchaseHeader.update({
        where: { id },
        data: {
          documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          reference: data.reference,
          description: data.description,
          subTotal, discountAmount, taxAmount, netTotal,
          modifiedBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              productId: d.productId,
              productCode: d.productCode,
              description: d.description,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              discountAmount: d.discountAmount || 0,
              subTotal: d.subTotal,
              taxCode: d.taxCode,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
              outstandingQty: d.quantity,
            })),
          },
        },
        include: { details: true },
      });
      this.successResponse(res, doc, 'Purchase Request updated');
    } catch (error) {
      next(error);
    }
  };

  deleteRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_REQUEST' } });
      if (!existing) this.notFound(id);
      if (existing!.transferStatus === 'TRANSFERRED' || existing!.transferStatus === 'PARTIAL') {
        await prisma.purchaseHeader.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'Purchase Request voided');
      } else {
        await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });
        await prisma.purchaseHeader.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  transferRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { lineTransfers } = req.body;
      const source = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'PURCHASE_REQUEST' },
        include: { details: true, vendor: true },
      });
      if (!source) this.notFound(id);
      if (source!.transferStatus === 'TRANSFERRED') throw BadRequestError('Document already fully transferred');
      const targetDocNo = await this.documentService.getNextNumber('PURCHASE_ORDER');
      const newDoc = await this.transferDocumentPartial(source!, 'PURCHASE_ORDER', targetDocNo, lineTransfers, req.user?.userId);
      this.successResponse(res, newDoc, `Transferred to PURCHASE_ORDER ${targetDocNo}`);
    } catch (error) {
      next(error);
    }
  };

  transferOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { targetType, lineTransfers } = req.body;

      const source = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'PURCHASE_ORDER' },
        include: { details: true, vendor: true },
      });
      if (!source) this.notFound(id);
      if (source!.transferStatus === 'TRANSFERRED') throw BadRequestError('Document already fully transferred');

      const targetDocType = targetType === 'GRN' ? 'GRN' : 'PURCHASE_INVOICE';
      const targetDocNo = await this.documentService.getNextNumber(targetDocType);
      const newDoc = await this.transferDocumentPartial(source!, targetDocType, targetDocNo, lineTransfers, req.user?.userId);

      // Update stock if transferring to GRN
      if (targetDocType === 'GRN') {
        await this.updateStock(newDoc.id, 'IN');
      }

      this.successResponse(res, newDoc, `Transferred to ${targetDocType} ${targetDocNo}`);
    } catch (error) {
      next(error);
    }
  };

  getTransferableLines = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findUnique({
        where: { id },
        include: { details: { where: { outstandingQty: { gt: 0 } }, orderBy: { lineNo: 'asc' } } },
      });
      if (!doc) this.notFound(id);
      this.successResponse(res, doc!.details);
    } catch (error) {
      next(error);
    }
  };

  // ==================== GRN ====================

  listGRN = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.PurchaseHeaderWhereInput = { documentType: 'GRN', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.purchaseHeader.findMany({ where, skip, take, orderBy: { documentDate: 'desc' } }),
        prisma.purchaseHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getGRN = this.getOrder;
  
  createGRN = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['vendorId', 'details']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const documentNo = await this.documentService.getNextNumber('GRN');
      const doc = await this.createPurchaseDocument('GRN', documentNo, data, vendor, req.user?.userId);

      // Update stock
      await this.updateStock(doc.id, 'IN');

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateGRN = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);

      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'GRN' } });
      if (!existing) this.notFound(id);
      if (existing!.status !== 'OPEN') throw BadRequestError('Cannot edit non-open GRN');

      const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

      await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });

      const doc = await prisma.purchaseHeader.update({
        where: { id },
        data: {
          documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
          supplierDONo: data.supplierDONo,
          reference: data.reference,
          description: data.description,
          subTotal, discountAmount, taxAmount, netTotal,
          modifiedBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              productId: d.productId,
              productCode: d.productCode,
              description: d.description,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              discountAmount: d.discountAmount || 0,
              subTotal: d.subTotal,
              taxCode: d.taxCode,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
              outstandingQty: d.quantity,
            })),
          },
        },
        include: { details: true },
      });

      this.successResponse(res, doc, 'GRN updated');
    } catch (error) {
      next(error);
    }
  };

  deleteGRN = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'GRN' } });
      if (!existing) this.notFound(id);

      // Reverse stock if needed
      if (existing!.transferStatus !== 'TRANSFERRED') {
        await this.updateStock(id, 'OUT'); // Reverse
      }

      if (existing!.transferStatus === 'TRANSFERRED' || existing!.transferStatus === 'PARTIAL') {
        await prisma.purchaseHeader.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'GRN voided');
      } else {
        await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });
        await prisma.purchaseHeader.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  transferGRN = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { lineTransfers } = req.body;

      const source = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'GRN' },
        include: { details: true, vendor: true },
      });
      if (!source) this.notFound(id);
      if (source!.transferStatus === 'TRANSFERRED') throw BadRequestError('Document already fully transferred');

      const targetDocNo = await this.documentService.getNextNumber('PURCHASE_INVOICE');
      const newDoc = await this.transferDocumentPartial(source!, 'PURCHASE_INVOICE', targetDocNo, lineTransfers, req.user?.userId);

      this.successResponse(res, newDoc, `Transferred to Purchase Invoice ${targetDocNo}`);
    } catch (error) {
      next(error);
    }
  };

  // ==================== PURCHASE INVOICES ====================

  listInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.PurchaseHeaderWhereInput = { documentType: 'PURCHASE_INVOICE', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.purchaseHeader.findMany({ where, skip, take, orderBy: { documentDate: 'desc' } }),
        prisma.purchaseHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getInvoice = this.getOrder;

  createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['vendorId', 'details']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const documentNo = await this.documentService.getNextNumber('PURCHASE_INVOICE');
      const doc = await this.createPurchaseDocument('PURCHASE_INVOICE', documentNo, data, vendor, req.user?.userId);

      // Auto-post to AP Invoice
      const apInvoice = await this.createAPInvoice({
        ...doc,
        vendor,
      });
      const posted = await prisma.purchaseHeader.update({
        where: { id: doc.id },
        data: { isPosted: true, apInvoiceId: apInvoice.id, status: 'POSTED' },
        include: { details: true, vendor: true },
      });

      this.createdResponse(res, { ...posted, apInvoiceId: apInvoice.id } as any);
    } catch (error) {
      next(error);
    }
  };

  updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);

      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_INVOICE' }, include: { vendor: true } });
      if (!existing) this.notFound(id);

      const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

      await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });

      const doc = await prisma.purchaseHeader.update({
        where: { id },
        data: {
          documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          supplierInvoiceNo: data.supplierInvoiceNo,
          reference: data.reference,
          description: data.description,
          subTotal, discountAmount, taxAmount, netTotal,
          modifiedBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              productId: d.productId,
              productCode: d.productCode,
              description: d.description,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              discountAmount: d.discountAmount || 0,
              subTotal: d.subTotal,
              taxCode: d.taxCode,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
              outstandingQty: d.quantity,
            })),
          },
        },
        include: { details: true },
      });

      // Auto-sync AP Invoice if linked and this is a Purchase Invoice
      if (existing.apInvoiceId) {
        const ap = await prisma.aPInvoice.findUnique({ where: { id: existing.apInvoiceId } });
        if (ap) {
          const paid = Number(ap.paidAmount || 0);
          const newOutstanding = Math.max(0, Number(netTotal) - paid);
          const baseDate = doc.documentDate || existing.documentDate;
          const newDue =
            doc.dueDate ??
            (existing.dueDate ??
              (baseDate ? new Date(new Date(baseDate).getTime() + (existing.vendor?.creditTermDays || 0) * 86400000) : null));

          await prisma.aPInvoice.update({
            where: { id: ap.id },
            data: {
              invoiceDate: doc.documentDate ?? ap.invoiceDate,
              dueDate: newDue ?? ap.dueDate,
              supplierInvoiceNo: doc.supplierInvoiceNo ?? ap.supplierInvoiceNo,
              reference: doc.reference ?? ap.reference,
              description: doc.description ?? ap.description,
              subTotal: subTotal,
              discountAmount: discountAmount,
              taxAmount: taxAmount,
              netTotal: netTotal,
              outstandingAmount: newOutstanding,
              currencyCode: doc.currencyCode ?? ap.currencyCode,
              exchangeRate: doc.exchangeRate ?? ap.exchangeRate,
              status: newOutstanding <= 0.01 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'OPEN',
            },
          });
        }
      }

      this.successResponse(res, doc, 'Purchase Invoice updated');
    } catch (error) {
      next(error);
    }
  };

  deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_INVOICE' } });
      if (!existing) this.notFound(id);

      if (existing!.isPosted) {
        await prisma.purchaseHeader.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'Purchase Invoice voided');
      } else {
        await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });
        await prisma.purchaseHeader.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  postInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'PURCHASE_INVOICE' },
        include: { details: true, vendor: true },
      });
      if (!doc) this.notFound(id);
      if (doc!.isPosted) throw BadRequestError('Invoice already posted');

      // Create AP Invoice
      const apInvoice = await this.createAPInvoice(doc!);

      // Update purchase document
      await prisma.purchaseHeader.update({
        where: { id },
        data: { isPosted: true, apInvoiceId: apInvoice.id, status: 'POSTED' },
      });

      this.successResponse(res, { purchaseId: id, apInvoiceId: apInvoice.id }, 'Invoice posted successfully');
    } catch (error) {
      next(error);
    }
  };

  // ==================== CASH PURCHASES ====================

  listCashPurchases = stubHandler('List Cash Purchases');
  createCashPurchase = stubHandler('Create Cash Purchase');

  // ==================== CREDIT NOTES ====================

  listCreditNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.PurchaseHeaderWhereInput = { documentType: 'PURCHASE_CREDIT_NOTE', isVoid: false };

      if (req.query.search) {
        where.OR = [
          { documentNo: { contains: req.query.search as string, mode: 'insensitive' } },
          { vendorName: { contains: req.query.search as string, mode: 'insensitive' } },
        ];
      }

      const [documents, total] = await Promise.all([
        prisma.purchaseHeader.findMany({
          where, skip, take,
          orderBy: { documentDate: 'desc' },
          include: { vendor: { select: { code: true, name: true } } },
        }),
        prisma.purchaseHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'PURCHASE_CREDIT_NOTE' },
        include: { vendor: true, details: { include: { product: true }, orderBy: { lineNo: 'asc' } } },
      });

      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['vendorId', 'details']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const documentNo = await this.documentService.getNextNumber('PURCHASE_CREDIT_NOTE');
      const doc = await this.createPurchaseDocument('PURCHASE_CREDIT_NOTE', documentNo, data, vendor, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);

      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_CREDIT_NOTE' } });
      if (!existing) this.notFound(id);
      if (existing!.status !== 'OPEN') throw BadRequestError('Cannot edit non-open credit note');

      const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

      await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });

      const doc = await prisma.purchaseHeader.update({
        where: { id },
        data: {
          documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
          reference: data.reference,
          description: data.description,
          subTotal, discountAmount, taxAmount, netTotal,
          modifiedBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              productId: d.productId,
              productCode: d.productCode,
              description: d.description,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              discountAmount: d.discountAmount || 0,
              subTotal: d.subTotal,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
            })),
          },
        },
        include: { details: true },
      });

      this.successResponse(res, doc, 'Credit Note updated');
    } catch (error) {
      next(error);
    }
  };

  deleteCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_CREDIT_NOTE' } });
      if (!existing) this.notFound(id);

      if (existing!.isPosted) {
        await prisma.purchaseHeader.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'Credit Note voided');
      } else {
        await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });
        await prisma.purchaseHeader.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  // ==================== DEBIT NOTES ====================

  listDebitNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.PurchaseHeaderWhereInput = { documentType: 'PURCHASE_DEBIT_NOTE', isVoid: false };

      if (req.query.search) {
        where.OR = [
          { documentNo: { contains: req.query.search as string, mode: 'insensitive' } },
          { vendorName: { contains: req.query.search as string, mode: 'insensitive' } },
        ];
      }

      const [documents, total] = await Promise.all([
        prisma.purchaseHeader.findMany({
          where, skip, take,
          orderBy: { documentDate: 'desc' },
          include: { vendor: { select: { code: true, name: true } } },
        }),
        prisma.purchaseHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getDebitNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findFirst({
        where: { id, documentType: 'PURCHASE_DEBIT_NOTE' },
        include: { vendor: true, details: { include: { product: true }, orderBy: { lineNo: 'asc' } } },
      });

      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createDebitNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['vendorId', 'details']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const documentNo = await this.documentService.getNextNumber('PURCHASE_DEBIT_NOTE');
      const doc = await this.createPurchaseDocument('PURCHASE_DEBIT_NOTE', documentNo, data, vendor, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateDebitNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);

      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_DEBIT_NOTE' } });
      if (!existing) this.notFound(id);
      if (existing!.status !== 'OPEN') throw BadRequestError('Cannot edit non-open debit note');

      const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

      await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });

      const doc = await prisma.purchaseHeader.update({
        where: { id },
        data: {
          documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
          reference: data.reference,
          description: data.description,
          subTotal, discountAmount, taxAmount, netTotal,
          modifiedBy: req.user?.userId,
          details: {
            create: data.details.map((d: any, idx: number) => ({
              lineNo: idx + 1,
              productId: d.productId,
              productCode: d.productCode,
              description: d.description,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              discountAmount: d.discountAmount || 0,
              subTotal: d.subTotal,
              taxRate: d.taxRate || 0,
              taxAmount: d.taxAmount || 0,
            })),
          },
        },
        include: { details: true },
      });

      this.successResponse(res, doc, 'Debit Note updated');
    } catch (error) {
      next(error);
    }
  };

  deleteDebitNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_DEBIT_NOTE' } });
      if (!existing) this.notFound(id);

      if (existing!.isPosted) {
        await prisma.purchaseHeader.update({ where: { id }, data: { isVoid: true, status: 'VOID' } });
        this.successResponse(res, null, 'Debit Note voided');
      } else {
        await prisma.purchaseDetail.deleteMany({ where: { purchaseId: id } });
        await prisma.purchaseHeader.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  // ==================== COMMON ====================

  // Unified void for purchase documents
  voidDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findUnique({ where: { id } });
      if (!doc) this.notFound(id);
      if (doc.isVoid) return this.successResponse(res, null, 'Document already voided');

      // Reverse stock for GRN if not fully transferred out
      if (doc.documentType === 'GRN' && doc.transferStatus !== 'TRANSFERRED') {
        await this.updateStock(id, 'OUT');
      }

      // Mark purchase document as void
      await prisma.purchaseHeader.update({
        where: { id },
        data: { isVoid: true, status: 'VOID' },
      });

      // If Purchase Invoice linked to AP, void AP as well
      if (doc.documentType === 'PURCHASE_INVOICE') {
        const ap = doc.apInvoiceId
          ? await prisma.aPInvoice.findUnique({ where: { id: doc.apInvoiceId } })
          : await prisma.aPInvoice.findFirst({ where: { sourceType: 'PURCHASE_INVOICE', sourceId: doc.id } });
        if (ap && !ap.isVoid) {
          await prisma.aPInvoice.update({ where: { id: ap.id }, data: { isVoid: true, status: 'VOID' } });
        }
      }

      this.successResponse(res, null, 'Document voided');
    } catch (error) {
      next(error);
    }
  };
  printDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.purchaseHeader.findUnique({
        where: { id },
        include: { vendor: true, details: { include: { product: true }, orderBy: { lineNo: 'asc' } } },
      });
      if (!doc) this.notFound(id);

      const company = await prisma.company.findFirst({ where: { isActive: true } });
      const titleMap: Record<string, string> = {
        PURCHASE_ORDER: 'Purchase Order',
        GRN: 'Goods Received Note',
        PURCHASE_INVOICE: 'Supplier Invoice',
        CREDIT_NOTE: 'Supplier Credit Note',
        DEBIT_NOTE: 'Supplier Debit Note',
      };
      const title = titleMap[doc.documentType] || 'Purchase Document';

      const rows = (doc.details || []).map(d => `
        <tr>
          <td>${d.lineNo}</td>
          <td>${d.productCode || ''}</td>
          <td>${d.description || ''}</td>
          <td style="text-align:right">${Number(d.quantity).toFixed(2)}</td>
          <td style="text-align:right">${Number(d.unitPrice).toFixed(2)}</td>
          <td style="text-align:right">${Number(d.subTotal).toFixed(2)}</td>
        </tr>
      `).join('');

      // Try template override
      const tmplPath = path.join(path.resolve(process.cwd(), config.upload.dir), 'templates', `purchase-${doc.documentType}.html`);
      if (fs.existsSync(tmplPath)) {
        const tmpl = fs.readFileSync(tmplPath, 'utf8');
        const replacements: Record<string, string> = {
          '{{title}}': title,
          '{{documentNo}}': doc.documentNo,
          '{{documentDate}}': doc.documentDate.toISOString().split('T')[0],
          '{{vendor.code}}': doc.vendorCode || '',
          '{{vendor.name}}': doc.vendorName || '',
          '{{vendor.address}}': doc.vendor?.address1 || '',
          '{{totals.subTotal}}': Number(doc.subTotal).toFixed(2),
          '{{totals.discount}}': Number(doc.discountAmount).toFixed(2),
          '{{totals.tax}}': Number(doc.taxAmount).toFixed(2),
          '{{totals.netTotal}}': Number(doc.netTotal).toFixed(2),
          '{{details.table}}': rows,
          '{{company.name}}': company?.name || '',
          '{{company.address}}': company?.address1 || '',
        };
        let out = tmpl;
        for (const [k, v] of Object.entries(replacements)) {
          out = out.split(k).join(v);
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(out);
      }

      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} ${doc.documentNo}</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0; }
    .header { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .muted { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 14px; }
    th { background: #f3f4f6; text-align: left; }
    .totals { margin-top: 16px; width: 300px; margin-left: auto; }
    .totals td { border: none; padding: 4px 0; }
  </style>
  <script>window.onload = () => window.print?.()</script>
  </head>
<body>
  <div class="header">
    <div>
      <h1>${company?.name || 'Company'}</h1>
      <div class="muted">${company?.address1 || ''}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:24px; font-weight:600">${title}</div>
      <div class="muted">No: ${doc.documentNo}</div>
      <div class="muted">Date: ${doc.documentDate.toISOString().split('T')[0]}</div>
    </div>
  </div>
  <div>
    <div><strong>Vendor:</strong> ${doc.vendorName}</div>
    <div class="muted">${doc.vendor?.address1 || ''}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Description</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Cost</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <table class="totals">
    <tr><td>Sub Total:</td><td style="text-align:right">${Number(doc.subTotal).toFixed(2)}</td></tr>
    <tr><td>Discount:</td><td style="text-align:right">${Number(doc.discountAmount).toFixed(2)}</td></tr>
    <tr><td>Tax:</td><td style="text-align:right">${Number(doc.taxAmount).toFixed(2)}</td></tr>
    <tr><td style="font-weight:700">Net Total:</td><td style="text-align:right; font-weight:700">${Number(doc.netTotal).toFixed(2)}</td></tr>
  </table>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      next(error);
    }
  };

  // ==================== HELPERS ====================

  private async createPurchaseDocument(documentType: string, documentNo: string, data: any, vendor: any, userId?: number) {
    const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);
    const docDate = new Date(data.documentDate || new Date());
    const computedDueDate =
      documentType === 'PURCHASE_INVOICE' && !data.dueDate
        ? new Date(docDate.getTime() + (vendor.creditTermDays || 0) * 86400000)
        : (data.dueDate ? new Date(data.dueDate) : null);

    const header = await prisma.purchaseHeader.create({
      data: {
        documentType,
        documentNo,
        documentDate: docDate,
        dueDate: computedDueDate,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        vendorId: vendor.id,
        vendorCode: vendor.code,
        vendorName: vendor.name,
        supplierInvoiceNo: data.supplierInvoiceNo,
        supplierDONo: data.supplierDONo,
        purchaseAgentId: data.purchaseAgentId,
        locationId: data.locationId,
        currencyCode: data.currencyCode || vendor.currencyCode,
        exchangeRate: data.exchangeRate || 1,
        reference: data.reference,
        description: data.description,
        subTotal,
        discountAmount,
        taxAmount,
        netTotal,
        netTotalLocal: netTotal * (data.exchangeRate || 1),
        status: 'OPEN',
        createdBy: userId,
        details: {
          create: data.details.map((d: any, idx: number) => ({
            lineNo: idx + 1,
            productId: d.productId,
            productCode: d.productCode,
            description: d.description,
            quantity: d.quantity,
            uomId: d.uomId,
            uomCode: d.uomCode,
            uomRate: d.uomRate || 1,
            baseQuantity: d.quantity * (d.uomRate || 1),
            unitPrice: d.unitPrice,
            discountAmount: d.discountAmount || 0,
            subTotal: d.subTotal || (d.quantity * d.unitPrice),
            taxCode: d.taxCode,
            taxRate: d.taxRate || 0,
            taxAmount: d.taxAmount || 0,
            locationId: d.locationId,
            outstandingQty: d.quantity,
          })),
        },
      },
      include: { details: true, vendor: true },
    });

    if (documentType === 'PURCHASE_INVOICE') {
      const ap = await this.createAPInvoice(header);
      await prisma.purchaseHeader.update({
        where: { id: header.id },
        data: { isPosted: true, apInvoiceId: ap.id, status: 'POSTED' },
      });
    }

    return header;
  }

  private calculateTotals(details: any[]) {
    let subTotal = 0, discountAmount = 0, taxAmount = 0;
    details.forEach(d => {
      subTotal += d.quantity * d.unitPrice;
      discountAmount += d.discountAmount || 0;
      taxAmount += d.taxAmount || 0;
    });
    return { subTotal, discountAmount, taxAmount, netTotal: subTotal - discountAmount + taxAmount };
  }

  private async updateStock(purchaseId: number, direction: 'IN' | 'OUT') {
    const purchase = await prisma.purchaseHeader.findUnique({
      where: { id: purchaseId },
      include: { details: { include: { product: true } } },
    });
    if (!purchase) return;

    const multiplier = direction === 'IN' ? 1 : -1;

    for (const detail of purchase.details) {
      if (!detail.productId) continue;

      const locationId = detail.locationId || purchase.locationId || 1;

      // Update or create product location balance
      await prisma.productLocation.upsert({
        where: { productId_locationId: { productId: detail.productId, locationId } },
        create: {
          productId: detail.productId,
          locationId,
          balanceQty: Number(detail.quantity) * multiplier,
        },
        update: {
          balanceQty: { increment: Number(detail.quantity) * multiplier },
        },
      });

      // Update product average cost for incoming stock
      if (direction === 'IN' && detail.product) {
        const currentQty = await prisma.productLocation.aggregate({
          where: { productId: detail.productId },
          _sum: { balanceQty: true },
        });
        const totalQty = Number(currentQty._sum.balanceQty) || 0;
        const oldCost = Number(detail.product.averageCost) || 0;
        const newCost = Number(detail.unitPrice) || 0;
        
        if (totalQty > 0) {
          const avgCost = ((totalQty - Number(detail.quantity)) * oldCost + Number(detail.quantity) * newCost) / totalQty;
          await prisma.product.update({
            where: { id: detail.productId },
            data: { averageCost: avgCost, lastPurchaseCost: newCost },
          });
        }
      }
    }
  }

  private async transferDocumentPartial(
    source: any,
    targetType: string,
    targetDocNo: string,
    lineTransfers?: { lineId: number; transferQty: number }[],
    userId?: number
  ) {
    const transferMap = new Map<number, number>();
    if (lineTransfers && lineTransfers.length > 0) {
      lineTransfers.forEach(lt => transferMap.set(lt.lineId, lt.transferQty));
    } else {
      source.details.forEach((d: any) => {
        if (Number(d.outstandingQty) > 0) {
          transferMap.set(d.id, Number(d.outstandingQty));
        }
      });
    }

    const linesToTransfer = source.details
      .filter((d: any) => transferMap.has(d.id) && transferMap.get(d.id)! > 0)
      .map((d: any) => ({
        ...d,
        quantity: transferMap.get(d.id)!,
        outstandingQty: transferMap.get(d.id)!,
      }));

    if (linesToTransfer.length === 0) {
      throw BadRequestError('No lines to transfer');
    }

    const newDoc = await this.createPurchaseDocument(targetType, targetDocNo, {
      ...source,
      documentDate: new Date(),
      sourceType: source.documentType,
      sourceId: source.id,
      vendorId: source.vendorId,
      details: linesToTransfer,
    }, source.vendor, userId);

    let allFullyTransferred = true;
    for (const detail of source.details) {
      const transferQty = transferMap.get(detail.id) || 0;
      if (transferQty > 0) {
        const newOutstanding = Number(detail.outstandingQty) - transferQty;
        await prisma.purchaseDetail.update({
          where: { id: detail.id },
          data: {
            transferredQty: { increment: transferQty },
            outstandingQty: Math.max(0, newOutstanding),
          },
        });
        if (newOutstanding > 0) allFullyTransferred = false;
      } else if (Number(detail.outstandingQty) > 0) {
        allFullyTransferred = false;
      }
    }

    await prisma.purchaseHeader.update({
      where: { id: source.id },
      data: {
        transferStatus: allFullyTransferred ? 'TRANSFERRED' : 'PARTIAL',
        status: allFullyTransferred ? 'TRANSFERRED' : source.status,
      },
    });

    return newDoc;
  }

  private async createAPInvoice(purchaseDoc: any) {
    const invoiceNo = await this.documentService.getNextNumber('AP_INVOICE');

    return prisma.aPInvoice.create({
      data: {
        invoiceNo,
        invoiceDate: purchaseDoc.documentDate,
        dueDate: purchaseDoc.dueDate,
        vendorId: purchaseDoc.vendorId,
        vendorCode: purchaseDoc.vendorCode,
        vendorName: purchaseDoc.vendorName,
        supplierInvoiceNo: purchaseDoc.supplierInvoiceNo,
        subTotal: purchaseDoc.subTotal,
        discountAmount: purchaseDoc.discountAmount,
        taxAmount: purchaseDoc.taxAmount,
        netTotal: purchaseDoc.netTotal,
        outstandingAmount: purchaseDoc.netTotal,
        currencyCode: purchaseDoc.currencyCode,
        exchangeRate: purchaseDoc.exchangeRate,
        sourceType: 'PURCHASE_INVOICE',
        sourceId: purchaseDoc.id,
        createdBy: purchaseDoc.createdBy,
      },
    });
  }

  list = this.listOrders;
  getById = this.getOrder;
  create = this.createOrder;
  update = stubHandler('Update Purchase');
  delete = stubHandler('Delete Purchase');
}
