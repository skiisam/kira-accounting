/**
 * LHDN E-Invoice (MyInvois) Controller
 * 
 * REST API endpoints for e-invoice validation and submission
 */

import { Request, Response, NextFunction } from 'express';
import { BaseController } from './base.controller';
import { einvoiceService, EInvoiceStatus } from '../services/einvoice.service';
import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';

export class EInvoiceController extends BaseController<any> {
  protected modelName = 'EInvoice';

  /**
   * GET /api/v1/einvoice/status
   * Get E-Invoice configuration status
   */
  getConfigStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configured = einvoiceService.isConfigured();
      const environment = process.env.MYINVOIS_ENV || 'sandbox';

      this.successResponse(res, {
        configured,
        environment,
        message: configured 
          ? `E-Invoice integration configured for ${environment}` 
          : 'E-Invoice credentials not configured. Set MYINVOIS_CLIENT_ID and MYINVOIS_CLIENT_SECRET.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/einvoice/validate/:invoiceId
   * Validate an invoice against LHDN requirements
   */
  validateInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      
      if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
      }

      const result = await einvoiceService.validateInvoice(invoiceId);

      this.successResponse(res, {
        invoiceId,
        valid: result.valid,
        errors: result.errors,
        message: result.valid 
          ? 'Invoice passes LHDN e-Invoice validation' 
          : `Validation failed with ${result.errors.length} error(s)`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/einvoice/validate-tin
   * Validate a TIN (Tax Identification Number) with LHDN
   */
  validateTIN = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tin, idType, idValue } = req.body;

      if (!tin || !idType || !idValue) {
        throw BadRequestError('tin, idType, and idValue are required');
      }

      // idType must be one of: BRN, NRIC, PASSPORT, ARMY
      const validIdTypes = ['BRN', 'NRIC', 'PASSPORT', 'ARMY'];
      if (!validIdTypes.includes(idType.toUpperCase())) {
        throw BadRequestError(`idType must be one of: ${validIdTypes.join(', ')}`);
      }

      const result = await einvoiceService.validateTIN(tin, idType.toUpperCase(), idValue);

      this.successResponse(res, {
        tin,
        idType: idType.toUpperCase(),
        idValue,
        valid: result.valid,
        message: result.message || (result.valid ? 'TIN is valid' : 'TIN validation failed'),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/einvoice/submit/:invoiceId
   * Submit an invoice to MyInvois
   */
  submitInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      
      if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
      }

      // Check if already submitted
      const invoice = await prisma.salesHeader.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        throw NotFoundError('Invoice not found');
      }

      if (invoice.einvoiceStatus === EInvoiceStatus.VALID) {
        throw BadRequestError('Invoice already submitted and validated');
      }

      if (invoice.einvoiceStatus === EInvoiceStatus.SUBMITTED) {
        throw BadRequestError('Invoice already submitted, waiting for validation');
      }

      // Submit to MyInvois
      const result = await einvoiceService.submitInvoice(invoiceId);

      if (result.success) {
        this.successResponse(res, {
          invoiceId,
          status: EInvoiceStatus.SUBMITTED,
          submissionId: result.submissionId,
          uuid: result.uuid,
          longId: result.longId,
          qrUrl: result.longId 
            ? `${process.env.MYINVOIS_ENV === 'production' ? 'https://myinvois.hasil.gov.my' : 'https://preprod.myinvois.hasil.gov.my'}/${result.uuid}/share/${result.longId}` 
            : null,
          message: 'Invoice submitted to MyInvois successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          invoiceId,
          status: EInvoiceStatus.INVALID,
          errors: result.errors,
          message: 'Invoice submission failed',
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/einvoice/status/:invoiceId
   * Get E-Invoice status for an invoice
   */
  getInvoiceStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      
      if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
      }

      const invoice = await prisma.salesHeader.findUnique({ 
        where: { id: invoiceId },
        select: {
          id: true,
          documentNo: true,
          documentType: true,
          einvoiceStatus: true,
          einvoiceUUID: true,
          einvoiceLongId: true,
          einvoiceSubmissionId: true,
          einvoiceSubmittedAt: true,
          einvoiceValidatedAt: true,
          einvoiceErrorMsg: true,
          einvoiceQRUrl: true,
        },
      });

      if (!invoice) {
        throw NotFoundError('Invoice not found');
      }

      // If submitted but not yet validated, check status with MyInvois
      if (invoice.einvoiceStatus === EInvoiceStatus.SUBMITTED && invoice.einvoiceSubmissionId) {
        const statusCheck = await einvoiceService.checkInvoiceStatus(invoiceId);
        
        // Refresh invoice data after status check
        const updatedInvoice = await prisma.salesHeader.findUnique({ 
          where: { id: invoiceId },
          select: {
            id: true,
            documentNo: true,
            documentType: true,
            einvoiceStatus: true,
            einvoiceUUID: true,
            einvoiceLongId: true,
            einvoiceSubmissionId: true,
            einvoiceSubmittedAt: true,
            einvoiceValidatedAt: true,
            einvoiceErrorMsg: true,
            einvoiceQRUrl: true,
          },
        });

        this.successResponse(res, {
          ...updatedInvoice,
          statusChecked: true,
          lastCheckResult: statusCheck,
        });
        return;
      }

      this.successResponse(res, {
        ...invoice,
        statusChecked: false,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/einvoice/cancel/:invoiceId
   * Cancel an e-invoice
   */
  cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const { reason } = req.body;
      
      if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
      }

      if (!reason || reason.trim().length === 0) {
        throw BadRequestError('Cancellation reason is required');
      }

      const invoice = await prisma.salesHeader.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        throw NotFoundError('Invoice not found');
      }

      if (!invoice.einvoiceUUID) {
        throw BadRequestError('Invoice has not been submitted to MyInvois');
      }

      if (invoice.einvoiceStatus === EInvoiceStatus.CANCELLED) {
        throw BadRequestError('Invoice already cancelled');
      }

      const result = await einvoiceService.cancelInvoice(invoiceId, reason);

      if (result.success) {
        this.successResponse(res, {
          invoiceId,
          status: EInvoiceStatus.CANCELLED,
          message: 'E-Invoice cancelled successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          invoiceId,
          error: result.error,
          message: 'Failed to cancel e-invoice',
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/einvoice/preview/:invoiceId
   * Preview the generated e-invoice document (without submitting)
   */
  previewDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      
      if (isNaN(invoiceId)) {
        throw BadRequestError('Invalid invoice ID');
      }

      const invoice = await prisma.salesHeader.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        throw NotFoundError('Invoice not found');
      }

      // Validate first
      const validation = await einvoiceService.validateInvoice(invoiceId);
      
      let document = null;
      if (validation.valid) {
        document = await einvoiceService.generateDocument(invoiceId);
      }

      this.successResponse(res, {
        invoiceId,
        documentNo: invoice.documentNo,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
        },
        document: document,
        message: validation.valid 
          ? 'E-Invoice document generated successfully' 
          : 'Document cannot be generated due to validation errors',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/einvoice/batch-status
   * Get E-Invoice status for multiple invoices
   */
  getBatchStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, documentType, dateFrom, dateTo, page = 1, pageSize = 20 } = req.query;
      
      const where: any = {};
      
      // Filter by e-invoice status
      if (status) {
        where.einvoiceStatus = status as string;
      } else {
        // Only return invoices that have been submitted or are pending
        where.einvoiceStatus = { not: null };
      }

      // Filter by document type
      if (documentType) {
        where.documentType = documentType as string;
      } else {
        // Only invoiceable document types
        where.documentType = { in: ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'CASH_SALE'] };
      }

      // Date range filter
      if (dateFrom || dateTo) {
        where.documentDate = {};
        if (dateFrom) where.documentDate.gte = new Date(dateFrom as string);
        if (dateTo) where.documentDate.lte = new Date(dateTo as string);
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);

      const [invoices, total] = await Promise.all([
        prisma.salesHeader.findMany({
          where,
          select: {
            id: true,
            documentNo: true,
            documentType: true,
            documentDate: true,
            customerName: true,
            netTotal: true,
            einvoiceStatus: true,
            einvoiceUUID: true,
            einvoiceSubmittedAt: true,
            einvoiceValidatedAt: true,
            einvoiceQRUrl: true,
          },
          orderBy: { documentDate: 'desc' },
          skip,
          take,
        }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, invoices, total, Number(page), Number(pageSize));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/einvoice/batch-submit
   * Submit multiple invoices to MyInvois
   */
  batchSubmit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { invoiceIds } = req.body;

      if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        throw BadRequestError('invoiceIds must be a non-empty array');
      }

      if (invoiceIds.length > 50) {
        throw BadRequestError('Maximum 50 invoices per batch submission');
      }

      const results = [];
      
      for (const invoiceId of invoiceIds) {
        try {
          const result = await einvoiceService.submitInvoice(invoiceId);
          results.push({
            invoiceId,
            success: result.success,
            submissionId: result.submissionId,
            uuid: result.uuid,
            errors: result.errors,
          });
        } catch (error) {
          results.push({
            invoiceId,
            success: false,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.successResponse(res, {
        total: invoiceIds.length,
        successful,
        failed,
        results,
        message: `Batch submission completed: ${successful} succeeded, ${failed} failed`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/einvoice/pending
   * Get invoices pending e-invoice submission
   */
  getPendingInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(pageSize);
      const take = Number(pageSize);

      const where = {
        documentType: { in: ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'CASH_SALE'] },
        isPosted: true,
        isVoid: false,
        einvoiceStatus: null,
      };

      const [invoices, total] = await Promise.all([
        prisma.salesHeader.findMany({
          where,
          select: {
            id: true,
            documentNo: true,
            documentType: true,
            documentDate: true,
            customerName: true,
            netTotal: true,
          },
          orderBy: { documentDate: 'desc' },
          skip,
          take,
        }),
        prisma.salesHeader.count({ where }),
      ]);

      this.paginatedResponse(res, invoices, total, Number(page), Number(pageSize));
    } catch (error) {
      next(error);
    }
  };

  // Required abstract methods (not used directly)
  list = this.getBatchStatus;
  getById = this.getInvoiceStatus;
  create = this.submitInvoice;
  update = async (req: Request, res: Response, next: NextFunction) => {
    throw BadRequestError('E-Invoices cannot be updated');
  };
  delete = this.cancelInvoice;
}
