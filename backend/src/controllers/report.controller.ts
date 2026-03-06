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
  customerAging = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asAtDate = req.query.asAtDate ? new Date(req.query.asAtDate as string) : new Date();
      const period = parseInt(req.query.period as string) || 30;

      const customers = await prisma.customer.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      });

      const invoices = await prisma.aRInvoice.findMany({
        where: {
          isVoid: false,
          outstandingAmount: { not: 0 },
          invoiceDate: { lte: asAtDate },
        },
        select: { customerId: true, invoiceDate: true, agingDate: true, outstandingAmount: true },
      });

      const agingData = customers.map((cust) => {
        const custInvoices = invoices.filter((inv) => inv.customerId === cust.id);
        const buckets = { current: 0, period1: 0, period2: 0, period3: 0, over: 0 };
        custInvoices.forEach((inv) => {
          const refDate = inv.agingDate || inv.invoiceDate;
          const daysOld = Math.floor((asAtDate.getTime() - new Date(refDate).getTime()) / 86400000);
          const amt = Number(inv.outstandingAmount);
          if (daysOld <= 0) buckets.current += amt;
          else if (daysOld <= period) buckets.period1 += amt;
          else if (daysOld <= period * 2) buckets.period2 += amt;
          else if (daysOld <= period * 3) buckets.period3 += amt;
          else buckets.over += amt;
        });
        const total = buckets.current + buckets.period1 + buckets.period2 + buckets.period3 + buckets.over;
        return { customerCode: cust.code, customerName: cust.name, ...buckets, total };
      }).filter((r) => r.total !== 0);

      const totals = agingData.reduce(
        (acc, r) => ({ current: acc.current + r.current, period1: acc.period1 + r.period1, period2: acc.period2 + r.period2, period3: acc.period3 + r.period3, over: acc.over + r.over, total: acc.total + r.total }),
        { current: 0, period1: 0, period2: 0, period3: 0, over: 0, total: 0 },
      );

      res.json({ success: true, data: { asAtDate, period, rows: agingData, totals } });
    } catch (error) { next(error); }
  };
  customerStatement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = parseInt(req.query.customerId as string);
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const includePaid = req.query.includePaid === 'true';

      if (!customerId) {
        return res.status(400).json({ success: false, error: { message: 'customerId is required' } });
      }

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(404).json({ success: false, error: { message: 'Customer not found' } });
      }

      // Opening balance: sum of invoices - payments before dateFrom
      const invoicesBefore = await prisma.aRInvoice.aggregate({
        where: { customerId, invoiceDate: { lt: dateFrom }, isVoid: false },
        _sum: { netTotal: true, paidAmount: true },
      });
      const paymentsBefore = await prisma.aRPayment.aggregate({
        where: { customerId, paymentDate: { lt: dateFrom }, isVoid: false },
        _sum: { paymentAmount: true },
      });
      const openingBalance = Number(customer.openingBalance || 0) + Number(invoicesBefore._sum.netTotal || 0) - Number(paymentsBefore._sum.paymentAmount || 0);

      // Get invoices in range
      const invoiceWhere: any = { customerId, invoiceDate: { gte: dateFrom, lte: dateTo }, isVoid: false };
      if (!includePaid) invoiceWhere.outstandingAmount = { not: 0 };

      const invoices = await prisma.aRInvoice.findMany({
        where: invoiceWhere,
        orderBy: { invoiceDate: 'asc' },
      });

      const payments = await prisma.aRPayment.findMany({
        where: { customerId, paymentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        orderBy: { paymentDate: 'asc' },
      });

      const transactions: Array<{ date: Date; documentNo: string; documentType: string; description: string; debit: number; credit: number }> = [];

      for (const inv of invoices) {
        transactions.push({
          date: inv.invoiceDate, documentNo: inv.invoiceNo, documentType: 'Invoice',
          description: inv.description || '', debit: Number(inv.netTotal), credit: 0,
        });
      }

      for (const pmt of payments) {
        transactions.push({
          date: pmt.paymentDate, documentNo: pmt.paymentNo, documentType: 'Payment',
          description: pmt.description || '', debit: 0, credit: Number(pmt.paymentAmount),
        });
      }

      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBalance = openingBalance;
      const txnsWithBalance = transactions.map(t => {
        runningBalance += t.debit - t.credit;
        return { ...t, balance: runningBalance };
      });

      // Aging summary
      const now = new Date();
      const outstanding = await prisma.aRInvoice.findMany({
        where: { customerId, isVoid: false, outstandingAmount: { gt: 0 } },
      });

      const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
      for (const inv of outstanding) {
        const agingDate = inv.agingDate || inv.invoiceDate;
        const days = Math.floor((now.getTime() - new Date(agingDate).getTime()) / (1000 * 60 * 60 * 24));
        const amt = Number(inv.outstandingAmount);
        if (days <= 0) aging.current += amt;
        else if (days <= 30) aging.days30 += amt;
        else if (days <= 60) aging.days60 += amt;
        else if (days <= 90) aging.days90 += amt;
        else aging.over90 += amt;
      }

      res.json({
        success: true,
        data: {
          customer: {
            id: customer.id, code: customer.code, name: customer.name,
            creditLimit: Number(customer.creditLimit), outstandingBalance: runningBalance,
          },
          dateFrom, dateTo, openingBalance, closingBalance: runningBalance,
          transactions: txnsWithBalance, aging,
        },
      });
    } catch (error) { next(error); }
  };
  arInvoiceListing = stubHandler('AR Invoice Listing');
  arPaymentListing = stubHandler('AR Payment Listing');

  // AP Reports
  vendorListing = stubHandler('Vendor Listing');
  vendorAging = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asAtDate = req.query.asAtDate ? new Date(req.query.asAtDate as string) : new Date();
      const period = parseInt(req.query.period as string) || 30;

      const vendors = await prisma.vendor.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      });

      const invoices = await prisma.aPInvoice.findMany({
        where: {
          isVoid: false,
          outstandingAmount: { not: 0 },
          invoiceDate: { lte: asAtDate },
        },
        select: { vendorId: true, invoiceDate: true, agingDate: true, outstandingAmount: true },
      });

      const agingData = vendors.map((vend) => {
        const vendInvoices = invoices.filter((inv) => inv.vendorId === vend.id);
        const buckets = { current: 0, period1: 0, period2: 0, period3: 0, over: 0 };
        vendInvoices.forEach((inv) => {
          const refDate = inv.agingDate || inv.invoiceDate;
          const daysOld = Math.floor((asAtDate.getTime() - new Date(refDate).getTime()) / 86400000);
          const amt = Number(inv.outstandingAmount);
          if (daysOld <= 0) buckets.current += amt;
          else if (daysOld <= period) buckets.period1 += amt;
          else if (daysOld <= period * 2) buckets.period2 += amt;
          else if (daysOld <= period * 3) buckets.period3 += amt;
          else buckets.over += amt;
        });
        const total = buckets.current + buckets.period1 + buckets.period2 + buckets.period3 + buckets.over;
        return { vendorCode: vend.code, vendorName: vend.name, ...buckets, total };
      }).filter((r) => r.total !== 0);

      const totals = agingData.reduce(
        (acc, r) => ({ current: acc.current + r.current, period1: acc.period1 + r.period1, period2: acc.period2 + r.period2, period3: acc.period3 + r.period3, over: acc.over + r.over, total: acc.total + r.total }),
        { current: 0, period1: 0, period2: 0, period3: 0, over: 0, total: 0 },
      );

      res.json({ success: true, data: { asAtDate, period, rows: agingData, totals } });
    } catch (error) { next(error); }
  };
  vendorStatement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendorId = parseInt(req.query.vendorId as string);
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const includePaid = req.query.includePaid === 'true';

      if (!vendorId) {
        return res.status(400).json({ success: false, error: { message: 'vendorId is required' } });
      }

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) {
        return res.status(404).json({ success: false, error: { message: 'Vendor not found' } });
      }

      const invoicesBefore = await prisma.aPInvoice.aggregate({
        where: { vendorId, invoiceDate: { lt: dateFrom }, isVoid: false },
        _sum: { netTotal: true },
      });
      const paymentsBefore = await prisma.aPPayment.aggregate({
        where: { vendorId, paymentDate: { lt: dateFrom }, isVoid: false },
        _sum: { paymentAmount: true },
      });
      const openingBalance = Number(vendor.openingBalance || 0) + Number(invoicesBefore._sum.netTotal || 0) - Number(paymentsBefore._sum.paymentAmount || 0);

      const invoiceWhere: any = { vendorId, invoiceDate: { gte: dateFrom, lte: dateTo }, isVoid: false };
      if (!includePaid) invoiceWhere.outstandingAmount = { not: 0 };

      const invoices = await prisma.aPInvoice.findMany({
        where: invoiceWhere,
        orderBy: { invoiceDate: 'asc' },
      });

      const payments = await prisma.aPPayment.findMany({
        where: { vendorId, paymentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        orderBy: { paymentDate: 'asc' },
      });

      const transactions: Array<{ date: Date; documentNo: string; documentType: string; description: string; debit: number; credit: number }> = [];

      for (const inv of invoices) {
        transactions.push({
          date: inv.invoiceDate, documentNo: inv.invoiceNo, documentType: 'Invoice',
          description: inv.description || '', debit: Number(inv.netTotal), credit: 0,
        });
      }

      for (const pmt of payments) {
        transactions.push({
          date: pmt.paymentDate, documentNo: pmt.paymentNo, documentType: 'Payment',
          description: pmt.description || '', debit: 0, credit: Number(pmt.paymentAmount),
        });
      }

      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBalance = openingBalance;
      const txnsWithBalance = transactions.map(t => {
        runningBalance += t.debit - t.credit;
        return { ...t, balance: runningBalance };
      });

      const now = new Date();
      const outstanding = await prisma.aPInvoice.findMany({
        where: { vendorId, isVoid: false, outstandingAmount: { gt: 0 } },
      });

      const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
      for (const inv of outstanding) {
        const agingDate = inv.agingDate || inv.invoiceDate;
        const days = Math.floor((now.getTime() - new Date(agingDate).getTime()) / (1000 * 60 * 60 * 24));
        const amt = Number(inv.outstandingAmount);
        if (days <= 0) aging.current += amt;
        else if (days <= 30) aging.days30 += amt;
        else if (days <= 60) aging.days60 += amt;
        else if (days <= 90) aging.days90 += amt;
        else aging.over90 += amt;
      }

      res.json({
        success: true,
        data: {
          vendor: {
            id: vendor.id, code: vendor.code, name: vendor.name,
            outstandingBalance: runningBalance,
          },
          dateFrom, dateTo, openingBalance, closingBalance: runningBalance,
          transactions: txnsWithBalance, aging,
        },
      });
    } catch (error) { next(error); }
  };
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

  stockCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.query.productId as string);
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;

      if (!productId) {
        return res.status(400).json({ success: false, error: { message: 'productId is required' } });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { baseUOM: true },
      });

      if (!product) {
        return res.status(404).json({ success: false, error: { message: 'Product not found' } });
      }

      const locationFilter: any = locationId ? { locationId } : {};

      // Stock transactions before dateFrom
      const stockTxnsBefore = await prisma.stockTransactionDetail.findMany({
        where: {
          productId, ...locationFilter,
          transaction: { transactionDate: { lt: dateFrom }, isVoid: false },
        },
        include: { transaction: { select: { transactionType: true } } },
      });

      let openingBalance = 0;
      for (const t of stockTxnsBefore) {
        const qty = Number(t.baseQuantity || 0);
        const isIn = ['RECEIVE', 'ASSEMBLY'].includes(t.transaction.transactionType) || (t.transaction.transactionType === 'ADJUSTMENT' && qty > 0);
        openingBalance += isIn ? Math.abs(qty) : -Math.abs(qty);
      }

      const salesBefore = await prisma.salesDetail.aggregate({
        where: {
          productId,
          header: { documentDate: { lt: dateFrom }, isVoid: false, documentType: { in: ['INVOICE', 'CASH_SALE', 'DELIVERY_ORDER'] } },
        },
        _sum: { baseQuantity: true },
      });
      openingBalance -= Number(salesBefore._sum.baseQuantity || 0);

      const purchasesBefore = await prisma.purchaseDetail.aggregate({
        where: {
          productId,
          header: { documentDate: { lt: dateFrom }, isVoid: false, documentType: { in: ['PURCHASE_INVOICE', 'GRN'] } },
        },
        _sum: { baseQuantity: true },
      });
      openingBalance += Number(purchasesBefore._sum.baseQuantity || 0);

      const stockTxns = await prisma.stockTransactionDetail.findMany({
        where: {
          productId, ...locationFilter,
          transaction: { transactionDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        },
        include: { transaction: { select: { transactionNo: true, transactionDate: true, transactionType: true, description: true } } },
        orderBy: { transaction: { transactionDate: 'asc' } },
      });

      const salesTxns = await prisma.salesDetail.findMany({
        where: {
          productId,
          header: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false, documentType: { in: ['INVOICE', 'CASH_SALE', 'DELIVERY_ORDER'] } },
        },
        include: { header: { select: { documentNo: true, documentDate: true, documentType: true, customerName: true } } },
        orderBy: { header: { documentDate: 'asc' } },
      });

      const purchaseTxns = await prisma.purchaseDetail.findMany({
        where: {
          productId,
          header: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false, documentType: { in: ['PURCHASE_INVOICE', 'GRN'] } },
        },
        include: { header: { select: { documentNo: true, documentDate: true, documentType: true, vendorName: true } } },
        orderBy: { header: { documentDate: 'asc' } },
      });

      const allTxns: Array<{ date: Date; documentNo: string; documentType: string; description: string; qtyIn: number; qtyOut: number; unitCost: number; totalValue: number }> = [];

      for (const t of stockTxns) {
        const qty = Number(t.baseQuantity || 0);
        const isIn = ['RECEIVE', 'ASSEMBLY'].includes(t.transaction.transactionType) || (t.transaction.transactionType === 'ADJUSTMENT' && qty > 0);
        allTxns.push({
          date: t.transaction.transactionDate, documentNo: t.transaction.transactionNo,
          documentType: t.transaction.transactionType === 'ADJUSTMENT' ? 'Adjustment' : t.transaction.transactionType === 'TRANSFER' ? 'Transfer' : 'Stock',
          description: t.description || t.transaction.description || '',
          qtyIn: isIn ? Math.abs(qty) : 0, qtyOut: !isIn ? Math.abs(qty) : 0,
          unitCost: Number(t.unitCost || 0), totalValue: Number(t.totalCost || 0),
        });
      }

      for (const s of salesTxns) {
        allTxns.push({
          date: s.header.documentDate, documentNo: s.header.documentNo, documentType: 'Sales',
          description: s.header.customerName || s.description || '',
          qtyIn: 0, qtyOut: Number(s.baseQuantity || 0),
          unitCost: Number(s.unitCost || 0), totalValue: Number(s.totalCost || 0),
        });
      }

      for (const p of purchaseTxns) {
        allTxns.push({
          date: p.header.documentDate, documentNo: p.header.documentNo, documentType: 'Purchase',
          description: p.header.vendorName || p.description || '',
          qtyIn: Number(p.baseQuantity || 0), qtyOut: 0,
          unitCost: Number(p.unitPrice || 0), totalValue: Number(p.subTotal || 0),
        });
      }

      allTxns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBalance = openingBalance;
      const transactions = allTxns.map(t => {
        runningBalance += t.qtyIn - t.qtyOut;
        return { ...t, balance: runningBalance };
      });

      const currentBalanceAgg = await prisma.productLocation.aggregate({
        where: { productId, ...(locationId ? { locationId } : {}) },
        _sum: { balanceQty: true },
      });

      res.json({
        success: true,
        data: {
          product: {
            id: product.id, code: product.code, description: product.description,
            uom: product.baseUOM.code, currentBalance: Number(currentBalanceAgg._sum.balanceQty || 0),
            averageCost: Number(product.averageCost),
          },
          dateFrom, dateTo, openingBalance, closingBalance: runningBalance, transactions,
        },
      });
    } catch (error) { next(error); }
  };
  stockMovement = stubHandler('Stock Movement');
  stockValuation = stubHandler('Stock Valuation');
  reorderAdvisory = stubHandler('Reorder Advisory');
  slowMovingStock = stubHandler('Slow Moving Stock');

  // Tax Reports
  sstReport = stubHandler('SST Report');

  // Monthly Sales Analysis
  monthlySalesAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

      const dateFrom = new Date(year, 0, 1);
      const dateTo = new Date(year, 11, 31, 23, 59, 59);

      const where: any = {
        documentType: { in: ['INVOICE', 'CASH_SALE'] },
        documentDate: { gte: dateFrom, lte: dateTo },
        isVoid: false,
      };
      if (customerId) where.customerId = customerId;

      const cnWhere: any = {
        documentType: 'CREDIT_NOTE',
        documentDate: { gte: dateFrom, lte: dateTo },
        isVoid: false,
      };
      if (customerId) cnWhere.customerId = customerId;

      const invoices = await prisma.salesHeader.findMany({ where, select: { documentDate: true, netTotal: true } });
      const creditNotes = await prisma.salesHeader.findMany({ where: cnWhere, select: { documentDate: true, netTotal: true } });

      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(year, i).toLocaleString('en', { month: 'short' }),
        invoiceCount: 0, totalSales: 0, returns: 0, netSales: 0,
      }));

      for (const inv of invoices) {
        const m = new Date(inv.documentDate).getMonth();
        months[m].invoiceCount++;
        months[m].totalSales += Number(inv.netTotal);
      }
      for (const cn of creditNotes) {
        const m = new Date(cn.documentDate).getMonth();
        months[m].returns += Number(cn.netTotal);
      }
      months.forEach(m => { m.netSales = m.totalSales - m.returns; });

      const totalYearSales = months.reduce((s, m) => s + m.netSales, 0);
      const avgMonthly = totalYearSales / 12;
      const bestMonth = months.reduce((best, m) => m.netSales > best.netSales ? m : best, months[0]);
      const worstMonth = months.reduce((worst, m) => m.netSales < worst.netSales ? m : worst, months[0]);

      res.json({
        success: true,
        data: { year, months, totalYearSales, avgMonthly, bestMonth: bestMonth.monthName, worstMonth: worstMonth.monthName },
      });
    } catch (error) { next(error); }
  };

  // Monthly Purchase Analysis
  monthlyPurchaseAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const vendorId = req.query.vendorId ? parseInt(req.query.vendorId as string) : undefined;

      const dateFrom = new Date(year, 0, 1);
      const dateTo = new Date(year, 11, 31, 23, 59, 59);

      const where: any = {
        documentType: { in: ['PURCHASE_INVOICE', 'GRN'] },
        documentDate: { gte: dateFrom, lte: dateTo },
        isVoid: false,
      };
      if (vendorId) where.vendorId = vendorId;

      const cnWhere: any = {
        documentType: 'CREDIT_NOTE',
        documentDate: { gte: dateFrom, lte: dateTo },
        isVoid: false,
      };
      if (vendorId) cnWhere.vendorId = vendorId;

      const invoices = await prisma.purchaseHeader.findMany({ where, select: { documentDate: true, netTotal: true } });
      const creditNotes = await prisma.purchaseHeader.findMany({ where: cnWhere, select: { documentDate: true, netTotal: true } });

      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(year, i).toLocaleString('en', { month: 'short' }),
        invoiceCount: 0, totalPurchases: 0, returns: 0, netPurchases: 0,
      }));

      for (const inv of invoices) {
        const m = new Date(inv.documentDate).getMonth();
        months[m].invoiceCount++;
        months[m].totalPurchases += Number(inv.netTotal);
      }
      for (const cn of creditNotes) {
        const m = new Date(cn.documentDate).getMonth();
        months[m].returns += Number(cn.netTotal);
      }
      months.forEach(m => { m.netPurchases = m.totalPurchases - m.returns; });

      const totalYearPurchases = months.reduce((s, m) => s + m.netPurchases, 0);
      const avgMonthly = totalYearPurchases / 12;
      const bestMonth = months.reduce((best, m) => m.netPurchases > best.netPurchases ? m : best, months[0]);
      const worstMonth = months.reduce((worst, m) => m.netPurchases < worst.netPurchases ? m : worst, months[0]);

      res.json({
        success: true,
        data: { year, months, totalYearPurchases, avgMonthly, bestMonth: bestMonth.monthName, worstMonth: worstMonth.monthName },
      });
    } catch (error) { next(error); }
  };

  // Product Profit Margin
  productProfitMargin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = new Date(req.query.dateFrom as string || new Date(new Date().getFullYear(), 0, 1).toISOString());
      const dateTo = new Date(req.query.dateTo as string || new Date().toISOString());
      const productGroupId = req.query.productGroupId ? parseInt(req.query.productGroupId as string) : undefined;

      const where: any = {
        header: {
          documentType: { in: ['INVOICE', 'CASH_SALE'] },
          documentDate: { gte: dateFrom, lte: dateTo },
          isVoid: false,
        },
        productId: { not: null },
      };

      const details = await prisma.salesDetail.findMany({
        where,
        include: { product: { include: { group: true } } },
      });

      const productMap = new Map<number, { code: string; name: string; groupName: string; totalSales: number; totalCost: number }>();

      for (const d of details) {
        if (!d.product) continue;
        if (productGroupId && d.product.groupId !== productGroupId) continue;
        const existing = productMap.get(d.product.id) || {
          code: d.product.code, name: d.product.description || d.product.code,
          groupName: d.product.group?.name || '-',
          totalSales: 0, totalCost: 0,
        };
        existing.totalSales += Number(d.subTotal);
        existing.totalCost += Number(d.totalCost);
        productMap.set(d.product.id, existing);
      }

      const products = Array.from(productMap.values()).map(p => ({
        ...p,
        grossProfit: p.totalSales - p.totalCost,
        marginPercent: p.totalSales > 0 ? ((p.totalSales - p.totalCost) / p.totalSales) * 100 : 0,
      }));

      const totalRevenue = products.reduce((s, p) => s + p.totalSales, 0);
      const totalCost = products.reduce((s, p) => s + p.totalCost, 0);
      const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

      res.json({
        success: true,
        data: { dateFrom, dateTo, products, totalRevenue, totalCost, overallMargin },
      });
    } catch (error) { next(error); }
  };

  // Export
  exportReport = stubHandler('Export Report');
}
