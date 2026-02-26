import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

/**
 * Base controller with common CRUD operations
 */
export abstract class BaseController<T> {
  protected abstract modelName: string;

  /**
   * Parse pagination params
   */
  protected getPagination(req: Request): { skip: number; take: number; page: number; pageSize: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    return {
      skip: (page - 1) * pageSize,
      take: pageSize,
      page,
      pageSize,
    };
  }

  /**
   * Parse sorting params
   */
  protected getSorting(req: Request, defaultField: string = 'id', defaultOrder: 'asc' | 'desc' = 'desc') {
    const sortBy = (req.query.sortBy as string) || defaultField;
    const sortOrder = ((req.query.sortOrder as string) || defaultOrder).toLowerCase() as 'asc' | 'desc';
    return { [sortBy]: sortOrder };
  }

  /**
   * Parse date range filters
   */
  protected getDateRange(req: Request, fieldName: string = 'createdAt') {
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    
    if (!dateFrom && !dateTo) return undefined;
    
    const filter: any = {};
    if (dateFrom) filter.gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filter.lte = endDate;
    }
    
    return { [fieldName]: filter };
  }

  /**
   * Format paginated response
   */
  protected paginatedResponse<R>(
    res: Response, 
    data: R[], 
    total: number, 
    page: number, 
    pageSize: number
  ) {
    return res.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
    });
  }

  /**
   * Format single item response
   */
  protected successResponse<R>(res: Response, data: R, message?: string) {
    return res.json({
      success: true,
      data,
      ...(message && { message }),
    });
  }

  /**
   * Format created response
   */
  protected createdResponse<R>(res: Response, data: R, message?: string) {
    return res.status(201).json({
      success: true,
      data,
      message: message || `${this.modelName} created successfully`,
    });
  }

  /**
   * Format deleted response
   */
  protected deletedResponse(res: Response, message?: string) {
    return res.json({
      success: true,
      message: message || `${this.modelName} deleted successfully`,
    });
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: any, requiredFields: string[]) {
    const missing = requiredFields.filter(field => {
      const value = this.getNestedValue(data, field);
      return value === undefined || value === null || value === '';
    });
    
    if (missing.length > 0) {
      throw ValidationError({
        message: 'Missing required fields',
        fields: missing,
      });
    }
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Handle not found
   */
  protected notFound(id: number | string) {
    throw NotFoundError(`${this.modelName} with ID ${id} not found`);
  }

  /**
   * Check if a date falls within a locked fiscal period or closed fiscal year
   */
  protected async isDateLocked(date: Date | null | undefined): Promise<boolean> {
    if (!date) return false;
    const period = await prisma.fiscalPeriod.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      include: { fiscalYear: true },
    });
    if (!period) return false;
    return Boolean(period.isLocked || period.fiscalYear?.isClosed);
  }

  /**
   * Stub methods for subclasses to implement
   */
  abstract list(req: Request, res: Response, next: NextFunction): Promise<void>;
  abstract getById(req: Request, res: Response, next: NextFunction): Promise<void>;
  abstract create(req: Request, res: Response, next: NextFunction): Promise<void>;
  abstract update(req: Request, res: Response, next: NextFunction): Promise<void>;
  abstract delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}

/**
 * Stub controller for routes not yet implemented
 */
export const stubHandler = (name: string) => {
  return async (req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `${name} is not yet implemented`,
      },
    });
  };
};
