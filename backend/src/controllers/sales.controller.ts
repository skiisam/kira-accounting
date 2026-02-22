import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { DocumentService } from '../services/document.service';

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
      this.successResponse(res, doc);
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

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };
  updateInvoice = this.updateQuotation;
  deleteInvoice = this.deleteQuotation;

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

  voidDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      await prisma.salesHeader.update({
        where: { id },
        data: { isVoid: true, status: 'VOID' },
      });

      this.successResponse(res, null, 'Document voided');
    } catch (error) {
      next(error);
    }
  };

  printDocument = stubHandler('Print document');

  // ==================== HELPERS ====================

  private async createSalesDocument(
    documentType: string,
    documentNo: string,
    data: any,
    customer: any,
    userId?: number
  ) {
    const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

    return prisma.salesHeader.create({
      data: {
        documentType,
        documentNo,
        documentDate: new Date(data.documentDate || new Date()),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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
  }

  private async updateSalesDocument(id: number, data: any, userId?: number) {
    const { subTotal, discountAmount, taxAmount, netTotal } = this.calculateTotals(data.details);

    // Delete existing details
    await prisma.salesDetail.deleteMany({ where: { salesId: id } });

    return prisma.salesHeader.update({
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
  }

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
