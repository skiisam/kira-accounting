import { Router, Request, Response } from 'express';
import { messagingService } from '../services/messaging.service';
import { prisma } from '../config/database';

const router = Router();

// =====================================================
// MESSAGING CONFIGURATION
// =====================================================

/**
 * GET /messaging/config
 * Get all messaging configurations
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const configs = await messagingService.getAllConfigs();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * GET /messaging/config/:platform
 * Get configuration for a specific platform
 */
router.get('/config/:platform', async (req: Request, res: Response) => {
  try {
    const config = await messagingService.getConfig(req.params.platform.toUpperCase());
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/config/:platform
 * Save configuration for a platform
 */
router.post('/config/:platform', async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase();
    const userId = (req as any).user?.id;
    const config = await messagingService.saveConfig(platform, req.body, userId);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SAVE_ERROR', message: error.message }
    });
  }
});

// =====================================================
// MESSAGE TEMPLATES
// =====================================================

/**
 * GET /messaging/templates
 * Get all message templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const templates = await messagingService.getTemplates(category as string | undefined);
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * GET /messaging/templates/:code
 * Get a specific template by code
 */
router.get('/templates/:code', async (req: Request, res: Response) => {
  try {
    const template = await messagingService.getTemplate(req.params.code);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' }
      });
    }
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/templates
 * Create or update a message template
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const template = await messagingService.saveTemplate(req.body, userId);
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SAVE_ERROR', message: error.message }
    });
  }
});

/**
 * DELETE /messaging/templates/:id
 * Delete a message template
 */
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    await messagingService.deleteTemplate(parseInt(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message }
    });
  }
});

// =====================================================
// SEND MESSAGES
// =====================================================

/**
 * POST /messaging/send
 * Send a message via specified platform
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { platform, recipientPhone, recipientChatId, message, customerId, documentType, documentId, documentNo } = req.body;

    if (!platform || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Platform and message are required' }
      });
    }

    const result = await messagingService.sendMessage({
      platform: platform.toUpperCase(),
      recipientPhone,
      recipientChatId,
      message,
      customerId,
      documentType,
      documentId,
      documentNo
    }, userId);

    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({
        success: false,
        error: { code: 'SEND_ERROR', message: result.error }
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/send-invoice
 * Send invoice via messaging
 */
router.post('/send-invoice', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { platform, invoiceId, recipientPhone, customMessage } = req.body;

    // Get invoice details (placeholder - would fetch from DB)
    // const invoice = await prisma.aRInvoice.findUnique({ where: { id: invoiceId }, include: { customer: true } });
    
    // For now, use provided data or mock
    const templateVars = {
      customerName: req.body.customerName || 'Customer',
      documentNo: req.body.invoiceNo || `INV-${invoiceId}`,
      amount: req.body.amount || '0.00',
      dueDate: req.body.dueDate || 'N/A',
      companyName: req.body.companyName || 'Our Company'
    };

    // Get template
    const template = await messagingService.getTemplate('INVOICE_NOTIFICATION');
    const messageBody = template 
      ? messagingService.replaceTemplateVariables(template.body, templateVars)
      : customMessage || `Invoice ${templateVars.documentNo} for ${templateVars.amount} is ready. Due: ${templateVars.dueDate}`;

    const result = await messagingService.sendMessage({
      platform: platform.toUpperCase(),
      recipientPhone,
      message: messageBody,
      customerId: req.body.customerId,
      documentType: 'INVOICE',
      documentId: invoiceId,
      documentNo: templateVars.documentNo
    }, userId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/send-statement
 * Send customer statement via messaging
 */
router.post('/send-statement', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { platform, customerId, recipientPhone, statementDate, totalOutstanding } = req.body;

    const templateVars = {
      customerName: req.body.customerName || 'Customer',
      statementDate: statementDate || new Date().toISOString().split('T')[0],
      outstandingAmount: totalOutstanding || '0.00',
      companyName: req.body.companyName || 'Our Company'
    };

    const template = await messagingService.getTemplate('STATEMENT_NOTIFICATION');
    const messageBody = template 
      ? messagingService.replaceTemplateVariables(template.body, templateVars)
      : `Your statement as of ${templateVars.statementDate} shows an outstanding balance of ${templateVars.outstandingAmount}.`;

    const result = await messagingService.sendMessage({
      platform: platform.toUpperCase(),
      recipientPhone,
      message: messageBody,
      customerId,
      documentType: 'STATEMENT',
      documentNo: `STMT-${customerId}-${statementDate}`
    }, userId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/send-reminder
 * Send payment reminder via messaging
 */
router.post('/send-reminder', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { platform, invoiceId, recipientPhone, daysOverdue } = req.body;

    const templateVars = {
      customerName: req.body.customerName || 'Customer',
      documentNo: req.body.invoiceNo || `INV-${invoiceId}`,
      amount: req.body.outstandingAmount || '0.00',
      daysOverdue: String(daysOverdue || 0),
      companyName: req.body.companyName || 'Our Company'
    };

    const template = await messagingService.getTemplate('PAYMENT_REMINDER');
    const messageBody = template 
      ? messagingService.replaceTemplateVariables(template.body, templateVars)
      : `Reminder: Invoice ${templateVars.documentNo} for ${templateVars.amount} is ${templateVars.daysOverdue} days overdue. Please arrange payment.`;

    const result = await messagingService.sendMessage({
      platform: platform.toUpperCase(),
      recipientPhone,
      message: messageBody,
      customerId: req.body.customerId,
      documentType: 'PAYMENT_REMINDER',
      documentId: invoiceId,
      documentNo: templateVars.documentNo
    }, userId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/send-receipt
 * Send payment receipt via messaging
 */
router.post('/send-receipt', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { platform, paymentId, recipientPhone } = req.body;

    const templateVars = {
      customerName: req.body.customerName || 'Customer',
      documentNo: req.body.receiptNo || `REC-${paymentId}`,
      amount: req.body.paymentAmount || '0.00',
      paymentDate: req.body.paymentDate || new Date().toISOString().split('T')[0],
      companyName: req.body.companyName || 'Our Company'
    };

    const template = await messagingService.getTemplate('RECEIPT_NOTIFICATION');
    const messageBody = template 
      ? messagingService.replaceTemplateVariables(template.body, templateVars)
      : `Thank you for your payment of ${templateVars.amount}. Receipt No: ${templateVars.documentNo}`;

    const result = await messagingService.sendMessage({
      platform: platform.toUpperCase(),
      recipientPhone,
      message: messageBody,
      customerId: req.body.customerId,
      documentType: 'RECEIPT',
      documentId: paymentId,
      documentNo: templateVars.documentNo
    }, userId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: error.message }
    });
  }
});

// =====================================================
// MESSAGE LOGS
// =====================================================

/**
 * GET /messaging/logs
 * Get message logs
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { customerId, documentType, documentId, platform, page, pageSize } = req.query;
    const logs = await messagingService.getMessageLogs({
      customerId: customerId ? parseInt(customerId as string) : undefined,
      documentType: documentType as string | undefined,
      documentId: documentId ? parseInt(documentId as string) : undefined,
      platform: platform as string | undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20
    });
    res.json({ success: true, ...logs });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

// =====================================================
// INQUIRIES
// =====================================================

/**
 * GET /messaging/inquiries
 * Get incoming inquiries
 */
router.get('/inquiries', async (req: Request, res: Response) => {
  try {
    const { status, page, pageSize } = req.query;
    const inquiries = await messagingService.getInquiries({
      status: status as string | undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20
    });
    res.json({ success: true, ...inquiries });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/inquiries/:id/convert-to-lead
 * Convert inquiry to CRM lead
 */
router.post('/inquiries/:id/convert-to-lead', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const lead = await messagingService.convertInquiryToLead(parseInt(req.params.id), userId);
    res.json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CONVERT_ERROR', message: error.message }
    });
  }
});

// =====================================================
// BATCH SOA (Statement of Account)
// =====================================================

/**
 * GET /messaging/customers-with-balance
 * Get customers with outstanding balance for batch SOA
 */
router.get('/customers-with-balance', async (req: Request, res: Response) => {
  try {
    const asOfDate = req.query.asOfDate 
      ? new Date(req.query.asOfDate as string)
      : new Date();

    // Get customers with outstanding AR invoices
    const customersWithBalance = await prisma.customer.findMany({
      where: {
        isActive: true,
        arInvoices: {
          some: {
            status: 'OPEN',
            isVoid: false,
            outstandingAmount: { gt: 0 }
          }
        }
      },
      include: {
        arInvoices: {
          where: {
            status: 'OPEN',
            isVoid: false,
            outstandingAmount: { gt: 0 }
          },
          select: {
            id: true,
            invoiceNo: true,
            invoiceDate: true,
            dueDate: true,
            netTotal: true,
            outstandingAmount: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    // Calculate totals and aging for each customer
    const result = customersWithBalance.map(customer => {
      const totalOutstanding = customer.arInvoices.reduce(
        (sum, inv) => sum + Number(inv.outstandingAmount), 0
      );

      // Calculate aging buckets
      const aging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };
      customer.arInvoices.forEach(inv => {
        const dueDate = inv.dueDate || inv.invoiceDate;
        const daysDue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = Number(inv.outstandingAmount);

        if (daysDue <= 0) aging.current += amount;
        else if (daysDue <= 30) aging.days1to30 += amount;
        else if (daysDue <= 60) aging.days31to60 += amount;
        else if (daysDue <= 90) aging.days61to90 += amount;
        else aging.over90 += amount;
      });

      return {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        totalOutstanding,
        invoiceCount: customer.arInvoices.length,
        aging
      };
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/batch-soa
 * Send SOA (Statement of Account) to multiple customers
 */
router.post('/batch-soa', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { customerIds, asOfDate, channel, includeAging } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'customerIds array is required' }
      });
    }

    if (!channel || !['email', 'whatsapp'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channel must be "email" or "whatsapp"' }
      });
    }

    const statementDate = asOfDate ? new Date(asOfDate) : new Date();
    const results: Array<{ customerId: number; customerCode: string; success: boolean; error?: string; messageId?: string }> = [];

    // Get company info for template
    const company = await prisma.company.findFirst({ where: { isActive: true } });
    const companyName = company?.name || 'Our Company';

    // Process each customer
    for (const customerId of customerIds) {
      try {
        // Get customer details
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          include: {
            arInvoices: {
              where: {
                status: 'OPEN',
                isVoid: false,
                outstandingAmount: { gt: 0 }
              },
              orderBy: { invoiceDate: 'asc' }
            }
          }
        });

        if (!customer) {
          results.push({ customerId, customerCode: 'UNKNOWN', success: false, error: 'Customer not found' });
          continue;
        }

        // Check if customer has contact info for the channel
        const contactInfo = channel === 'email' ? customer.email : (customer.mobile || customer.phone);
        if (!contactInfo) {
          results.push({ 
            customerId, 
            customerCode: customer.code, 
            success: false, 
            error: `No ${channel === 'email' ? 'email' : 'phone number'} on file` 
          });
          continue;
        }

        // Calculate totals
        const totalOutstanding = customer.arInvoices.reduce(
          (sum, inv) => sum + Number(inv.outstandingAmount), 0
        );

        // Build aging breakdown if requested
        let agingText = '';
        if (includeAging) {
          const aging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };
          customer.arInvoices.forEach(inv => {
            const dueDate = inv.dueDate || inv.invoiceDate;
            const daysDue = Math.floor((statementDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const amount = Number(inv.outstandingAmount);

            if (daysDue <= 0) aging.current += amount;
            else if (daysDue <= 30) aging.days1to30 += amount;
            else if (daysDue <= 60) aging.days31to60 += amount;
            else if (daysDue <= 90) aging.days61to90 += amount;
            else aging.over90 += amount;
          });

          agingText = `\n\nAging Breakdown:\n` +
            `• Current: ${aging.current.toFixed(2)}\n` +
            `• 1-30 days: ${aging.days1to30.toFixed(2)}\n` +
            `• 31-60 days: ${aging.days31to60.toFixed(2)}\n` +
            `• 61-90 days: ${aging.days61to90.toFixed(2)}\n` +
            `• Over 90 days: ${aging.over90.toFixed(2)}`;
        }

        // Build invoice list
        const invoiceList = customer.arInvoices.slice(0, 10).map(inv => 
          `• ${inv.invoiceNo}: ${Number(inv.outstandingAmount).toFixed(2)} (Due: ${inv.dueDate?.toISOString().split('T')[0] || 'N/A'})`
        ).join('\n');
        const moreInvoices = customer.arInvoices.length > 10 
          ? `\n... and ${customer.arInvoices.length - 10} more invoices` 
          : '';

        // Get or create message
        const template = await messagingService.getTemplate('STATEMENT_NOTIFICATION');
        const messageBody = template 
          ? messagingService.replaceTemplateVariables(template.body, {
              customerName: customer.name,
              statementDate: statementDate.toISOString().split('T')[0],
              outstandingAmount: totalOutstanding.toFixed(2),
              companyName
            }) + agingText
          : `Dear ${customer.name},\n\n` +
            `Statement of Account as of ${statementDate.toISOString().split('T')[0]}\n\n` +
            `Total Outstanding: ${totalOutstanding.toFixed(2)}\n\n` +
            `Outstanding Invoices:\n${invoiceList}${moreInvoices}` +
            agingText +
            `\n\nPlease arrange payment at your earliest convenience.\n\n` +
            `Thank you,\n${companyName}`;

        // Send message
        const platform = channel === 'email' ? 'EMAIL' : 'WHATSAPP';
        const result = await messagingService.sendMessage({
          platform: platform as any,
          recipientPhone: customer.mobile || customer.phone,
          message: messageBody,
          customerId: customer.id,
          documentType: 'STATEMENT',
          documentNo: `SOA-${customer.code}-${statementDate.toISOString().split('T')[0]}`
        }, userId);

        results.push({
          customerId,
          customerCode: customer.code,
          success: result.success,
          error: result.error,
          messageId: result.messageId
        });
      } catch (err: any) {
        results.push({
          customerId,
          customerCode: 'UNKNOWN',
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        summary: {
          total: customerIds.length,
          sent: successCount,
          failed: failCount
        },
        results
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'BATCH_SOA_ERROR', message: error.message }
    });
  }
});

/**
 * GET /messaging/vendor-payments
 * Get recent AP payments for batch notification
 */
router.get('/vendor-payments', async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    const payments = await prisma.aPPayment.findMany({
      where: {
        isVoid: false,
        paymentDate: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            phone: true,
            mobile: true
          }
        },
        knockoffs: {
          select: {
            documentNo: true,
            knockoffAmount: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const result = payments.map(payment => ({
      id: payment.id,
      paymentNo: payment.paymentNo,
      paymentDate: payment.paymentDate,
      paymentAmount: Number(payment.paymentAmount),
      chequeNo: payment.chequeNo,
      reference: payment.reference,
      vendor: payment.vendor,
      knockoffs: payment.knockoffs.map(k => ({
        invoiceNo: k.documentNo,
        amount: Number(k.knockoffAmount)
      }))
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /messaging/batch-payment-notify
 * Send payment notification (remittance advice) to vendors
 */
router.post('/batch-payment-notify', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { paymentIds, channel } = req.body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'paymentIds array is required' }
      });
    }

    if (!channel || !['email', 'whatsapp'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channel must be "email" or "whatsapp"' }
      });
    }

    const results: Array<{ paymentId: number; paymentNo: string; vendorCode: string; success: boolean; error?: string; messageId?: string }> = [];

    // Get company info for template
    const company = await prisma.company.findFirst({ where: { isActive: true } });
    const companyName = company?.name || 'Our Company';

    // Process each payment
    for (const paymentId of paymentIds) {
      try {
        // Get payment details
        const payment = await prisma.aPPayment.findUnique({
          where: { id: paymentId },
          include: {
            vendor: true,
            knockoffs: true
          }
        });

        if (!payment) {
          results.push({ paymentId, paymentNo: 'UNKNOWN', vendorCode: 'UNKNOWN', success: false, error: 'Payment not found' });
          continue;
        }

        // Check if vendor has contact info for the channel
        const contactInfo = channel === 'email' ? payment.vendor.email : (payment.vendor.mobile || payment.vendor.phone);
        if (!contactInfo) {
          results.push({ 
            paymentId, 
            paymentNo: payment.paymentNo,
            vendorCode: payment.vendor.code, 
            success: false, 
            error: `No ${channel === 'email' ? 'email' : 'phone number'} on file` 
          });
          continue;
        }

        // Build invoices paid list
        const invoiceList = payment.knockoffs.map(k => 
          `• ${k.documentNo}: ${Number(k.knockoffAmount).toFixed(2)}`
        ).join('\n');

        // Build message
        const messageBody = `Dear ${payment.vendor.name},\n\n` +
          `Payment Notification from ${companyName}\n\n` +
          `Payment Details:\n` +
          `• Payment No: ${payment.paymentNo}\n` +
          `• Payment Date: ${payment.paymentDate.toISOString().split('T')[0]}\n` +
          `• Amount: ${Number(payment.paymentAmount).toFixed(2)} ${payment.currencyCode}\n` +
          (payment.chequeNo ? `• Cheque No: ${payment.chequeNo}\n` : '') +
          (payment.reference ? `• Reference: ${payment.reference}\n` : '') +
          `\nInvoices Paid:\n${invoiceList}\n\n` +
          `Thank you for your business.\n\n` +
          `Best regards,\n${companyName}`;

        // Send message
        const platform = channel === 'email' ? 'EMAIL' : 'WHATSAPP';
        const result = await messagingService.sendMessage({
          platform: platform as any,
          recipientPhone: payment.vendor.mobile || payment.vendor.phone,
          message: messageBody,
          documentType: 'PAYMENT_NOTIFICATION',
          documentId: payment.id,
          documentNo: payment.paymentNo
        }, userId);

        results.push({
          paymentId,
          paymentNo: payment.paymentNo,
          vendorCode: payment.vendor.code,
          success: result.success,
          error: result.error,
          messageId: result.messageId
        });
      } catch (err: any) {
        results.push({
          paymentId,
          paymentNo: 'UNKNOWN',
          vendorCode: 'UNKNOWN',
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        summary: {
          total: paymentIds.length,
          sent: successCount,
          failed: failCount
        },
        results
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'BATCH_PAYMENT_NOTIFY_ERROR', message: error.message }
    });
  }
});

// =====================================================
// WEBHOOKS
// =====================================================

/**
 * POST /messaging/webhook/whatsapp
 * WhatsApp webhook endpoint
 */
router.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  try {
    // TODO: Verify webhook signature
    const { entry } = req.body;

    // Process incoming messages
    if (entry && Array.isArray(entry)) {
      for (const e of entry) {
        const changes = e.changes || [];
        for (const change of changes) {
          if (change.value?.messages) {
            for (const msg of change.value.messages) {
              await messagingService.processInquiry({
                platform: 'WHATSAPP',
                senderPhone: msg.from,
                senderName: change.value.contacts?.[0]?.profile?.name,
                message: msg.text?.body || msg.type
              });
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    res.status(200).send('OK'); // Always return 200 for webhooks
  }
});

/**
 * GET /messaging/webhook/whatsapp
 * WhatsApp webhook verification
 */
router.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // TODO: Verify token against config
  if (mode === 'subscribe') {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /messaging/webhook/telegram
 * Telegram webhook endpoint
 */
router.post('/webhook/telegram', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (message?.text) {
      await messagingService.processInquiry({
        platform: 'TELEGRAM',
        senderPhone: message.from?.id?.toString(),
        senderName: `${message.from?.first_name || ''} ${message.from?.last_name || ''}`.trim(),
        senderUsername: message.from?.username,
        message: message.text
      });
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    res.status(200).send('OK');
  }
});

export default router;
