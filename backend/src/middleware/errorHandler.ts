import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  details?: any;

  constructor(
    message: string, 
    statusCode: number = 500, 
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAppError = err instanceof AppError;
  
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred';

  // Log error
  logger.error(`${req.method} ${req.url} - ${statusCode} - ${err.message}`, {
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(isAppError && err.details && { details: err.details }),
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};

// Common error types
export const BadRequestError = (message: string, details?: any) => 
  new AppError(message, 400, 'BAD_REQUEST', details);

export const UnauthorizedError = (message: string = 'Unauthorized') => 
  new AppError(message, 401, 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Forbidden') => 
  new AppError(message, 403, 'FORBIDDEN');

export const NotFoundError = (message: string = 'Resource not found') => 
  new AppError(message, 404, 'NOT_FOUND');

export const ConflictError = (message: string, details?: any) => 
  new AppError(message, 409, 'CONFLICT', details);

export const ValidationError = (details: any) => 
  new AppError('Validation failed', 422, 'VALIDATION_ERROR', details);
