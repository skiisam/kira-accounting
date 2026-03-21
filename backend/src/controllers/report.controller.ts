// @ts-nocheck
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
        include: { type: true } as any,
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
        include: { type: true } as any,
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
        include: { type: true } as any,
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

  ledgerListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accountId = parseInt(req.query.accountId as string);
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();

      const where: any = {
        journal: { journalDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
      };
      if (accountId) where.accountId = accountId;

      const entries = await prisma.journalEntryDetail.findMany({
        where,
        include: {
          journal: true,
          account: { include: { type: true } as any },
        },
        orderBy: { journal: { journalDate: 'asc' } },
      });

      let runningBalance = 0;
      const data = entries.map(e => {
        const debit = Number(e.debitAmount || 0);
        const credit = Number(e.creditAmount || 0);
        const isDebitNormal = e?.account?.type.normalBalance === 'D';
        runningBalance += isDebitNormal ? debit - credit : credit - debit;
        return {
          date: e?.journal?.journalDate,
          journalNo: e?.journal?.journalNo,
          description: e.description || e?.journal?.description,
          accountNo: e?.account?.accountNo,
          accountName: e?.account?.name,
          debit, credit,
          balance: runningBalance,
        };
      });

      res.json({ success: true, data: { dateFrom, dateTo, entries: data } });
    } catch (error) { next(error); }
  };
  journalListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const journalType = req.query.journalType as string;

      const where: any = { journalDate: { gte: dateFrom, lte: dateTo }, isVoid: false };
      if (journalType) where.journalType = journalType;

      const journals = await prisma.journalEntry.findMany({
        where,
        include: { details: { include: { account: true } as any as any }, createdByUser: { select: { name: true } } },
        orderBy: { journalDate: 'desc' },
      });

      const data = journals.map(j => ({
        id: j.id, journalNo: j.journalNo, journalDate: j.journalDate,
        journalType: j.journalType, description: j.description,
        reference: j.reference, isVoid: j.isVoid,
        createdBy: j.createdByUser?.name,
        totalDebit: j.details.reduce((s, d) => s + Number(d.debitAmount || 0), 0),
        totalCredit: j.details.reduce((s, d) => s + Number(d.creditAmount || 0), 0),
        details: j.details.map(d => ({
          accountNo: d?.account?.accountNo, accountName: d?.account?.name,
          description: d.description, debit: Number(d.debitAmount || 0), credit: Number(d.creditAmount || 0),
        })),
      }));

      res.json({ success: true, data: { dateFrom, dateTo, journals: data } });
    } catch (error) { next(error); }
  };

  // AR Reports
  customerListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customers = await prisma.customer.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      const data = await Promise.all(customers.map(async (c) => {
        const invoices = await prisma.arInvoice.aggregate({ where: { customerId: c.id }, _sum: { netTotal: true }, _count: true });
        const payments = await prisma.arPayment.aggregate({ where: { customerId: c.id }, _sum: { amount: true } });
        const totalInvoiced = Number(invoices._sum.netTotal || 0);
        const totalPaid = Number(payments._sum.amount || 0);
        return { id: c.id, code: c.code, name: c.name, phone: c.phone, email: c.email, totalInvoiced, totalPaid, outstanding: totalInvoiced - totalPaid, invoiceCount: invoices._count };
      }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };
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
  arInvoiceListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const records = await prisma.arInvoice.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        include: { } as any as any,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: { dateFrom, dateTo, records } });
    } catch (error) { next(error); }
  };
  arPaymentListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const records = await prisma.arPayment.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        include: { } as any as any,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: { dateFrom, dateTo, records } });
    } catch (error) { next(error); }
  };

  // AP Reports
  vendorListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendors = await prisma.vendor.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
      const data = await Promise.all(vendors.map(async (v) => {
        const invoices = await prisma.apInvoice.aggregate({ where: { vendorId: v.id }, _sum: { netTotal: true }, _count: true });
        const payments = await prisma.apPayment.aggregate({ where: { vendorId: v.id }, _sum: { amount: true } });
        const totalInvoiced = Number(invoices._sum.netTotal || 0);
        const totalPaid = Number(payments._sum.amount || 0);
        return { id: v.id, code: v.code, name: v.name, phone: v.phone, email: v.email, totalInvoiced, totalPaid, outstanding: totalInvoiced - totalPaid, invoiceCount: invoices._count };
      }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };
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
  apInvoiceListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const records = await prisma.apInvoice.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        include: { } as any as any,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: { dateFrom, dateTo, records } });
    } catch (error) { next(error); }
  };
  apPaymentListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const records = await prisma.apPayment.findMany({
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        include: { } as any as any,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: { dateFrom, dateTo, records } });
    } catch (error) { next(error); }
  };

  // Sales Reports
  salesListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const headers = await prisma.salesHeader.findMany({
        where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        include: { details: { include: { product: true } as any as any }, customer: true, vendor: true },
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, docType: h.documentType, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data: { dateFrom, dateTo, records: data } });
    } catch (error) { next(error); }
  };
  salesByCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const headers = await prisma.salesHeader.findMany({
        where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        include: { details: { include: { product: true } as any as any }, customer: true, vendor: true },
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, docType: h.documentType, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data: { dateFrom, dateTo, records: data } });
    } catch (error) { next(error); }
  };
  salesByProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const headers = await prisma.salesHeader.findMany({
        where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        include: { details: { include: { product: true } as any as any }, customer: true, vendor: true },
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, docType: h.documentType, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data: { dateFrom, dateTo, records: data } });
    } catch (error) { next(error); }
  };
  salesByAgent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const headers = await prisma.salesHeader.findMany({
        where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        include: { details: { include: { product: true } as any as any }, customer: true, vendor: true },
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, docType: h.documentType, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data: { dateFrom, dateTo, records: data } });
    } catch (error) { next(error); }
  };
  outstandingDO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const headers = await prisma.salesHeader.findMany({
        where: { docType: 'DO', status: { in: ['DRAFT', 'CONFIRMED', 'PARTIAL'] }, isVoid: false },
        include: { } as any as any,
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };
  outstandingSO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const headers = await prisma.salesHeader.findMany({
        where: { docType: 'SO', status: { in: ['DRAFT', 'CONFIRMED', 'PARTIAL'] }, isVoid: false },
        include: { } as any as any,
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  // Purchase Reports
  purchaseListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const headers = await prisma.purchaseHeader.findMany({
        where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        include: { details: { include: { product: true } as any as any }, customer: true, vendor: true },
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, docType: h.documentType, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data: { dateFrom, dateTo, records: data } });
    } catch (error) { next(error); }
  };
  purchaseByVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const headers = await prisma.purchaseHeader.findMany({
        where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        include: { details: { include: { product: true } as any as any }, customer: true, vendor: true },
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, docType: h.documentType, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data: { dateFrom, dateTo, records: data } });
    } catch (error) { next(error); }
  };
  purchaseByProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const headers = await prisma.purchaseHeader.findMany({
        where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false },
        include: { details: { include: { product: true } as any as any }, customer: true, vendor: true },
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, docType: h.documentType, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data: { dateFrom, dateTo, records: data } });
    } catch (error) { next(error); }
  };
  outstandingPO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const headers = await prisma.purchaseHeader.findMany({
        where: { docType: 'PO', status: { in: ['DRAFT', 'CONFIRMED', 'PARTIAL'] }, isVoid: false },
        include: { } as any as any,
        orderBy: { documentDate: 'desc' },
      });
      const data = headers.map(h => ({ id: h.id, docNo: h.documentNo, documentDate: h.documentDate, customerName: (h as any).customer?.name, vendorName: (h as any).vendor?.name, totalAmount: Number(h.netTotal || 0), status: h.status }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  // Stock Reports
  stockBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;

      const balances = await prisma.productLocation.findMany({
        where: locationId ? { locationId } : { balanceQty: { not: 0 } },
        include: {
          product: { select: { code: true, description: true, averageCost: true } as any },
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
        include: { baseUOM: true } as any,
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
        include: { transaction: { select: { transactionType: true } as any } },
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
        include: { transaction: { select: { transactionNo: true, transactionDate: true, transactionType: true, description: true } as any } },
        orderBy: { transaction: { transactionDate: 'asc' } },
      });

      const salesTxns = await prisma.salesDetail.findMany({
        where: {
          productId,
          header: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false, documentType: { in: ['INVOICE', 'CASH_SALE', 'DELIVERY_ORDER'] } },
        },
        include: { header: { select: { documentNo: true, documentDate: true, documentType: true, customerName: true } as any } },
        orderBy: { header: { documentDate: 'asc' } },
      });

      const purchaseTxns = await prisma.purchaseDetail.findMany({
        where: {
          productId,
          header: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false, documentType: { in: ['PURCHASE_INVOICE', 'GRN'] } },
        },
        include: { header: { select: { documentNo: true, documentDate: true, documentType: true, vendorName: true } as any } },
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
  stockMovement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = parseInt(req.query.productId as string);
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const where: any = { transactionDate: { gte: dateFrom, lte: dateTo } };
      if (productId) where.productId = productId;
      const movements = await prisma.stockTransaction.findMany({
        where, include: { product: true, location: true } as any, orderBy: { transactionDate: 'desc' },
      });
      const data = movements.map(m => ({ id: m.id, date: m.transactionDate, productCode: m.product.code, productName: m.product.name, type: m.transactionType, quantity: Number(m.quantity), unitCost: Number(m.unitCost || 0), totalCost: Number(m.totalCost || 0), reference: m.referenceNo, location: m.location?.name }));
      res.json({ success: true, data: { dateFrom, dateTo, movements: data } });
    } catch (error) { next(error); }
  };
  stockValuation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await prisma.product.findMany({ where: { isActive: true, type: 'STOCK' }, orderBy: { code: 'asc' } });
      const data = products.map(p => ({ id: p.id, code: p.code, name: p.description, quantity: Number(p.balanceQty || 0), avgCost: Number(p.averageCost || 0), totalValue: Number(p.balanceQty || 0) * Number(p.averageCost || 0) }));
      const totalValue = data.reduce((s, d) => s + d.totalValue, 0);
      res.json({ success: true, data: { products: data, totalValue } });
    } catch (error) { next(error); }
  };
  reorderAdvisory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await prisma.product.findMany({ where: { isActive: true, type: 'STOCK' }, orderBy: { code: 'asc' } });
      const data = products.filter(p => Number(p.balanceQty || 0) <= Number(p.reorderLevel || 0)).map(p => ({ id: p.id, code: p.code, name: p.description, currentQty: Number(p.balanceQty || 0), reorderLevel: Number(p.reorderLevel || 0), reorderQty: Number(p.reorderQuantity || 0), deficit: Number(p.reorderLevel || 0) - Number(p.balanceQty || 0) }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };
  slowMovingStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 90;
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      const products = await prisma.product.findMany({ where: { isActive: true, type: 'STOCK' }, include: { stockTransactions: { where: { transactionDate: { gte: cutoff } as any }, take: 1 } }, orderBy: { code: 'asc' } });
      const data = products.filter(p => p.stockTransactions.length === 0 && Number(p.balanceQty || 0) > 0).map(p => ({ id: p.id, code: p.code, name: p.description, quantity: Number(p.balanceQty || 0), value: Number(p.balanceQty || 0) * Number(p.averageCost || 0) }));
      res.json({ success: true, data: { days, products: data } });
    } catch (error) { next(error); }
  };

  // Tax Reports
  sstReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), 0, 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();
      const salesTax = await prisma.salesHeader.aggregate({ where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false }, _sum: { taxAmount: true, totalAmount: true } });
      const purchaseTax = await prisma.purchaseHeader.aggregate({ where: { documentDate: { gte: dateFrom, lte: dateTo }, isVoid: false }, _sum: { taxAmount: true, totalAmount: true } });
      res.json({ success: true, data: { dateFrom, dateTo, outputTax: Number(salesTax._sum.taxAmount || 0), salesAmount: Number(salesTax._sum.netTotal || 0), inputTax: Number(purchaseTax._sum.taxAmount || 0), purchaseAmount: Number(purchaseTax._sum.netTotal || 0), netTax: Number(salesTax._sum.taxAmount || 0) - Number(purchaseTax._sum.taxAmount || 0) } });
    } catch (error) { next(error); }
  };

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
        include: { product: { include: { group: true } as any } },
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
  exportReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, message: 'Export feature - use frontend PDF/Excel export' });
    } catch (error) { next(error); }
  };
}
