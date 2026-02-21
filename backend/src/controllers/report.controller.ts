import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { stubHandler } from './base.controller';

export class ReportController {
  // GL Reports
  trialBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

      const accounts = await prisma.account.findMany({
        where: { isActive: true, isParent: false },
        include: { type: true },
        orderBy: { accountNo: 'asc' },
      });

      const data = await Promise.all(accounts.map(async (acc) => {
        const result = await prisma.journalEntryDetail.aggregate({
          where: { accountId: acc.id, journal: { journalDate: { lte: asOfDate }, isVoid: false } },
          _sum: { debitAmount: true, creditAmount: true },
        });

        const debit = Number(result._sum.debitAmount || 0);
        const credit = Number(result._sum.creditAmount || 0);
        const opening = Number(acc.openingBalance || 0);
        const isDebitNormal = acc.type.normalBalance === 'D';
        const balance = isDebitNormal ? opening + debit - credit : opening + credit - debit;

        if (balance === 0) return null;

        return {
          accountNo: acc.accountNo,
          accountName: acc.name,
          category: acc.type.category,
          debit: balance > 0 && isDebitNormal ? balance : 0,
          credit: balance > 0 && !isDebitNormal ? balance : 0,
        };
      }));

      const rows = data.filter(Boolean);
      const totals = rows.reduce((acc, r: any) => ({
        debit: acc.debit + r.debit,
        credit: acc.credit + r.credit,
      }), { debit: 0, credit: 0 });

      res.json({ success: true, data: { asOfDate, accounts: rows, totals } });
    } catch (error) {
      next(error);
    }
  };

  profitLoss = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = new Date(req.query.dateFrom as string || new Date(new Date().getFullYear(), 0, 1));
      const dateTo = new Date(req.query.dateTo as string || new Date());

      const accounts = await prisma.account.findMany({
        where: { isActive: true, isParent: false, type: { category: { in: ['REVENUE', 'EXPENSE'] } } },
        include: { type: true },
        orderBy: { accountNo: 'asc' },
      });

      let totalRevenue = 0, totalExpense = 0;

      const data = await Promise.all(accounts.map(async (acc) => {
        const result = await prisma.journalEntryDetail.aggregate({
          where: {
            accountId: acc.id,
            journal: { journalDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
          },
          _sum: { debitAmount: true, creditAmount: true },
        });

        const debit = Number(result._sum.debitAmount || 0);
        const credit = Number(result._sum.creditAmount || 0);
        const amount = acc.type.category === 'REVENUE' ? credit - debit : debit - credit;

        if (acc.type.category === 'REVENUE') totalRevenue += amount;
        else totalExpense += amount;

        return { accountNo: acc.accountNo, accountName: acc.name, category: acc.type.category, amount };
      }));

      res.json({
        success: true,
        data: {
          dateFrom, dateTo,
          revenue: data.filter(d => d.category === 'REVENUE'),
          expenses: data.filter(d => d.category === 'EXPENSE'),
          totalRevenue,
          totalExpense,
          netProfit: totalRevenue - totalExpense,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  balanceSheet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate as string) : new Date();

      const accounts = await prisma.account.findMany({
        where: { isActive: true, isParent: false, type: { category: { in: ['ASSET', 'LIABILITY', 'EQUITY'] } } },
        include: { type: true },
        orderBy: { accountNo: 'asc' },
      });

      let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

      const data = await Promise.all(accounts.map(async (acc) => {
        const result = await prisma.journalEntryDetail.aggregate({
          where: { accountId: acc.id, journal: { journalDate: { lte: asOfDate }, isVoid: false } },
          _sum: { debitAmount: true, creditAmount: true },
        });

        const debit = Number(result._sum.debitAmount || 0);
        const credit = Number(result._sum.creditAmount || 0);
        const opening = Number(acc.openingBalance || 0);
        const isDebitNormal = acc.type.normalBalance === 'D';
        const balance = isDebitNormal ? opening + debit - credit : opening + credit - debit;

        if (acc.type.category === 'ASSET') totalAssets += balance;
        else if (acc.type.category === 'LIABILITY') totalLiabilities += balance;
        else totalEquity += balance;

        return { accountNo: acc.accountNo, accountName: acc.name, category: acc.type.category, balance };
      }));

      res.json({
        success: true,
        data: {
          asOfDate,
          assets: data.filter(d => d.category === 'ASSET'),
          liabilities: data.filter(d => d.category === 'LIABILITY'),
          equity: data.filter(d => d.category === 'EQUITY'),
          totalAssets,
          totalLiabilities,
          totalEquity,
          totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  ledgerListing = stubHandler('Ledger Listing');
  journalListing = stubHandler('Journal Listing');

  // AR Reports
  customerListing = stubHandler('Customer Listing');
  customerAging = stubHandler('Customer Aging');
  customerStatement = stubHandler('Customer Statement');
  arInvoiceListing = stubHandler('AR Invoice Listing');
  arPaymentListing = stubHandler('AR Payment Listing');

  // AP Reports
  vendorListing = stubHandler('Vendor Listing');
  vendorAging = stubHandler('Vendor Aging');
  vendorStatement = stubHandler('Vendor Statement');
  apInvoiceListing = stubHandler('AP Invoice Listing');
  apPaymentListing = stubHandler('AP Payment Listing');

  // Sales Reports
  salesListing = stubHandler('Sales Listing');
  salesByCustomer = stubHandler('Sales By Customer');
  salesByProduct = stubHandler('Sales By Product');
  salesByAgent = stubHandler('Sales By Agent');
  outstandingDO = stubHandler('Outstanding DO');
  outstandingSO = stubHandler('Outstanding SO');

  // Purchase Reports
  purchaseListing = stubHandler('Purchase Listing');
  purchaseByVendor = stubHandler('Purchase By Vendor');
  purchaseByProduct = stubHandler('Purchase By Product');
  outstandingPO = stubHandler('Outstanding PO');

  // Stock Reports
  stockBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;

      const balances = await prisma.productLocation.findMany({
        where: locationId ? { locationId } : { balanceQty: { not: 0 } },
        include: {
          product: { select: { code: true, description: true, averageCost: true } },
          location: { select: { code: true, name: true } },
        },
        orderBy: { product: { code: 'asc' } },
      });

      const data = balances.map(b => ({
        productCode: b.product.code,
        description: b.product.description,
        location: b.location.name,
        quantity: Number(b.balanceQty),
        unitCost: Number(b.product.averageCost),
        totalValue: Number(b.balanceQty) * Number(b.product.averageCost),
      }));

      const totalValue = data.reduce((sum, d) => sum + d.totalValue, 0);

      res.json({ success: true, data: { items: data, totalValue } });
    } catch (error) {
      next(error);
    }
  };

  stockCard = stubHandler('Stock Card');
  stockMovement = stubHandler('Stock Movement');
  stockValuation = stubHandler('Stock Valuation');
  reorderAdvisory = stubHandler('Reorder Advisory');
  slowMovingStock = stubHandler('Slow Moving Stock');

  // Tax Reports
  sstReport = stubHandler('SST Report');

  // Export
  exportReport = stubHandler('Export Report');
}
