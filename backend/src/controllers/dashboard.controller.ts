// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export class DashboardController {
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [arAgg, apAgg, salesAgg, lowStockCount] = await Promise.all([
        prisma.aRInvoice.aggregate({
          _sum: { outstandingAmount: true },
          where: { isVoid: false, status: 'OPEN' },
        }),
        prisma.aPInvoice.aggregate({
          _sum: { outstandingAmount: true },
          where: { isVoid: false, status: 'OPEN' },
        }),
        prisma.aRInvoice.aggregate({
          _sum: { netTotalLocal: true },
          where: {
            isVoid: false,
            invoiceDate: { gte: startOfMonth, lt: nextMonth },
          },
        }),
        prisma.productLocation.count({
          where: {
            OR: [
              { AND: [{ reorderLevel: { not: null } }, { balanceQty: { lt: prisma.productLocation.fields.reorderLevel } }] },
              {
                AND: [
                  { reorderLevel: null },
                  {
                    product: {
                      isActive: true,
                      minStockLevel: { gt: 0 as any },
                    } as any,
                  },
                  { balanceQty: { lt: 0 as any } }, // fallback; min level check requires custom query, keep simple
                ],
              },
            ],
            product: { isActive: true },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          arOutstanding: Number(arAgg._sum.outstandingAmount || 0),
          apOutstanding: Number(apAgg._sum.outstandingAmount || 0),
          salesThisMonth: Number(salesAgg._sum.netTotalLocal || 0),
          lowStockItems: lowStockCount,
          totalLeads: 0,
          dealsValue: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getRecent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(20, parseInt((req.query.limit as string) || '10'));
      const [ar, ap] = await Promise.all([
        prisma.aRInvoice.findMany({
          take: limit,
          orderBy: { invoiceDate: 'desc' },
          select: { invoiceNo: true, invoiceDate: true, outstandingAmount: true, netTotalLocal: true, status: true },
        }),
        prisma.aPInvoice.findMany({
          take: limit,
          orderBy: { invoiceDate: 'desc' },
          select: { invoiceNo: true, invoiceDate: true, outstandingAmount: true, netTotalLocal: true, status: true },
        }),
      ]);
      const items = [
        ...ar.map(r => ({ type: 'AR_INVOICE', doc: r.invoiceNo, date: r.invoiceDate, status: r.status, amount: Number(r.netTotalLocal) })),
        ...ap.map(r => ({ type: 'AP_INVOICE', doc: r.invoiceNo, date: r.invoiceDate, status: r.status, amount: Number(r.netTotalLocal) })),
      ]
        .sort((a, b) => (b.date as any) - (a.date as any))
        .slice(0, limit);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const grouped = await prisma.salesDetail.groupBy({
        by: ['productId'],
        _sum: { baseQuantity: true },
        where: {
          productId: { not: null },
          header: {
            documentType: 'INVOICE',
            isVoid: false,
            documentDate: { gte: startOfMonth, lt: nextMonth },
          },
        },
        orderBy: { _sum: { baseQuantity: 'desc' } },
        take: 4,
      });

      const productIds = grouped.map(g => g.productId!).filter(Boolean);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, code: true, description: true },
      });
      const byId = new Map(products.map(p => [p.id, p]));

      const items = grouped.map((g, idx) => ({
        name: byId.get(g.productId!)?.description || byId.get(g.productId!)?.code || `Product ${idx + 1}`,
        sales: Number(g._sum.baseQuantity || 0),
      }));

      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  getAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date();
      const in7Days = new Date();
      in7Days.setDate(today.getDate() + 7);

      const [lowStock, overdueAR, expiringQuot] = await Promise.all([
        prisma.productLocation.count({
          where: {
            product: { isActive: true },
            reorderLevel: { not: null },
            balanceQty: { lt: prisma.productLocation.fields.reorderLevel },
          },
        }),
        prisma.aRInvoice.count({
          where: {
            isVoid: false,
            outstandingAmount: { gt: 0 as any },
            dueDate: { lt: today },
          },
        }),
        prisma.salesHeader.count({
          where: {
            isVoid: false,
            documentType: 'QUOTATION',
            dueDate: { gte: today, lte: in7Days },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          productsBelow: lowStock,
          invoicesOverdue: overdueAR,
          quotationsExpiring: expiringQuot,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  
  getEnhancedDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // Unpaid invoices
      const overdueInvoices = await prisma.aRInvoice.aggregate({
        where: { status: { not: 'PAID' }, dueDate: { lt: now } },
        _sum: { totalAmount: true }, _count: true,
      });
      const notDueInvoices = await prisma.aRInvoice.aggregate({
        where: { status: { not: 'PAID' }, dueDate: { gte: now } },
        _sum: { totalAmount: true }, _count: true,
      });

      // P&L summary
      const revenueAccounts = await prisma.journalEntryDetail.aggregate({
        where: { account: { type: { category: 'REVENUE' } }, journal: { journalDate: { gte: yearStart }, isVoid: false } },
        _sum: { creditAmount: true, debitAmount: true },
      });
      const expenseAccounts = await prisma.journalEntryDetail.aggregate({
        where: { account: { type: { category: 'EXPENSE' } }, journal: { journalDate: { gte: yearStart }, isVoid: false } },
        _sum: { debitAmount: true, creditAmount: true },
      });
      const totalRevenue = Number(revenueAccounts._sum.creditAmount || 0) - Number(revenueAccounts._sum.debitAmount || 0);
      const totalExpense = Number(expenseAccounts._sum.debitAmount || 0) - Number(expenseAccounts._sum.creditAmount || 0);

      // Bank balances
      const bankAccounts = await prisma.account.findMany({
        where: { type: { category: 'ASSET' }, name: { contains: 'bank', mode: 'insensitive' }, isActive: true },
      });
      const bankData = await Promise.all(bankAccounts.map(async (acc) => {
        const result = await prisma.journalEntryDetail.aggregate({
          where: { accountId: acc.id, journal: { isVoid: false } },
          _sum: { debitAmount: true, creditAmount: true },
        });
        return { name: acc.name, balance: Number(acc.openingBalance || 0) + Number(result._sum.debitAmount || 0) - Number(result._sum.creditAmount || 0) };
      }));

      res.json({
        success: true,
        data: {
          unpaidInvoices: {
            overdue: { count: overdueInvoices._count, amount: Number(overdueInvoices._sum.totalAmount || 0) },
            notDue: { count: notDueInvoices._count, amount: Number(notDueInvoices._sum.totalAmount || 0) },
          },
          profitLoss: { revenue: totalRevenue, expenses: totalExpense, netIncome: totalRevenue - totalExpense },
          bankAccounts: bankData,
        },
      });
    } catch (error) { next(error); }
  };
}

