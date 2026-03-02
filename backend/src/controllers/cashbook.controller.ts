import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export class CashBookController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const search = req.query.search as string | undefined;
      const type = req.query.type as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const where: any = {};
      if (type && type !== 'all') where.transactionType = type;
      if (dateFrom || dateTo) {
        where.documentDate = {};
        if (dateFrom) where.documentDate.gte = dateFrom;
        if (dateTo) where.documentDate.lte = dateTo;
      }
      if (search) {
        where.OR = [
          { documentNo: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { vendorName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.cashBookEntry.findMany({
          where,
          include: { paymentMethod: { select: { name: true } } },
          orderBy: { documentDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.cashBookEntry.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          items: items.map((e) => ({
            ...e,
            amount: Number(e.amount),
            bankChargeAmount: Number(e.bankChargeAmount),
            amountLocal: Number(e.amountLocal),
            exchangeRate: Number(e.exchangeRate),
          })),
          total, page, pageSize,
        },
      });
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await prisma.cashBookEntry.findUnique({
        where: { id },
        include: {
          paymentMethod: true,
          customer: { select: { id: true, code: true, name: true } },
          vendor: { select: { id: true, code: true, name: true } },
          knockoffs: true,
        },
      });
      if (!entry) return res.status(404).json({ success: false, error: { message: 'Not found' } });
      res.json({ success: true, data: entry });
    } catch (error) { next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await prisma.cashBookEntry.create({ data: req.body });
      res.status(201).json({ success: true, data: entry });
    } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await prisma.cashBookEntry.update({ where: { id }, data: req.body });
      res.json({ success: true, data: entry });
    } catch (error) { next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await prisma.cashBookEntry.delete({ where: { id } });
      res.json({ success: true, message: 'Deleted' });
    } catch (error) { next(error); }
  };
}
