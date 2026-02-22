import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class VendorController extends BaseController<any> {
  protected modelName = 'Vendor';

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const orderBy = this.getSorting(req, 'code', 'asc');

      const where: Prisma.VendorWhereInput = {
        isActive: req.query.includeInactive === 'true' ? undefined : true,
      };

      if (req.query.search) {
        const search = req.query.search as string;
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
          where, skip, take, orderBy,
          include: { currency: true, purchaseAgent: true },
        }),
        prisma.vendor.count({ where }),
      ]);

      this.paginatedResponse(res, vendors, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const vendors = await prisma.vendor.findMany({
        where: {
          isActive: true,
          OR: [
            { code: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true, currencyCode: true, creditTermDays: true },
      });

      this.successResponse(res, vendors);
    } catch (error) {
      next(error);
    }
  };

  lookup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = req.query.code as string;
      if (!code) throw BadRequestError('Vendor code is required');

      const vendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { code: { equals: code, mode: 'insensitive' } },
            { code: { startsWith: code, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        include: { currency: true, purchaseAgent: true },
      });

      if (!vendor) throw NotFoundError(`Vendor not found: ${code}`);
      this.successResponse(res, vendor);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: { currency: true, purchaseAgent: true, controlAccount: true },
      });

      if (!vendor) this.notFound(id);
      this.successResponse(res, vendor);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      this.validateRequired(data, ['code', 'name']);

      // Auto-assign AP Control account if not provided
      if (!data.controlAccountId) {
        const apControl = await prisma.account.findFirst({
          where: { specialType: 'AP_CONTROL' }
        });
        if (apControl) {
          data.controlAccountId = apControl.id;
        } else {
          throw BadRequestError('No AP Control account found. Please create one in Chart of Accounts first.');
        }
      }

      const existing = await prisma.vendor.findUnique({ where: { code: data.code.toUpperCase() } });
      if (existing) throw ConflictError(`Vendor code ${data.code} already exists`);

      const vendor = await prisma.vendor.create({
        data: {
          code: data.code.toUpperCase(),
          name: data.name,
          name2: data.name2,
          controlAccountId: data.controlAccountId,
          address1: data.address1,
          address2: data.address2,
          address3: data.address3,
          address4: data.address4,
          postcode: data.postcode,
          city: data.city,
          state: data.state,
          country: data.country || 'Malaysia',
          contactPerson: data.contactPerson,
          phone: data.phone,
          phone2: data.phone2,
          mobile: data.mobile,
          fax: data.fax,
          email: data.email,
          website: data.website,
          businessRegNo: data.businessRegNo,
          taxRegNo: data.taxRegNo,
          currencyCode: data.currencyCode || 'MYR',
          creditTermDays: data.creditTermDays || 0,
          purchaseAgentId: data.purchaseAgentId,
          taxCode: data.taxCode,
          bankName: data.bankName,
          bankAccountNo: data.bankAccountNo,
          bankBranch: data.bankBranch,
          notes: data.notes,
          openingBalance: data.openingBalance || 0,
          openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : null,
          createdBy: req.user?.userId,
        },
        include: { currency: true, purchaseAgent: true },
      });

      this.createdResponse(res, vendor);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const existing = await prisma.vendor.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      if (data.code && data.code.toUpperCase() !== existing!.code) {
        const duplicate = await prisma.vendor.findUnique({ where: { code: data.code.toUpperCase() } });
        if (duplicate) throw ConflictError(`Vendor code ${data.code} already exists`);
      }

      const vendor = await prisma.vendor.update({
        where: { id },
        data: {
          ...data,
          code: data.code?.toUpperCase(),
          modifiedBy: req.user?.userId,
        },
        include: { currency: true, purchaseAgent: true },
      });

      this.successResponse(res, vendor, 'Vendor updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.vendor.findUnique({ where: { id } });
      if (!existing) this.notFound(id);

      const hasTransactions = await prisma.purchaseHeader.findFirst({ where: { vendorId: id } });

      if (hasTransactions) {
        await prisma.vendor.update({ where: { id }, data: { isActive: false } });
        this.successResponse(res, null, 'Vendor deactivated (has transactions)');
      } else {
        await prisma.vendor.delete({ where: { id } });
        this.deletedResponse(res);
      }
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = parseInt(req.params.id);
      const { skip, take, page, pageSize } = this.getPagination(req);

      const [transactions, total] = await Promise.all([
        prisma.purchaseHeader.findMany({
          where: { vendorId },
          skip, take,
          orderBy: { documentDate: 'desc' },
          select: { id: true, documentType: true, documentNo: true, documentDate: true, netTotal: true, status: true },
        }),
        prisma.purchaseHeader.count({ where: { vendorId } }),
      ]);

      this.paginatedResponse(res, transactions, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  getAging = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = parseInt(req.params.id);
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

      const invoices = await prisma.aPInvoice.findMany({
        where: { vendorId, status: 'OPEN', isVoid: false },
        select: { invoiceNo: true, invoiceDate: true, dueDate: true, netTotal: true, outstandingAmount: true },
      });

      const aging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 };

      invoices.forEach(inv => {
        const dueDate = inv.dueDate || inv.invoiceDate;
        const daysDue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = Number(inv.outstandingAmount);

        if (daysDue <= 0) aging.current += amount;
        else if (daysDue <= 30) aging.days1to30 += amount;
        else if (daysDue <= 60) aging.days31to60 += amount;
        else if (daysDue <= 90) aging.days61to90 += amount;
        else aging.over90 += amount;
        aging.total += amount;
      });

      this.successResponse(res, { vendorId, asOfDate, aging, invoices });
    } catch (error) {
      next(error);
    }
  };

  getStatement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = parseInt(req.params.id);
      const dateFrom = new Date(req.query.dateFrom as string || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
      const dateTo = new Date(req.query.dateTo as string || new Date());

      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { code: true, name: true, address1: true },
      });
      if (!vendor) this.notFound(vendorId);

      const invoices = await prisma.aPInvoice.findMany({
        where: { vendorId, invoiceDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        orderBy: { invoiceDate: 'asc' },
      });

      const payments = await prisma.aPPayment.findMany({
        where: { vendorId, paymentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        orderBy: { paymentDate: 'asc' },
      });

      const transactions = [
        ...invoices.map(i => ({ date: i.invoiceDate, type: 'INVOICE', documentNo: i.invoiceNo, debit: Number(i.netTotal), credit: 0 })),
        ...payments.map(p => ({ date: p.paymentDate, type: 'PAYMENT', documentNo: p.paymentNo, debit: 0, credit: Number(p.paymentAmount) })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      let balance = 0;
      const statement = transactions.map(t => {
        balance += t.debit - t.credit;
        return { ...t, balance };
      });

      this.successResponse(res, { vendor, dateFrom, dateTo, transactions: statement, balance });
    } catch (error) {
      next(error);
    }
  };
}
