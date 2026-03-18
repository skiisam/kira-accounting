import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export class AuditController {
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 50);
      const module = req.query.module as string;
      const action = req.query.action as string;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const where: any = {};
      if (module) where.module = module;
      if (action) where.action = action;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction) => { return this.getAuditLogs(req, res, next); };
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await prisma.auditLog.findUnique({ where: { id: parseInt(req.params.id) }, include: { user: { select: { name: true } } } });
      res.json({ success: true, data: log });
    } catch (error) { next(error); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => { res.status(405).json({ success: false, message: 'Audit logs are system-generated' }); };
  update = async (req: Request, res: Response, next: NextFunction) => { res.status(405).json({ success: false, message: 'Audit logs cannot be modified' }); };
  delete = async (req: Request, res: Response, next: NextFunction) => { res.status(405).json({ success: false, message: 'Audit logs cannot be deleted' }); };
}
