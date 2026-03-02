import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export class AuditController {
  getAuditTrail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const userId = req.query.user ? parseInt(req.query.user as string) : undefined;
      const moduleCode = req.query.module as string | undefined;
      const action = req.query.action as string | undefined;
      const search = req.query.search as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));

      const where: any = {};

      if (dateFrom || dateTo) {
        where.auditDate = {};
        if (dateFrom) where.auditDate.gte = dateFrom;
        if (dateTo) where.auditDate.lte = dateTo;
      }

      if (userId) where.userId = userId;
      if (moduleCode) where.moduleCode = moduleCode;
      if (action) where.action = action;

      if (search) {
        where.OR = [
          { documentNo: { contains: search, mode: 'insensitive' } },
          { userCode: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, trails] = await Promise.all([
        prisma.auditTrail.count({ where }),
        prisma.auditTrail.findMany({
          where,
          orderBy: { auditDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      const data = trails.map(t => ({
        ...t,
        id: t.id.toString(),
      }));

      res.json({
        success: true,
        data: {
          trails: data,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
