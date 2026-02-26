import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { DocumentService } from '../services/document.service';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

export class SalesController extends BaseController<any> {
  protected modelName = 'Sales';
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

  // ==================== QUOTATIONS ====================
  
  listQuotations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.SalesHeaderWhereInput = {
        documentType: 'QUOTATION',
        isVoid: false,
      };

      if (req.query.status) where.status = req.query.status as string;
      if (req.query.customerId) where.customerId = parseInt(req.query.customerId as string);
      if (req.query.search) {
        where.OR = [
          { documentNo: { contains: req.query.search as string, mode: 'insensitive' } },
          { customerName: { contains: req.query.search as string, mode: 'insensitive' } },
        ];
      }

      const dateRange = this.getDateRange(req, 'documentDate');
      if (dateRange) Object.assign(where, dateRange);

      const [documents, total] = await Promise.all([
        prisma.salesHeader.findMany({
          where, skip, take,
          orderBy: { documentDate: 'desc' },
          include: { customer: { select: { code: true, name: true } }, salesAgent: true },
        }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'QUOTATION' },
        include: {
          customer: true, salesAgent: true, location: true,
          details: { include: { product: true }, orderBy: { lineNo: 'asc' } },
        },
      });

      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['customerId', 'details']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const documentNo = await this.documentService.getNextNumber('QUOTATION');
      const doc = await this.createSalesDocument('QUOTATION', documentNo, data, customer, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);

      const existing = await prisma.salesHeader.findFirst({ where: { id, documentType: 'QUOTATION' } });
      if (!existing) this.notFound(id);
      if (existing!.status !== 'OPEN') throw BadRequestError('Cannot edit non-open quotation');

      const doc = await this.updateSalesDocument(id, data, req.user?.userId);
      this.successResponse(res, doc, 'Quotation updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.salesHeader.findFirst({ where: { id, documentType: 'QUOTATION' } });
      if (!existing) this.notFound(id);

      if (existing!.transferStatus === 'TRANSFERRED') {
        await prisma.salesHeader.update({ where: { id }, data: { isVoid: true } });
        this.successResponse(res, null, 'Quotation voided');
      } else {
        await prisma.salesDetail.deleteMany({ where: { salesId: id } });
        await prisma.salesHeader.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  transferQuotation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { targetType, lineTransfers } = req.body;
      // lineTransfers: [{ lineId: number, transferQty: number }] - optional for partial transfer

      const source = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'QUOTATION' },
        include: { details: true, customer: true },
      });
      if (!source) this.notFound(id);
      if (source!.transferStatus === 'TRANSFERRED') throw BadRequestError('Document already fully transferred');

      const targetDocType = this.mapTargetType(targetType);
      const targetDocNo = await this.documentService.getNextNumber(targetDocType);
      const newDoc = await this.transferDocumentPartial(source!, targetDocType, targetDocNo, lineTransfers, req.user?.userId);

      this.successResponse(res, newDoc, `Transferred to ${targetDocType} ${targetDocNo}`);
    } catch (error) {
      next(error);
    }
  };

  // Get transferable lines (with outstanding qty) for transfer dialog
  getTransferableLines = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findUnique({
        where: { id },
        include: { details: { where: { outstandingQty: { gt: 0 } }, orderBy: { lineNo: 'asc' } } },
      });
      if (!doc) this.notFound(id);
      this.successResponse(res, doc!.details);
    } catch (error) {
      next(error);
    }
  };

  // ==================== SALES ORDERS ====================

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.SalesHeaderWhereInput = { documentType: 'SALES_ORDER', isVoid: false };

      if (req.query.status) where.status = req.query.status as string;
      if (req.query.customerId) where.customerId = parseInt(req.query.customerId as string);

      const [documents, total] = await Promise.all([
        prisma.salesHeader.findMany({
          where, skip, take,
          orderBy: { documentDate: 'desc' },
          include: { customer: { select: { code: true, name: true } } },
        }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'SALES_ORDER' },
        include: {
          customer: true, salesAgent: true, location: true,
          details: { include: { product: true }, orderBy: { lineNo: 'asc' } },
        },
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
      this.validateRequired(data, ['customerId', 'details']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const documentNo = await this.documentService.getNextNumber('SALES_ORDER');
      const doc = await this.createSalesDocument('SALES_ORDER', documentNo, data, customer, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };
  updateOrder = this.updateQuotation;
  deleteOrder = this.deleteQuotation;
  
  transferOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { targetType, lineTransfers } = req.body;

      const source = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'SALES_ORDER' },
        include: { details: true, customer: true },
      });
      if (!source) this.notFound(id);
      if (source!.transferStatus === 'TRANSFERRED') throw BadRequestError('Document already fully transferred');

      const targetDocType = this.mapTargetType(targetType);
      const targetDocNo = await this.documentService.getNextNumber(targetDocType);
      const newDoc = await this.transferDocumentPartial(source!, targetDocType, targetDocNo, lineTransfers, req.user?.userId);

      this.successResponse(res, newDoc, `Transferred to ${targetDocType} ${targetDocNo}`);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /sales/orders/:id/stock-check
   * Returns per-line availableQty and shortfallQty based on total stock on hand
   */
  stockCheckForOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const order = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'SALES_ORDER' },
        include: { details: true },
      });
      if (!order) this.notFound(id);

      const results: Array<{
        lineId: number;
        lineNo: number;
        productId: number;
        productCode: string | null;
        description: string | null;
        outstandingQty: number;
        availableQty: number;
        shortfallQty: number;
      }> = [];

      // Aggregate stock per product across all locations
      for (const d of order!.details) {
        if (!d.productId) continue;
        const agg = await prisma.productLocation.aggregate({
          where: { productId: d.productId },
          _sum: { balanceQty: true },
        });
        const available = Number(agg._sum.balanceQty || 0);
        const outstanding = Number(d.outstandingQty || d.quantity || 0);
        const shortfall = Math.max(0, outstanding - available);
        results.push({
          lineId: d.id,
          lineNo: d.lineNo,
          productId: d.productId,
          productCode: d.productCode,
          description: d.description,
          outstandingQty: outstanding,
          availableQty: available,
          shortfallQty: shortfall,
        });
      }

      this.successResponse(res, results);
    } catch (error) {
      next(error);
    }
  };

  // ==================== DELIVERY ORDERS ====================

  listDeliveryOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.SalesHeaderWhereInput = { documentType: 'DELIVERY_ORDER', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.salesHeader.findMany({ where, skip, take, orderBy: { documentDate: 'desc' } }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getDeliveryOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'DELIVERY_ORDER' },
        include: {
          customer: true, salesAgent: true, location: true,
          details: { include: { product: true }, orderBy: { lineNo: 'asc' } },
        },
      });
      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createDeliveryOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['customerId', 'details']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const documentNo = await this.documentService.getNextNumber('DELIVERY_ORDER');
      const doc = await this.createSalesDocument('DELIVERY_ORDER', documentNo, data, customer, req.user?.userId);

      // Update stock
      await this.updateStockForDO(doc.id, 'OUT');

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };
  updateDeliveryOrder = this.updateQuotation;
  deleteDeliveryOrder = this.deleteQuotation;
  
  transferDeliveryOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { targetType, lineTransfers } = req.body;

      const source = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'DELIVERY_ORDER' },
        include: { details: true, customer: true },
      });
      if (!source) this.notFound(id);
      if (source!.transferStatus === 'TRANSFERRED') throw BadRequestError('Document already fully transferred');

      const targetDocType = this.mapTargetType(targetType);
      const targetDocNo = await this.documentService.getNextNumber(targetDocType);
      const newDoc = await this.transferDocumentPartial(source!, targetDocType, targetDocNo, lineTransfers, req.user?.userId);

      this.successResponse(res, newDoc, `Transferred to ${targetDocType} ${targetDocNo}`);
    } catch (error) {
      next(error);
    }
  };

  // ==================== INVOICES ====================

  listInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.SalesHeaderWhereInput = { documentType: 'INVOICE', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.salesHeader.findMany({ where, skip, take, orderBy: { documentDate: 'desc' } }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'INVOICE' },
        include: {
          customer: true, salesAgent: true, location: true,
          details: { include: { product: true }, orderBy: { lineNo: 'asc' } },
        },
      });
      if (!doc) this.notFound(id);
      // Backfill arInvoiceId for legacy records based on source link
      if (!doc.arInvoiceId) {
        const ar = await prisma.aRInvoice.findFirst({
          where: { sourceType: 'SALES_INVOICE', sourceId: doc.id },
          select: { id: true },
        });
        if (ar) {
          // do not persist if not necessary; respond with populated value
          this.successResponse(res, { ...doc, arInvoiceId: ar.id } as any);
          return;
        }
      }
      this.successResponse(res, doc as any);
    } catch (error) {
      next(error);
    }
  };
  createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['customerId', 'details']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const documentNo = await this.documentService.getNextNumber('INVOICE');
      const doc = await this.createSalesDocument('INVOICE', documentNo, data, customer, req.user?.userId);

      // Auto-post to AR Invoice
      const arInvoice = await this.createARInvoice({
        ...doc,
        customer,
      });
      const posted = await prisma.salesHeader.update({
        where: { id: doc.id },
        data: { isPosted: true, arInvoiceId: arInvoice.id, status: 'POSTED' },
        include: { details: true, customer: true },
      });

      this.createdResponse(res, { ...posted, arInvoiceId: arInvoice.id } as any);
    } catch (error) {
      next(error);
    }
  };
  // updateInvoice implemented below to ensure AR sync
  deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'INVOICE' },
      });
      if (!existing) this.notFound(id);

      // Block delete if linked/posted
      if (existing.isPosted || existing.arInvoiceId) {
        res.status(400).json({
          success: false,
          error: { code: 'LINKED_DOCUMENT', message: 'Cannot delete posted/linked invoice. Void instead.' },
        });
        return;
      }

      // Block if fiscal period locked
      if (await this.isDateLocked(existing.documentDate)) {
        res.status(400).json({
          success: false,
          error: { code: 'PERIOD_LOCKED', message: 'Cannot delete invoice in a locked period.' },
        });
        return;
      }

      await prisma.salesDetail.deleteMany({ where: { salesId: id } });
      await prisma.salesHeader.delete({ where: { id } });
      this.deletedResponse(res, 'Invoice deleted');
    } catch (error) {
      next(error);
    }
  };

  postInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'INVOICE' },
        include: { details: true, customer: true },
      });
      if (!doc) this.notFound(id);
      if (doc!.isPosted) throw BadRequestError('Invoice already posted');

      // Create AR Invoice
      const arInvoice = await this.createARInvoice(doc!);

      // Update sales document
      await prisma.salesHeader.update({
        where: { id },
        data: { isPosted: true, arInvoiceId: arInvoice.id, status: 'POSTED' },
      });

      this.successResponse(res, { salesId: id, arInvoiceId: arInvoice.id }, 'Invoice posted successfully');
    } catch (error) {
      next(error);
    }
  };

  // ==================== PRICING HELPERS ====================
  /**
   * GET /sales/price-history
   * Query params: customerId, productId, limit=10
   * Returns recent sales of the product to the customer with unit prices
   */
  getPriceHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.query.customerId as string);
      const productId = parseInt(req.query.productId as string);
      const limit = Math.min(50, parseInt((req.query.limit as string) || '10'));

      if (!customerId || !productId) {
        throw BadRequestError('customerId and productId are required');
      }

      const rows = await prisma.salesDetail.findMany({
        where: {
          productId,
          header: {
            customerId,
            documentType: 'INVOICE',
            isVoid: false,
          },
        },
        take: limit,
        orderBy: { header: { documentDate: 'desc' } },
        include: {
          header: {
            select: { id: true, documentNo: true, documentDate: true },
          },
        },
      });

      const data = rows.map((r) => ({
        date: r.header?.documentDate,
        documentNo: r.header?.documentNo,
        unitPrice: Number(r.unitPrice || 0),
        discountAmount: Number(r.discountAmount || 0),
        subTotal: Number(r.subTotal || 0),
      }));

      this.successResponse(res, data);
    } catch (error) {
      next(error);
    }
  };

  // ==================== CASH SALES ====================

  listCashSales = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.SalesHeaderWhereInput = { documentType: 'CASH_SALE', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.salesHeader.findMany({ where, skip, take, orderBy: { documentDate: 'desc' } }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getCashSale = this.getQuotation;
  createCashSale = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['customerId', 'details', 'paidAmount']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const documentNo = await this.documentService.getNextNumber('CASH_SALE');
      const doc = await this.createSalesDocument('CASH_SALE', documentNo, data, customer, req.user?.userId);

      // Update stock
      await this.updateStockForDO(doc.id, 'OUT');

      // Create payment
      // TODO: Create cash receipt

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };
  updateCashSale = this.updateQuotation;
  deleteCashSale = this.deleteQuotation;

  // ==================== CREDIT NOTES ====================

  listCreditNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.SalesHeaderWhereInput = { documentType: 'CREDIT_NOTE', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.salesHeader.findMany({ where, skip, take, orderBy: { documentDate: 'desc' } }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getCreditNote = this.getQuotation;
  createCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = this.normalizeData(req.body);
      this.validateRequired(data, ['customerId', 'details']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const documentNo = await this.documentService.getNextNumber('CREDIT_NOTE');
      const doc = await this.createSalesDocument('CREDIT_NOTE', documentNo, data, customer, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };
  updateCreditNote = this.updateQuotation;
  deleteCreditNote = this.deleteQuotation;

  // ==================== DEBIT NOTES ====================

  listDebitNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where: Prisma.SalesHeaderWhereInput = { documentType: 'DEBIT_NOTE', isVoid: false };

      if (req.query.search) {
        where.OR = [
          { documentNo: { contains: req.query.search as string, mode: 'insensitive' } },
          { customerName: { contains: req.query.search as string, mode: 'insensitive' } },
        ];
      }

      const [documents, total] = await Promise.all([
        prisma.salesHeader.findMany({
          where, skip, take,
          orderBy: { documentDate: 'desc' },
          include: { customer: { select: { code: true, name: true } } },
        }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getDebitNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findFirst({
        where: { id, documentType: 'DEBIT_NOTE' },
        include: {
          customer: true, salesAgent: true, location: true,
          details: { include: { product: true }, orderBy: { lineNo: 'asc' } },
        },
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
      this.validateRequired(data, ['customerId', 'details']);

      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw BadRequestError('Customer not found');

      const documentNo = await this.documentService.getNextNumber('DEBIT_NOTE');
      const doc = await this.createSalesDocument('DEBIT_NOTE', documentNo, data, customer, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateDebitNote = this.updateQuotation;
  deleteDebitNote = this.deleteQuotation;

  // ==================== COMMON ====================

  printDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findUnique({
        where: { id },
        include: { customer: true, details: { include: { product: true }, orderBy: { lineNo: 'asc' } } },
      });
      if (!doc) this.notFound(id);

      const company = await prisma.company.findFirst({ where: { isActive: true } });
      const titleMap: Record<string, string> = {
        QUOTATION: 'Quotation',
        SALES_ORDER: 'Sales Order',
        DELIVERY_ORDER: 'Delivery Order',
        INVOICE: 'Invoice',
        CREDIT_NOTE: 'Credit Note',
        DEBIT_NOTE: 'Debit Note',
      };
      const title = titleMap[doc.documentType] || 'Document';

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
      const tmplPath = path.join(path.resolve(process.cwd(), config.upload.dir), 'templates', `sales-${doc.documentType}.html`);
      if (fs.existsSync(tmplPath)) {
        const tmpl = fs.readFileSync(tmplPath, 'utf8');
        const replacements: Record<string, string> = {
          '{{title}}': title,
          '{{documentNo}}': doc.documentNo,
          '{{documentDate}}': doc.documentDate.toISOString().split('T')[0],
          '{{customer.code}}': doc.customerCode,
          '{{customer.name}}': doc.customerName,
          '{{customer.address}}': doc.customer?.address1 || '',
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
    <div><strong>Customer:</strong> ${doc.customerName}</div>
    <div class="muted">${doc.customer?.address1 || ''}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Description</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Price</th>
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

  // Unified void handler for sales documents (keeps record, marks as VOID)
  voidDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.salesHeader.findUnique({ where: { id } });
      if (!doc) this.notFound(id);
      if (doc.isVoid) return this.successResponse(res, null, 'Document already voided');

      // Mark sales document as void
      await prisma.salesHeader.update({
        where: { id },
        data: { isVoid: true, status: 'VOID' },
      });

      // If Sales Invoice linked to AR, void AR as well
      if (doc.documentType === 'INVOICE') {
        const ar = doc.arInvoiceId
          ? await prisma.aRInvoice.findUnique({ where: { id: doc.arInvoiceId } })
          : await prisma.aRInvoice.findFirst({ where: { sourceType: 'SALES_INVOICE', sourceId: doc.id } });
        if (ar && !ar.isVoid) {
          await prisma.aRInvoice.update({ where: { id: ar.id }, data: { isVoid: true, status: 'VOID' } });
        }
      }

      this.successResponse(res, null, 'Document voided');
    } catch (error) {
      next(error);
    }
  };

  // ==================== HELPERS ====================

  private async createSalesDocument(
    documentType: string,
    documentNo: string,
    data: any,
    customer: any,
    userId?: number
  ) {
    const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);
    const docDate = new Date(data.documentDate || new Date());
    const computedDueDate =
      documentType === 'INVOICE' && !data.dueDate
        ? new Date(docDate.getTime() + (customer.creditTermDays || 0) * 24 * 60 * 60 * 1000)
        : (data.dueDate ? new Date(data.dueDate) : null);

    const header = await prisma.salesHeader.create({
      data: {
        documentType,
        documentNo,
        documentDate: docDate,
        dueDate: computedDueDate,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        customerId: customer.id,
        customerCode: customer.code,
        customerName: customer.name,
        billToAddress: data.billToAddress || this.formatAddress(customer),
        shipToAddress: data.shipToAddress,
        salesAgentId: data.salesAgentId || customer.salesAgentId,
        locationId: data.locationId,
        currencyCode: data.currencyCode || customer.currencyCode,
        exchangeRate: data.exchangeRate || 1,
        reference: data.reference,
        description: data.description,
        isTaxInclusive: data.isTaxInclusive || false,
        subTotal,
        discountAmount,
        taxAmount,
        roundingAmount: data.roundingAmount || 0,
        netTotal,
        netTotalLocal: netTotal * (data.exchangeRate || 1),
        paidAmount: data.paidAmount || 0,
        changeAmount: data.changeAmount || 0,
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
            discountText: d.discountText,
            discountAmount: d.discountAmount || 0,
            subTotal: d.subTotal || (d.quantity * d.unitPrice - (d.discountAmount || 0)),
            taxCode: d.taxCode,
            taxRate: d.taxRate || 0,
            taxAmount: d.taxAmount || 0,
            unitCost: d.unitCost || 0,
            locationId: d.locationId,
            outstandingQty: d.quantity,
          })),
        },
      },
      include: { details: true, customer: true },
    });

    if (documentType === 'INVOICE') {
      const ar = await this.createARInvoice(header);
      await prisma.salesHeader.update({
        where: { id: header.id },
        data: { isPosted: true, arInvoiceId: ar.id, status: 'POSTED' },
      });
      const updated = await prisma.salesHeader.findUnique({ where: { id: header.id } });
      return updated!;
    }

    return header;
  }

  private async updateSalesDocument(id: number, data: any, userId?: number) {
    const existing = await prisma.salesHeader.findUnique({ where: { id }, include: { customer: true } });
    if (!existing) this.notFound(id);
    const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

    // Delete existing details
    await prisma.salesDetail.deleteMany({ where: { salesId: id } });

    const updated = await prisma.salesHeader.update({
      where: { id },
      data: {
        documentDate: data.documentDate ? new Date(data.documentDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        salesAgentId: data.salesAgentId,
        locationId: data.locationId,
        reference: data.reference,
        description: data.description,
        subTotal,
        discountAmount,
        taxAmount,
        netTotal,
        modifiedBy: userId,
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

    // Auto-sync AR Invoice if linked and this is a Sales Invoice
    if (existing.documentType === 'INVOICE') {
      // Find linked AR invoice
      const ar = existing.arInvoiceId
        ? await prisma.aRInvoice.findUnique({ where: { id: existing.arInvoiceId } })
        : await prisma.aRInvoice.findFirst({ where: { sourceType: 'SALES_INVOICE', sourceId: existing.id } });

      if (ar) {
        const paid = Number(ar.paidAmount || 0);
        const newOutstanding = Math.max(0, Number(netTotal) - paid);
        // Compute due date
        const baseDate = updated.documentDate || existing.documentDate;
        const newDue =
          updated.dueDate ??
          (existing.dueDate ??
            (baseDate ? new Date(new Date(baseDate).getTime() + (existing.customer?.creditTermDays || 0) * 86400000) : null));

        await prisma.aRInvoice.update({
          where: { id: ar.id },
          data: {
            invoiceDate: updated.documentDate ?? ar.invoiceDate,
            dueDate: newDue ?? ar.dueDate,
            reference: updated.reference ?? ar.reference,
            description: updated.description ?? ar.description,
            subTotal: subTotal,
            discountAmount: discountAmount,
            taxAmount: taxAmount,
            netTotal: netTotal,
            outstandingAmount: newOutstanding,
            currencyCode: updated.currencyCode ?? ar.currencyCode,
            exchangeRate: updated.exchangeRate ?? ar.exchangeRate,
            status: newOutstanding <= 0.01 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'OPEN',
          },
        });
      }
    }

    return updated;
  }

  // Replace aliasing with a real update for Invoice to ensure AR sync
  updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = this.normalizeData(req.body);
      const existing = await prisma.salesHeader.findFirst({ where: { id, documentType: 'INVOICE' } });
      if (!existing) this.notFound(id);
      const doc = await this.updateSalesDocument(id, data, req.user?.userId);
      this.successResponse(res, doc, 'Invoice updated successfully');
    } catch (error) {
      next(error);
    }
  };

  private mapTargetType(targetType: string): string {
    const mapping: Record<string, string> = {
      'ORDER': 'SALES_ORDER',
      'SALES_ORDER': 'SALES_ORDER',
      'DO': 'DELIVERY_ORDER',
      'DELIVERY_ORDER': 'DELIVERY_ORDER',
      'INVOICE': 'INVOICE',
    };
    return mapping[targetType] || targetType;
  }

  private async transferDocumentPartial(
    source: any,
    targetType: string,
    targetDocNo: string,
    lineTransfers?: { lineId: number; transferQty: number }[],
    userId?: number
  ) {
    // If lineTransfers not provided, transfer all outstanding qty
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

    // Filter lines with transfer qty
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

    // Create new document
    const newDoc = await this.createSalesDocument(targetType, targetDocNo, {
      ...source,
      documentDate: new Date(),
      sourceType: source.documentType,
      sourceId: source.id,
      details: linesToTransfer,
    }, source.customer, userId);

    // Update source line outstanding quantities
    let allFullyTransferred = true;
    for (const detail of source.details) {
      const transferQty = transferMap.get(detail.id) || 0;
      if (transferQty > 0) {
        const newOutstanding = Number(detail.outstandingQty) - transferQty;
        await prisma.salesDetail.update({
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

    // Update source transfer status
    await prisma.salesHeader.update({
      where: { id: source.id },
      data: {
        transferStatus: allFullyTransferred ? 'TRANSFERRED' : 'PARTIAL',
        status: allFullyTransferred ? 'TRANSFERRED' : source.status,
      },
    });

    return newDoc;
  }

  private calculateTotals(details: any[]) {
    let subTotal = 0, discountAmount = 0, taxAmount = 0;

    details.forEach(d => {
      const lineSubTotal = d.quantity * d.unitPrice;
      const lineDiscount = d.discountAmount || 0;
      const lineTax = d.taxAmount || 0;
      subTotal += lineSubTotal;
      discountAmount += lineDiscount;
      taxAmount += lineTax;
    });

    return {
      subTotal,
      discountAmount,
      taxAmount,
      netTotal: subTotal - discountAmount + taxAmount,
    };
  }

  private formatAddress(customer: any): string {
    return [customer.address1, customer.address2, customer.address3, customer.address4]
      .filter(Boolean)
      .join('\n');
  }

  private async updateStockForDO(salesId: number, direction: 'IN' | 'OUT') {
    // TODO: Implement stock update logic
  }

  private async createARInvoice(salesDoc: any) {
    const invoiceNo = await this.documentService.getNextNumber('AR_INVOICE');

    return prisma.aRInvoice.create({
      data: {
        invoiceNo,
        invoiceDate: salesDoc.documentDate,
        dueDate: salesDoc.dueDate,
        customerId: salesDoc.customerId,
        customerCode: salesDoc.customerCode,
        customerName: salesDoc.customerName,
        subTotal: salesDoc.subTotal,
        discountAmount: salesDoc.discountAmount,
        taxAmount: salesDoc.taxAmount,
        netTotal: salesDoc.netTotal,
        outstandingAmount: salesDoc.netTotal,
        currencyCode: salesDoc.currencyCode,
        exchangeRate: salesDoc.exchangeRate,
        sourceType: 'SALES_INVOICE',
        sourceId: salesDoc.id,
        createdBy: salesDoc.createdBy,
      },
    });
  }

  // Required abstract methods
  list = this.listInvoices;
  getById = this.getInvoice;
  create = this.createInvoice;
  update = this.updateInvoice;
  delete = this.deleteInvoice;
}
