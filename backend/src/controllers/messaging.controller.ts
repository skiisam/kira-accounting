import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import { messagingService } from '../services/messaging.service';

interface BatchInvoiceResult {
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  status: 'sent' | 'failed';
  error?: string;
  messageId?: string;
}

interface BatchPaymentNotificationResult {
  paymentId: number;
  paymentNo: string;
  vendorName: string;
  status: 'sent' | 'failed';
  error?: string;
  messageId?: string;
}

export class MessagingController extends BaseController<any> {
  protected modelName = 'Messaging';

  /**
   * POST /messaging/batch-invoices
   * Send invoices in batch to customers via email/WhatsApp
   */
  batchSendInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { invoiceIds, channel, message } = req.body;
      const userId = (req as any).user?.userId;

      // Validate input
      if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
        throw BadRequestError('invoiceIds array is required');
      }
      if (!channel || !['email', 'whatsapp'].includes(channel)) {
        throw BadRequestError('channel must be either "email" or "whatsapp"');
      }

      // Fetch invoices with customer details
      const invoices = await prisma.aRInvoice.findMany({
        where: {
          id: { in: invoiceIds },
        },
        include: {
          customer: true,
        },
      });

      if (invoices.length === 0) {
        throw BadRequestError('No valid invoices found');
      }

      // Get invoice notification template
      const template = await messagingService.getTemplate('INVOICE_NOTIFICATION');

      // Process each invoice
      const results: BatchInvoiceResult[] = [];

      for (const invoice of invoices) {
        const customer = invoice.customer;
        
        // Check if customer has contact info for the selected channel
        let recipientContact: string | null = null;
        if (channel === 'email') {
          recipientContact = customer?.email || null;
        } else if (channel === 'whatsapp') {
          recipientContact = customer?.mobile || customer?.phone || null;
        }

        if (!recipientContact) {
          results.push({
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo,
            customerName: invoice.customerName || customer?.name || 'Unknown',
            status: 'failed',
            error: `Customer has no ${channel === 'email' ? 'email address' : 'phone number'}`,
          });
          continue;
        }

        // Prepare template variables
        const templateVars = {
          customerName: invoice.customerName || customer?.name || 'Customer',
          documentNo: invoice.invoiceNo,
          amount: new Intl.NumberFormat('en-MY', { 
            style: 'currency', 
            currency: invoice.currencyCode || 'MYR' 
          }).format(Number(invoice.netTotal) || 0),
          dueDate: invoice.dueDate 
            ? new Date(invoice.dueDate).toLocaleDateString('en-MY') 
            : 'N/A',
          companyName: 'Our Company', // TODO: Get from company settings
          outstandingAmount: new Intl.NumberFormat('en-MY', { 
            style: 'currency', 
            currency: invoice.currencyCode || 'MYR' 
          }).format(Number(invoice.outstandingAmount) || 0),
        };

        // Build message body
        let messageBody = message;
        if (!messageBody && template) {
          messageBody = messagingService.replaceTemplateVariables(template.body, templateVars);
        } else if (!messageBody) {
          messageBody = `Dear ${templateVars.customerName},\n\nYour invoice ${templateVars.documentNo} for ${templateVars.amount} is ready.\nDue Date: ${templateVars.dueDate}\n\nThank you for your business.`;
        } else {
          // Replace variables in custom message
          messageBody = messagingService.replaceTemplateVariables(messageBody, templateVars);
        }

        try {
          if (channel === 'email') {
            // Email sending via messaging service or dedicated email service
            const result = await messagingService.sendEmail({
              to: recipientContact,
              subject: `Invoice ${invoice.invoiceNo} - ${templateVars.companyName}`,
              body: messageBody,
              customerId: customer?.id,
              documentType: 'INVOICE',
              documentId: invoice.id,
              documentNo: invoice.invoiceNo,
            }, userId);

            results.push({
              invoiceId: invoice.id,
              invoiceNo: invoice.invoiceNo,
              customerName: invoice.customerName || customer?.name || 'Unknown',
              status: result.success ? 'sent' : 'failed',
              error: result.error,
              messageId: result.messageId,
            });
          } else {
            // WhatsApp sending
            const result = await messagingService.sendMessage({
              platform: 'WHATSAPP',
              recipientPhone: recipientContact,
              message: messageBody,
              customerId: customer?.id,
              documentType: 'INVOICE',
              documentId: invoice.id,
              documentNo: invoice.invoiceNo,
            }, userId);

            results.push({
              invoiceId: invoice.id,
              invoiceNo: invoice.invoiceNo,
              customerName: invoice.customerName || customer?.name || 'Unknown',
              status: result.success ? 'sent' : 'failed',
              error: result.error,
              messageId: result.messageId,
            });
          }
        } catch (error: any) {
          results.push({
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo,
            customerName: invoice.customerName || customer?.name || 'Unknown',
            status: 'failed',
            error: error.message || 'Unknown error',
          });
        }
      }

      // Calculate summary
      const summary = {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
      };

      this.successResponse(res, { results, summary }, 'Batch send completed');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /messaging/batch-payment-notifications
   * Notify vendors about payments
   */
  batchPaymentNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { paymentIds, channel, message } = req.body;
      const userId = (req as any).user?.userId;

      // Validate input
      if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
        throw BadRequestError('paymentIds array is required');
      }
      if (!channel || !['email', 'whatsapp'].includes(channel)) {
        throw BadRequestError('channel must be either "email" or "whatsapp"');
      }

      // Fetch payments with vendor details
      const payments = await prisma.aPPayment.findMany({
        where: {
          id: { in: paymentIds },
        },
        include: {
          vendor: true,
        },
      });

      if (payments.length === 0) {
        throw BadRequestError('No valid payments found');
      }

      // Get payment notification template
      const template = await messagingService.getTemplate('VENDOR_PAYMENT_NOTIFICATION');

      // Process each payment
      const results: BatchPaymentNotificationResult[] = [];

      for (const payment of payments) {
        const vendor = payment.vendor;
        
        // Check if vendor has contact info for the selected channel
        let recipientContact: string | null = null;
        if (channel === 'email') {
          recipientContact = vendor?.email || null;
        } else if (channel === 'whatsapp') {
          recipientContact = vendor?.mobile || vendor?.phone || null;
        }

        if (!recipientContact) {
          results.push({
            paymentId: payment.id,
            paymentNo: payment.paymentNo,
            vendorName: payment.vendorName || vendor?.name || 'Unknown',
            status: 'failed',
            error: `Vendor has no ${channel === 'email' ? 'email address' : 'phone number'}`,
          });
          continue;
        }

        // Prepare template variables
        const templateVars = {
          vendorName: payment.vendorName || vendor?.name || 'Vendor',
          documentNo: payment.paymentNo,
          amount: new Intl.NumberFormat('en-MY', { 
            style: 'currency', 
            currency: payment.currencyCode || 'MYR' 
          }).format(Number(payment.paymentAmount) || 0),
          paymentDate: payment.paymentDate 
            ? new Date(payment.paymentDate).toLocaleDateString('en-MY') 
            : 'N/A',
          companyName: 'Our Company', // TODO: Get from company settings
          paymentMethod: payment.paymentMethod || 'N/A',
          reference: payment.reference || 'N/A',
        };

        // Build message body
        let messageBody = message;
        if (!messageBody && template) {
          messageBody = messagingService.replaceTemplateVariables(template.body, templateVars);
        } else if (!messageBody) {
          messageBody = `Dear ${templateVars.vendorName},\n\nWe have processed a payment of ${templateVars.amount} on ${templateVars.paymentDate}.\nPayment Reference: ${templateVars.documentNo}\n\nPlease confirm receipt.\n\nBest regards,\n${templateVars.companyName}`;
        } else {
          // Replace variables in custom message
          messageBody = messagingService.replaceTemplateVariables(messageBody, templateVars);
        }

        try {
          if (channel === 'email') {
            const result = await messagingService.sendEmail({
              to: recipientContact,
              subject: `Payment Notification - ${payment.paymentNo}`,
              body: messageBody,
              vendorId: vendor?.id,
              documentType: 'PAYMENT',
              documentId: payment.id,
              documentNo: payment.paymentNo,
            }, userId);

            results.push({
              paymentId: payment.id,
              paymentNo: payment.paymentNo,
              vendorName: payment.vendorName || vendor?.name || 'Unknown',
              status: result.success ? 'sent' : 'failed',
              error: result.error,
              messageId: result.messageId,
            });
          } else {
            const result = await messagingService.sendMessage({
              platform: 'WHATSAPP',
              recipientPhone: recipientContact,
              message: messageBody,
              vendorId: vendor?.id,
              documentType: 'PAYMENT',
              documentId: payment.id,
              documentNo: payment.paymentNo,
            }, userId);

            results.push({
              paymentId: payment.id,
              paymentNo: payment.paymentNo,
              vendorName: payment.vendorName || vendor?.name || 'Unknown',
              status: result.success ? 'sent' : 'failed',
              error: result.error,
              messageId: result.messageId,
            });
          }
        } catch (error: any) {
          results.push({
            paymentId: payment.id,
            paymentNo: payment.paymentNo,
            vendorName: payment.vendorName || vendor?.name || 'Unknown',
            status: 'failed',
            error: error.message || 'Unknown error',
          });
        }
      }

      // Calculate summary
      const summary = {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
      };

      this.successResponse(res, { results, summary }, 'Batch notification completed');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /messaging/invoices
   * Get invoices available for batch sending with filtering
   */
  getInvoicesForBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const { customerId, status, fromDate, toDate, search } = req.query;

      const where: any = {};

      if (customerId) {
        where.customerId = parseInt(customerId as string);
      }

      if (status) {
        where.status = status;
      }

      if (fromDate || toDate) {
        where.invoiceDate = {};
        if (fromDate) {
          where.invoiceDate.gte = new Date(fromDate as string);
        }
        if (toDate) {
          where.invoiceDate.lte = new Date(toDate as string);
        }
      }

      if (search) {
        where.OR = [
          { invoiceNo: { contains: search as string, mode: 'insensitive' } },
          { customerName: { contains: search as string, mode: 'insensitive' } },
          { customerCode: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [invoices, total] = await Promise.all([
        prisma.aRInvoice.findMany({
          where,
          skip,
          take,
          orderBy: { invoiceDate: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                name: true,
                email: true,
                phone: true,
                mobile: true,
              },
            },
          },
        }),
        prisma.aRInvoice.count({ where }),
      ]);

      this.paginatedResponse(res, invoices, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  // Required base methods
  list = this.getInvoicesForBatch;
  getById = async (req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ success: false, error: { message: 'Not implemented' } });
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ success: false, error: { message: 'Not implemented' } });
  };
  update = async (req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ success: false, error: { message: 'Not implemented' } });
  };
  delete = async (req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ success: false, error: { message: 'Not implemented' } });
  };
}

export const messagingController = new MessagingController();
