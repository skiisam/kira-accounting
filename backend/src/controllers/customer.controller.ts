import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class CustomerController extends BaseController<any> {
  protected modelName = 'Customer';

  nextCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prefix = (req.query.prefix as string)?.toUpperCase();
      const width = parseInt((req.query.width as string) || '3');
      if (!prefix) throw BadRequestError('Missing prefix');

      const existing = await prisma.customer.findMany({
        where: { code: { startsWith: prefix } },
        select: { code: true },
        orderBy: { code: 'asc' },
      });

      let max = 0;
      for (const c of existing) {
        const m = c.code.match(/(\d+)$/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > max) max = num;
        }
      }
      const next = (max + 1).toString().padStart(width, '0');
      this.successResponse(res, { code: `${prefix}${next}` });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List customers with pagination and filters
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const orderBy = this.getSorting(req, 'code', 'asc');

      // Build filters
      const where: Prisma.CustomerWhereInput = {
        isActive: req.query.includeInactive === 'true' ? undefined : true,
      };

      // Search filter
      if (req.query.search) {
        const search = req.query.search as string;
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Area filter
      if (req.query.areaId) {
        where.areaId = parseInt(req.query.areaId as string);
      }

      // Sales agent filter
      if (req.query.salesAgentId) {
        where.salesAgentId = parseInt(req.query.salesAgentId as string);
      }

      // Currency filter
      if (req.query.currencyCode) {
        where.currencyCode = req.query.currencyCode as string;
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            currency: true,
            salesAgent: true,
            area: true,
          },
        }),
        prisma.customer.count({ where }),
      ]);

      this.paginatedResponse(res, customers, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search customers (for dropdown/autocomplete)
   */
  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = (req.query.q as string) || '';
      const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

      const customers = await prisma.customer.findMany({
        where: {
          isActive: true,
          OR: [
            { code: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          creditLimit: true,
          currencyCode: true,
          creditTermDays: true,
        },
      });

      this.successResponse(res, customers);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lookup customer (for smart dropdown)
   */
  lookup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = req.query.code as string;

      if (!code) {
        throw BadRequestError('Customer code is required');
      }

      const customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { code: { equals: code, mode: 'insensitive' } },
            { code: { startsWith: code, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        include: {
          currency: true,
          salesAgent: true,
          area: true,
        },
      });

      if (!customer) {
        throw NotFoundError(`Customer not found: ${code}`);
      }

      this.successResponse(res, customer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          currency: true,
          salesAgent: true,
          area: true,
          controlAccount: true,
          branches: true,
        },
      });

      if (!customer) {
        this.notFound(id);
      }

      this.successResponse(res, customer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create customer
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;

      // Validate required fields
      this.validateRequired(data, ['code', 'name']);

      // Auto-assign AR Control account if not provided
      if (!data.controlAccountId) {
        const arControl = await prisma.account.findFirst({
          where: { specialType: 'AR_CONTROL' }
        });
        if (arControl) {
          data.controlAccountId = arControl.id;
        } else {
          throw BadRequestError('No AR Control account found. Please create one in Chart of Accounts first.');
        }
      }

      // Check for duplicate code
      const existing = await prisma.customer.findUnique({
        where: { code: data.code.toUpperCase() },
      });

      if (existing) {
        throw ConflictError(`Customer code ${data.code} already exists`);
      }

      const customer = await prisma.customer.create({
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
          deliverAddress1: data.deliverAddress1,
          deliverAddress2: data.deliverAddress2,
          deliverAddress3: data.deliverAddress3,
          deliverAddress4: data.deliverAddress4,
          contactPerson: data.contactPerson,
          phone: data.phone,
          phone2: data.phone2,
          mobile: data.mobile,
          fax: data.fax,
          email: data.email,
          website: data.website,
          businessRegNo: data.businessRegNo,
          taxRegNo: data.taxRegNo,
          taxExemptNo: data.taxExemptNo,
          currencyCode: data.currencyCode || 'MYR',
          creditTermDays: data.creditTermDays || 0,
          creditLimit: data.creditLimit || 0,
          overdueLimit: data.overdueLimit || 0,
          salesAgentId: data.salesAgentId,
          areaId: data.areaId,
          pricingGroupId: data.pricingGroupId,
          taxCode: data.taxCode,
          bankName: data.bankName,
          bankAccountNo: data.bankAccountNo,
          bankBranch: data.bankBranch,
          notes: data.notes,
          openingBalance: data.openingBalance || 0,
          openingBalanceDate: data.openingBalanceDate ? new Date(data.openingBalanceDate) : null,
          createdBy: req.user?.userId,
        },
        include: {
          currency: true,
          salesAgent: true,
          area: true,
        },
      });

      this.createdResponse(res, customer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update customer
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      // Check if exists
      const existing = await prisma.customer.findUnique({
        where: { id },
      });

      if (!existing) {
        this.notFound(id);
      }

      // Check for duplicate code if changing
      if (data.code && data.code.toUpperCase() !== existing!.code) {
        const duplicate = await prisma.customer.findUnique({
          where: { code: data.code.toUpperCase() },
        });
        if (duplicate) {
          throw ConflictError(`Customer code ${data.code} already exists`);
        }
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          code: data.code?.toUpperCase(),
          name: data.name,
          name2: data.name2,
          address1: data.address1,
          address2: data.address2,
          address3: data.address3,
          address4: data.address4,
          postcode: data.postcode,
          city: data.city,
          state: data.state,
          country: data.country,
          deliverAddress1: data.deliverAddress1,
          deliverAddress2: data.deliverAddress2,
          deliverAddress3: data.deliverAddress3,
          deliverAddress4: data.deliverAddress4,
          contactPerson: data.contactPerson,
          phone: data.phone,
          phone2: data.phone2,
          mobile: data.mobile,
          fax: data.fax,
          email: data.email,
          website: data.website,
          businessRegNo: data.businessRegNo,
          taxRegNo: data.taxRegNo,
          taxExemptNo: data.taxExemptNo,
          currencyCode: data.currencyCode,
          creditTermDays: data.creditTermDays,
          creditLimit: data.creditLimit,
          overdueLimit: data.overdueLimit,
          salesAgentId: data.salesAgentId,
          areaId: data.areaId,
          pricingGroupId: data.pricingGroupId,
          taxCode: data.taxCode,
          bankName: data.bankName,
          bankAccountNo: data.bankAccountNo,
          bankBranch: data.bankBranch,
          notes: data.notes,
          isActive: data.isActive,
          modifiedBy: req.user?.userId,
        },
        include: {
          currency: true,
          salesAgent: true,
          area: true,
        },
      });

      this.successResponse(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete customer (with transaction check)
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);

      // Check if exists
      const existing = await prisma.customer.findUnique({
        where: { id },
      });

      if (!existing) {
        this.notFound(id);
      }

      // Check for related transactions (sales, AR invoices, payments)
      const [salesCount, arInvoiceCount] = await Promise.all([
        prisma.salesHeader.count({ where: { customerId: id } }),
        prisma.aRInvoice.count({ where: { customerId: id } }),
      ]);

      const totalTransactions = salesCount + arInvoiceCount;

      if (totalTransactions > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'HAS_TRANSACTIONS',
            message: `Cannot delete customer "${existing!.code}" - has ${totalTransactions} transaction(s). Deactivate instead.`,
          },
        });
        return;
      }

      // Safe to hard delete
      await prisma.customer.delete({
        where: { id },
      });
      this.deletedResponse(res);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer branches
   */
  getBranches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.params.id);

      const branches = await prisma.customerBranch.findMany({
        where: { customerId, isActive: true },
        orderBy: { branchCode: 'asc' },
      });

      this.successResponse(res, branches);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer transactions
   */
  getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.params.id);
      const { skip, take, page, pageSize } = this.getPagination(req);
      const dateRange = this.getDateRange(req, 'documentDate');

      const where: any = { customerId };
      if (dateRange) Object.assign(where, dateRange);

      const [transactions, total] = await Promise.all([
        prisma.salesHeader.findMany({
          where,
          skip,
          take,
          orderBy: { documentDate: 'desc' },
          select: {
            id: true,
            documentType: true,
            documentNo: true,
            documentDate: true,
            netTotal: true,
            status: true,
          },
        }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, transactions, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer aging
   */
  getAging = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.params.id);
      const asOfDate = req.query.asOfDate 
        ? new Date(req.query.asOfDate as string)
        : new Date();

      // Get outstanding invoices
      const invoices = await prisma.aRInvoice.findMany({
        where: {
          customerId,
          status: 'OPEN',
          isVoid: false,
        },
        select: {
          invoiceNo: true,
          invoiceDate: true,
          dueDate: true,
          netTotal: true,
          outstandingAmount: true,
        },
      });

      // Calculate aging buckets
      const aging = {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        total: 0,
      };

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

      this.successResponse(res, {
        customerId,
        asOfDate,
        aging,
        invoices,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer statement
   */
  getStatement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.params.id);
      const dateFrom = new Date(req.query.dateFrom as string || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
      const dateTo = new Date(req.query.dateTo as string || new Date());

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { code: true, name: true, address1: true, address2: true },
      });

      if (!customer) {
        this.notFound(customerId);
      }

      // Get all AR transactions
      const invoices = await prisma.aRInvoice.findMany({
        where: {
          customerId,
          invoiceDate: { gte: dateFrom, lte: dateTo },
          isVoid: false,
        },
        orderBy: { invoiceDate: 'asc' },
      });

      const payments = await prisma.aRPayment.findMany({
        where: {
          customerId,
          paymentDate: { gte: dateFrom, lte: dateTo },
          isVoid: false,
        },
        orderBy: { paymentDate: 'asc' },
      });

      // Merge and sort
      const transactions = [
        ...invoices.map(i => ({
          date: i.invoiceDate,
          type: 'INVOICE',
          documentNo: i.invoiceNo,
          reference: i.reference,
          debit: Number(i.netTotal),
          credit: 0,
        })),
        ...payments.map(p => ({
          date: p.paymentDate,
          type: 'PAYMENT',
          documentNo: p.paymentNo,
          reference: p.reference,
          debit: 0,
          credit: Number(p.paymentAmount),
        })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let balance = 0;
      const statement = transactions.map(t => {
        balance += t.debit - t.credit;
        return { ...t, balance };
      });

      this.successResponse(res, {
        customer,
        dateFrom,
        dateTo,
        transactions: statement,
        totals: {
          debit: statement.reduce((sum, t) => sum + t.debit, 0),
          credit: statement.reduce((sum, t) => sum + t.credit, 0),
          balance,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
