import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController, stubHandler } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import { DocumentService } from '../services/document.service';

export class StockController extends BaseController<any> {
  protected modelName = 'Stock';
  private documentService = new DocumentService();

  // Stock Receive
  listReceive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where = { transactionType: 'RECEIVE', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.stockTransaction.findMany({ where, skip, take, orderBy: { transactionDate: 'desc' } }),
        prisma.stockTransaction.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getReceive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.stockTransaction.findFirst({
        where: { id, transactionType: 'RECEIVE' },
        include: { details: { include: { product: true }, orderBy: { lineNo: 'asc' } } },
      });
      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createReceive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      this.validateRequired(data, ['details']);

      const transactionNo = await this.documentService.getNextNumber('STOCK_RECEIVE');
      const doc = await this.createStockTransaction('RECEIVE', transactionNo, data, req.user?.userId);

      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateReceive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Update Stock Receive coming soon' } });
    } catch (error) { next(error); }
  };
  deleteReceive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Delete Stock Receive coming soon' } });
    } catch (error) { next(error); }
  };

  // Stock Issue
  listIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where = { transactionType: 'ISSUE', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.stockTransaction.findMany({ where, skip, take, orderBy: { transactionDate: 'desc' } }),
        prisma.stockTransaction.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const doc = await prisma.stockTransaction.findFirst({
        where: { id, transactionType: 'ISSUE' },
        include: { details: { include: { product: true } } },
      });
      if (!doc) this.notFound(id);
      this.successResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  createIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const transactionNo = await this.documentService.getNextNumber('STOCK_ISSUE');
      const doc = await this.createStockTransaction('ISSUE', transactionNo, data, req.user?.userId);
      this.createdResponse(res, doc);
    } catch (error) {
      next(error);
    }
  };

  updateIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Update Stock Issue coming soon' } });
    } catch (error) { next(error); }
  };
  deleteIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Delete Stock Issue coming soon' } });
    } catch (error) { next(error); }
  };

  // Stock Transfer
  listTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where = { transactionType: 'TRANSFER', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.stockTransaction.findMany({ where, skip, take, orderBy: { transactionDate: 'desc' } }),
        prisma.stockTransaction.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Get Stock Transfer coming soon' } });
    } catch (error) { next(error); }
  };
  createTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Create Stock Transfer coming soon' } });
    } catch (error) { next(error); }
  };
  updateTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Update Stock Transfer coming soon' } });
    } catch (error) { next(error); }
  };
  deleteTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Delete Stock Transfer coming soon' } });
    } catch (error) { next(error); }
  };

  // Stock Adjustment
  listAdjustment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const where = { transactionType: 'ADJUSTMENT', isVoid: false };

      const [documents, total] = await Promise.all([
        prisma.stockTransaction.findMany({ where, skip, take, orderBy: { transactionDate: 'desc' } }),
        prisma.stockTransaction.count({ where }),
      ]);

      this.paginatedResponse(res, documents, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getAdjustment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Get Stock Adjustment coming soon' } });
    } catch (error) { next(error); }
  };
  createAdjustment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Create Stock Adjustment coming soon' } });
    } catch (error) { next(error); }
  };
  updateAdjustment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Update Stock Adjustment coming soon' } });
    } catch (error) { next(error); }
  };
  deleteAdjustment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Delete Stock Adjustment coming soon' } });
    } catch (error) { next(error); }
  };

  // Stock Take
  listStockTake = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'List Stock Take coming soon' } });
    } catch (error) { next(error); }
  };
  createStockTake = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Create Stock Take coming soon' } });
    } catch (error) { next(error); }
  };
  finalizeStockTake = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Finalize Stock Take coming soon' } });
    } catch (error) { next(error); }
  };

  // Assembly
  listAssembly = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'List Assembly coming soon' } });
    } catch (error) { next(error); }
  };
  createAssembly = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Create Assembly coming soon' } });
    } catch (error) { next(error); }
  };
  createDisassembly = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Create Disassembly coming soon' } });
    } catch (error) { next(error); }
  };

  // Queries
  getStockBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;

      const balances = await prisma.productLocation.findMany({
        where: locationId ? { locationId } : undefined,
        include: {
          product: { select: { code: true, description: true } },
          location: { select: { code: true, name: true } },
        },
        orderBy: { product: { code: 'asc' } },
      });

      this.successResponse(res, balances);
    } catch (error) {
      next(error);
    }
  };

  getProductBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);

      const balances = await prisma.productLocation.findMany({
        where: { productId },
        include: { location: true },
      });

      const total = balances.reduce((sum, b) => sum + Number(b.balanceQty), 0);
      this.successResponse(res, { productId, total, locations: balances });
    } catch (error) {
      next(error);
    }
  };

  getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      const movements = await prisma.stockTransaction.findMany({
        where: { productId },
        include: { location: true },
        orderBy: { transactionDate: 'desc' },
        take: 100,
      });
      res.json({ success: true, data: movements });
    } catch (error) { next(error); }
  };

  getStockCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      const { skip, take, page, pageSize } = this.getPagination(req);

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { code: true, description: true },
      });

      const [movements, total] = await Promise.all([
        prisma.stockTransactionDetail.findMany({
          where: { productId },
          skip, take,
          orderBy: { transaction: { transactionDate: 'desc' } },
          include: { transaction: { select: { transactionType: true, transactionNo: true, transactionDate: true } } },
        }),
        prisma.stockTransactionDetail.count({ where: { productId } }),
      ]);

      this.successResponse(res, {
        product,
        movements,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locations = await prisma.location.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
      this.successResponse(res, locations);
    } catch (error) {
      next(error);
    }
  };

  getLocationBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.productId);
      const balances = await prisma.productLocation.findMany({
        where: { productId },
        include: { location: true },
      });
      res.json({ success: true, data: balances });
    } catch (error) { next(error); }
  };

  private async createStockTransaction(type: string, transactionNo: string, data: any, userId?: number) {
    const totalCost = data.details.reduce((sum: number, d: any) => sum + (d.quantity * (d.unitCost || 0)), 0);

    const doc = await prisma.stockTransaction.create({
      data: {
        transactionType: type,
        transactionNo,
        transactionDate: new Date(data.transactionDate || new Date()),
        toLocationId: data.locationId,
        fromLocationId: data.fromLocationId,
        reference: data.reference,
        description: data.description,
        totalCost,
        createdBy: userId,
        details: {
          create: data.details.map((d: any, idx: number) => ({
            lineNo: idx + 1,
            productId: d.productId,
            productCode: d.productCode,
            description: d.description,
            uomId: d.uomId,
            quantity: d.quantity,
            uomRate: d.uomRate || 1,
            baseQuantity: d.quantity * (d.uomRate || 1),
            unitCost: d.unitCost || 0,
            totalCost: d.quantity * (d.unitCost || 0),
            locationId: d.locationId,
            batchNo: d.batchNo,
            serialNo: d.serialNo,
            expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
          })),
        },
      },
      include: { details: true },
    });

    // Update product location balances
    for (const detail of data.details) {
      const multiplier = type === 'ISSUE' ? -1 : 1;
      await this.updateProductLocationBalance(detail.productId, data.locationId, detail.quantity * multiplier);
    }

    return doc;
  }

  private async updateProductLocationBalance(productId: number, locationId: number, qtyChange: number) {
    await prisma.productLocation.upsert({
      where: { productId_locationId: { productId, locationId } },
      update: { balanceQty: { increment: qtyChange } },
      create: { productId, locationId, balanceQty: qtyChange },
    });
  }

  list = this.listReceive;
  getById = this.getReceive;
  create = this.createReceive;
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Update Stock coming soon' } });
    } catch (error) { next(error); }
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Delete Stock coming soon' } });
    } catch (error) { next(error); }
  };
}
