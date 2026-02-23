import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class ProductController extends BaseController<any> {
  protected modelName = 'Product';

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const orderBy = this.getSorting(req, 'code', 'asc');

      const where: Prisma.ProductWhereInput = {
        isActive: req.query.includeInactive === 'true' ? undefined : true,
      };

      if (req.query.search) {
        const search = req.query.search as string;
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search } },
        ];
      }

      if (req.query.groupId) where.groupId = parseInt(req.query.groupId as string);
      if (req.query.typeId) where.typeId = parseInt(req.query.typeId as string);

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where, skip, take, orderBy,
          include: { group: true, type: true, baseUOM: true },
        }),
        prisma.product.count({ where }),
      ]);

      this.paginatedResponse(res, products, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { code: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { barcode: { equals: query } },
          ],
        },
        take: limit,
        orderBy: { code: 'asc' },
        select: {
          id: true, code: true, description: true, barcode: true,
          sellingPrice1: true, standardCost: true,
          baseUOM: { select: { code: true } },
        },
      });

      this.successResponse(res, products);
    } catch (error) {
      next(error);
    }
  };

  lookup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = req.query.code as string;
      if (!code) throw BadRequestError('Product code is required');

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { code: { equals: code, mode: 'insensitive' } },
            { barcode: { equals: code } },
          ],
          isActive: true,
        },
        include: {
          group: true, type: true, baseUOM: true,
          productUOMs: { include: { uom: true } },
          productLocations: { include: { location: true } },
        },
      });

      if (!product) throw NotFoundError(`Product not found: ${code}`);
      this.successResponse(res, product);
    } catch (error) {
      next(error);
    }
  };

  getByBarcode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const barcode = req.params.barcode;

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { barcode: barcode },
            { barcode2: barcode },
            { barcode3: barcode },
            { productUOMs: { some: { barcode: barcode } } },
          ],
          isActive: true,
        },
        include: { group: true, baseUOM: true, productUOMs: { include: { uom: true } } },
      });

      if (!product) throw NotFoundError(`Product not found for barcode: ${barcode}`);
      this.successResponse(res, product);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          group: true, type: true, baseUOM: true,
          productUOMs: { include: { uom: true } },
          productLocations: { include: { location: true } },
        },
      });

      if (!product) this.notFound(id);
      this.successResponse(res, product);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      this.validateRequired(data, ['code']);

      // Auto-fill description from name if not provided
      if (!data.description && data.name) {
        data.description = data.name;
      }
      if (!data.description) {
        throw BadRequestError('Product name or description is required');
      }

      // Auto-resolve baseUOMId from uomCode if not provided
      if (!data.baseUOMId && data.uomCode) {
        const uom = await prisma.uOM.findUnique({ where: { code: data.uomCode } });
        if (uom) {
          data.baseUOMId = uom.id;
        }
      }
      if (!data.baseUOMId) {
        // Default to PCS if available
        const defaultUOM = await prisma.uOM.findFirst({ where: { code: 'PCS' } });
        if (defaultUOM) {
          data.baseUOMId = defaultUOM.id;
        } else {
          throw BadRequestError('UOM is required. Please create UOMs first or specify uomCode/baseUOMId.');
        }
      }

      const existing = await prisma.product.findUnique({ where: { code: data.code.toUpperCase() } });
      if (existing) throw ConflictError(`Product code ${data.code} already exists`);

      const product = await prisma.product.create({
        data: {
          code: data.code.toUpperCase(),
          description: data.description,
          description2: data.description2,
          groupId: data.groupId,
          typeId: data.typeId,
          baseUOMId: data.baseUOMId,
          costingMethod: data.costingMethod || 'WEIGHTED_AVG',
          standardCost: data.standardCost || 0,
          sellingPrice1: data.sellingPrice1 || 0,
          sellingPrice2: data.sellingPrice2 || 0,
          sellingPrice3: data.sellingPrice3 || 0,
          sellingPrice4: data.sellingPrice4 || 0,
          sellingPrice5: data.sellingPrice5 || 0,
          sellingPrice6: data.sellingPrice6 || 0,
          minSellingPrice: data.minSellingPrice || 0,
          reorderLevel: data.reorderLevel || 0,
          reorderQty: data.reorderQty || 0,
          hasBatchNo: data.hasBatchNo || false,
          hasSerialNo: data.hasSerialNo || false,
          hasExpiryDate: data.hasExpiryDate || false,
          salesTaxCode: data.salesTaxCode,
          purchaseTaxCode: data.purchaseTaxCode,
          barcode: data.barcode,
          barcode2: data.barcode2,
          barcode3: data.barcode3,
          imagePath: data.imagePath,
          notes: data.notes,
          createdBy: req.user?.userId,
        },
        include: { group: true, type: true, baseUOM: true },
      });

      // Create base UOM entry
      await prisma.productUOM.create({
        data: {
          productId: product.id,
          uomId: data.baseUOMId,
          conversionRate: 1,
          isBaseUOM: true,
        },
      });

      this.createdResponse(res, product);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      if (data.code && data.code.toUpperCase() !== existing!.code) {
        const duplicate = await prisma.product.findUnique({ where: { code: data.code.toUpperCase() } });
        if (duplicate) throw ConflictError(`Product code ${data.code} already exists`);
      }

      const product = await prisma.product.update({
        where: { id },
        data: {
          ...data,
          code: data.code?.toUpperCase(),
          modifiedBy: req.user?.userId,
        },
        include: { group: true, type: true, baseUOM: true },
      });

      this.successResponse(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      // Check for related transactions (sales, purchases, stock movements)
      const [salesCount, purchaseCount, stockMoveCount] = await Promise.all([
        prisma.salesDetail.count({ where: { productId: id } }),
        prisma.purchaseDetail.count({ where: { productId: id } }),
        prisma.stockMovement.count({ where: { productId: id } }),
      ]);

      const totalTransactions = salesCount + purchaseCount + stockMoveCount;

      if (totalTransactions > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'HAS_TRANSACTIONS',
            message: `Cannot delete product "${existing!.code}" - has ${totalTransactions} transaction(s). Deactivate instead.`,
          },
        });
      }

      // Safe to hard delete
      await prisma.productUOM.deleteMany({ where: { productId: id } });
      await prisma.productLocation.deleteMany({ where: { productId: id } });
      await prisma.product.delete({ where: { id } });
      this.deletedResponse(res);
    } catch (error) {
      next(error);
    }
  };

  getStockBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);

      const balances = await prisma.productLocation.findMany({
        where: { productId },
        include: { location: true, product: { select: { code: true, description: true } } },
      });

      const totalQty = balances.reduce((sum, b) => sum + Number(b.balanceQty), 0);

      this.successResponse(res, { productId, totalQty, locations: balances });
    } catch (error) {
      next(error);
    }
  };

  getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const { skip, take, page, pageSize } = this.getPagination(req);
      const dateRange = this.getDateRange(req, 'transaction.transactionDate');

      const where: any = { productId };

      const [movements, total] = await Promise.all([
        prisma.stockTransactionDetail.findMany({
          where,
          skip, take,
          orderBy: { transaction: { transactionDate: 'desc' } },
          include: {
            transaction: {
              select: { transactionType: true, transactionNo: true, transactionDate: true },
            },
          },
        }),
        prisma.stockTransactionDetail.count({ where }),
      ]);

      this.paginatedResponse(res, movements, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getPricing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          code: true, description: true, standardCost: true, averageCost: true, lastPurchaseCost: true,
          sellingPrice1: true, sellingPrice2: true, sellingPrice3: true,
          sellingPrice4: true, sellingPrice5: true, sellingPrice6: true,
          minSellingPrice: true,
        },
      });

      if (!product) this.notFound(productId);
      this.successResponse(res, product);
    } catch (error) {
      next(error);
    }
  };

  updatePricing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);
      const data = req.body;

      const product = await prisma.product.update({
        where: { id: productId },
        data: {
          sellingPrice1: data.sellingPrice1,
          sellingPrice2: data.sellingPrice2,
          sellingPrice3: data.sellingPrice3,
          sellingPrice4: data.sellingPrice4,
          sellingPrice5: data.sellingPrice5,
          sellingPrice6: data.sellingPrice6,
          minSellingPrice: data.minSellingPrice,
          modifiedBy: req.user?.userId,
        },
      });

      this.successResponse(res, product, 'Pricing updated successfully');
    } catch (error) {
      next(error);
    }
  };

  getBOM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.params.id);

      const bom = await prisma.bOM.findMany({
        where: { parentProductId: productId },
        include: {
          componentProduct: {
            select: { code: true, description: true, standardCost: true },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      this.successResponse(res, bom);
    } catch (error) {
      next(error);
    }
  };

  listGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await prisma.productGroup.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
      this.successResponse(res, groups);
    } catch (error) {
      next(error);
    }
  };

  listTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = await prisma.productType.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });
      this.successResponse(res, types);
    } catch (error) {
      next(error);
    }
  };
}
