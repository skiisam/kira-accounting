import { Router, Request, Response } from 'express';
import { messagingService } from '../services/messaging.service';

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
