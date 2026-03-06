import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export class KnockOffController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const entryType = req.query.entryType as string;
      const search = req.query.search as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const where: any = { isVoid: false };
      if (entryType) where.entryType = entryType;
      if (dateFrom) where.entryDate = { ...where.entryDate, gte: new Date(dateFrom) };
      if (dateTo) where.entryDate = { ...where.entryDate, lte: new Date(dateTo) };
      if (search) {
        where.OR = [
          { entryNo: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.knockOffEntry.findMany({
          where,
          include: { details: true },
          orderBy: { entryDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.knockOffEntry.count({ where }),
      ]);

      res.json({ success: true, items, total, page, pageSize });
    } catch (error) { next(error); }
  };

  getOutstanding = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entryType = req.query.entryType as string;
      const entityId = parseInt(req.query.entityId as string);

      if (!entryType || !entityId) {
        return res.status(400).json({ success: false, message: 'entryType and entityId required' });
      }

      let debitItems: any[] = [];
      let creditItems: any[] = [];

      if (entryType === 'AR') {
        const invoices = await prisma.aRInvoice.findMany({
          where: { customerId: entityId, isVoid: false, outstandingAmount: { gt: 0 } },
          select: { id: true, invoiceNo: true, invoiceDate: true, netTotal: true, outstandingAmount: true },
        });
        debitItems = invoices.map(i => ({
          documentType: 'AR_INVOICE', documentId: i.id, documentNo: i.invoiceNo,
          documentDate: i.invoiceDate, documentAmount: Number(i.netTotal),
          outstandingAmount: Number(i.outstandingAmount),
        }));

        const creditNotes = await prisma.salesHeader.findMany({
          where: { customerId: entityId, documentType: 'CREDIT_NOTE', isVoid: false, status: { not: 'VOID' } },
          select: { id: true, documentNo: true, documentDate: true, netTotal: true },
        });
        creditItems = creditNotes.map(cn => ({
          documentType: 'AR_CN', documentId: cn.id, documentNo: cn.documentNo,
          documentDate: cn.documentDate, documentAmount: Number(cn.netTotal),
          outstandingAmount: Number(cn.netTotal),
        }));
      } else {
        const invoices = await prisma.aPInvoice.findMany({
          where: { vendorId: entityId, isVoid: false, outstandingAmount: { gt: 0 } },
          select: { id: true, invoiceNo: true, invoiceDate: true, netTotal: true, outstandingAmount: true },
        });
        debitItems = invoices.map(i => ({
          documentType: 'AP_INVOICE', documentId: i.id, documentNo: i.invoiceNo,
          documentDate: i.invoiceDate, documentAmount: Number(i.netTotal),
          outstandingAmount: Number(i.outstandingAmount),
        }));

        const debitNotes = await prisma.purchaseHeader.findMany({
          where: { vendorId: entityId, documentType: 'DEBIT_NOTE', isVoid: false, status: { not: 'VOID' } },
          select: { id: true, documentNo: true, documentDate: true, netTotal: true },
        });
        creditItems = debitNotes.map(dn => ({
          documentType: 'AP_DN', documentId: dn.id, documentNo: dn.documentNo,
          documentDate: dn.documentDate, documentAmount: Number(dn.netTotal),
          outstandingAmount: Number(dn.netTotal),
        }));
      }

      res.json({ success: true, debitItems, creditItems });
    } catch (error) { next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entryType, customerId, vendorId, description, details } = req.body;

      const lastEntry = await prisma.knockOffEntry.findFirst({
        orderBy: { id: 'desc' },
        select: { entryNo: true },
      });
      const nextNum = lastEntry ? parseInt(lastEntry.entryNo.replace(/\D/g, '') || '0') + 1 : 1;
      const entryNo = `KO-${String(nextNum).padStart(6, '0')}`;

      const totalAmount = details
        .filter((d: any) => d.side === 'DEBIT')
        .reduce((sum: number, d: any) => sum + (d.knockOffAmount || 0), 0);

      const entry = await prisma.knockOffEntry.create({
        data: {
          entryNo,
          entryDate: new Date(),
          entryType,
          customerId: customerId || null,
          vendorId: vendorId || null,
          description,
          totalAmount,
          details: {
            create: details.map((d: any) => ({
              side: d.side,
              documentType: d.documentType,
              documentId: d.documentId,
              documentNo: d.documentNo,
              documentDate: d.documentDate ? new Date(d.documentDate) : null,
              documentAmount: d.documentAmount || 0,
              outstandingBefore: d.outstandingBefore || 0,
              knockOffAmount: d.knockOffAmount || 0,
              outstandingAfter: (d.outstandingBefore || 0) - (d.knockOffAmount || 0),
            })),
          },
        },
        include: { details: true },
      });

      for (const d of details) {
        const newOutstanding = (d.outstandingBefore || 0) - (d.knockOffAmount || 0);
        if (d.documentType === 'AR_INVOICE') {
          await prisma.aRInvoice.update({
            where: { id: d.documentId },
            data: {
              outstandingAmount: newOutstanding,
              paidAmount: { increment: d.knockOffAmount },
              status: newOutstanding <= 0 ? 'PAID' : 'PARTIAL',
            },
          });
        } else if (d.documentType === 'AP_INVOICE') {
          await prisma.aPInvoice.update({
            where: { id: d.documentId },
            data: {
              outstandingAmount: newOutstanding,
              paidAmount: { increment: d.knockOffAmount },
              status: newOutstanding <= 0 ? 'PAID' : 'PARTIAL',
            },
          });
        }
      }

      res.json({ success: true, data: entry });
    } catch (error) { next(error); }
  };

  voidEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await prisma.knockOffEntry.findUnique({
        where: { id },
        include: { details: true },
      });
      if (!entry) return res.status(404).json({ success: false, message: 'Not found' });

      for (const d of entry.details) {
        if (d.documentType === 'AR_INVOICE') {
          await prisma.aRInvoice.update({
            where: { id: d.documentId },
            data: {
              outstandingAmount: { increment: Number(d.knockOffAmount) },
              paidAmount: { decrement: Number(d.knockOffAmount) },
              status: 'OPEN',
            },
          });
        } else if (d.documentType === 'AP_INVOICE') {
          await prisma.aPInvoice.update({
            where: { id: d.documentId },
            data: {
              outstandingAmount: { increment: Number(d.knockOffAmount) },
              paidAmount: { decrement: Number(d.knockOffAmount) },
              status: 'OPEN',
            },
          });
        }
      }

      await prisma.knockOffEntry.update({
        where: { id },
        data: { isVoid: true, status: 'VOID' },
      });

      res.json({ success: true });
    } catch (error) { next(error); }
  };
}
