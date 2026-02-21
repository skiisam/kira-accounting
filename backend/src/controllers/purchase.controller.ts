import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import { DocumentService } from '../services/document.service';
import { Prisma } from '@prisma/client';

export class PurchaseController extends BaseController<any> {
  protected modelName = 'Purchase';
  private documentService = new DocumentService();

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
      const data = req.body;
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
      const data = req.body;

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
      const data = req.body;
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
      const data = req.body;

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
      const data = req.body;
      this.validateRequired(data, ['vendorId', 'details']);

      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) throw BadRequestError('Vendor not found');

      const documentNo = await this.documentService.getNextNumber('PURCHASE_INVOICE');
      const doc = await this.createPurchaseDocument('PURCHASE_INVOICE', documentNo, data, vendor, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const existing = await prisma.purchaseHeader.findFirst({ where: { id, documentType: 'PURCHASE_INVOICE' } });
      if (!existing) this.notFound(id);
      if (existing!.isPosted) throw BadRequestError('Cannot edit posted invoice');

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
      const data = req.body;
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
      const data = req.body;

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
      const data = req.body;
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
      const data = req.body;

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

  voidDocument = stubHandler('Void Purchase Document');
  printDocument = stubHandler('Print Purchase Document');

  // ==================== HELPERS ====================

  private async createPurchaseDocument(documentType: string, documentNo: string, data: any, vendor: any, userId?: number) {
    const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

    return prisma.purchaseHeader.create({
      data: {
        documentType,
        documentNo,
        documentDate: new Date(data.documentDate || new Date()),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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
