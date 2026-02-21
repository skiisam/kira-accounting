import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder interfaces for messaging platforms
interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface MessagePayload {
  platform: 'WHATSAPP' | 'TELEGRAM' | 'WECHAT';
  recipientPhone?: string;
  recipientChatId?: string;
  message: string;
  customerId?: number;
  documentType?: string;
  documentId?: number;
  documentNo?: string;
}

// Template variable replacements
interface TemplateVariables {
  customerName?: string;
  documentNo?: string;
  amount?: string;
  dueDate?: string;
  companyName?: string;
  invoiceDate?: string;
  paymentDate?: string;
  outstandingAmount?: string;
  link?: string;
  [key: string]: string | undefined;
}

export class MessagingService {
  
  /**
   * Get messaging configuration for a platform
   */
  async getConfig(platform: string) {
    return prisma.messagingConfig.findUnique({
      where: { platform }
    });
  }

  /**
   * Get all messaging configurations
   */
  async getAllConfigs() {
    return prisma.messagingConfig.findMany({
      orderBy: { platform: 'asc' }
    });
  }

  /**
   * Save or update messaging configuration
   */
  async saveConfig(platform: string, data: any, userId?: number) {
    const existing = await prisma.messagingConfig.findUnique({
      where: { platform }
    });

    if (existing) {
      return prisma.messagingConfig.update({
        where: { platform },
        data: {
          ...data,
          modifiedBy: userId,
          updatedAt: new Date()
        }
      });
    }

    return prisma.messagingConfig.create({
      data: {
        platform,
        ...data,
        createdBy: userId
      }
    });
  }

  /**
   * Send message via WhatsApp Business API (placeholder)
   */
  async sendWhatsApp(phone: string, message: string): Promise<SendMessageResult> {
    const config = await this.getConfig('WHATSAPP');
    
    if (!config?.isEnabled) {
      return { success: false, error: 'WhatsApp is not configured or enabled' };
    }

    // TODO: Implement actual WhatsApp Business API integration
    // For now, this is a placeholder that simulates success
    console.log(`[WhatsApp] Sending to ${phone}: ${message}`);
    
    // Placeholder API call
    // const response = await fetch('https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${config.whatsappApiToken}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     to: phone,
    //     type: 'text',
    //     text: { body: message }
    //   })
    // });

    return {
      success: true,
      messageId: `wa_${Date.now()}_placeholder`
    };
  }

  /**
   * Send message via Telegram Bot API (placeholder)
   */
  async sendTelegram(chatId: string, message: string): Promise<SendMessageResult> {
    const config = await this.getConfig('TELEGRAM');
    
    if (!config?.isEnabled) {
      return { success: false, error: 'Telegram is not configured or enabled' };
    }

    // TODO: Implement actual Telegram Bot API integration
    console.log(`[Telegram] Sending to ${chatId}: ${message}`);
    
    // Placeholder API call
    // const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     chat_id: chatId,
    //     text: message,
    //     parse_mode: 'HTML'
    //   })
    // });

    return {
      success: true,
      messageId: `tg_${Date.now()}_placeholder`
    };
  }

  /**
   * Send message via WeChat (placeholder)
   */
  async sendWeChat(openId: string, message: string): Promise<SendMessageResult> {
    const config = await this.getConfig('WECHAT');
    
    if (!config?.isEnabled) {
      return { success: false, error: 'WeChat is not configured or enabled' };
    }

    // TODO: Implement actual WeChat API integration
    console.log(`[WeChat] Sending to ${openId}: ${message}`);

    return {
      success: true,
      messageId: `wc_${Date.now()}_placeholder`
    };
  }

  /**
   * Send message and log it
   */
  async sendMessage(payload: MessagePayload, userId?: number): Promise<SendMessageResult> {
    let result: SendMessageResult;

    // Send based on platform
    switch (payload.platform) {
      case 'WHATSAPP':
        result = await this.sendWhatsApp(payload.recipientPhone || '', payload.message);
        break;
      case 'TELEGRAM':
        result = await this.sendTelegram(payload.recipientChatId || payload.recipientPhone || '', payload.message);
        break;
      case 'WECHAT':
        result = await this.sendWeChat(payload.recipientChatId || '', payload.message);
        break;
      default:
        result = { success: false, error: 'Unknown platform' };
    }

    // Log the message
    await prisma.messageLog.create({
      data: {
        platform: payload.platform,
        direction: 'OUTBOUND',
        recipientPhone: payload.recipientPhone,
        customerId: payload.customerId,
        body: payload.message,
        documentType: payload.documentType,
        documentId: payload.documentId,
        documentNo: payload.documentNo,
        status: result.success ? 'SENT' : 'FAILED',
        externalId: result.messageId,
        errorMessage: result.error,
        sentAt: result.success ? new Date() : null,
        createdBy: userId
      }
    });

    // Log as CRM activity if customer is linked
    if (result.success && payload.customerId) {
      await this.logCRMActivity(payload, userId);
    }

    return result;
  }

  /**
   * Log messaging activity in CRM
   */
  async logCRMActivity(payload: MessagePayload, userId?: number) {
    try {
      await prisma.cRMActivity.create({
        data: {
          customerId: payload.customerId,
          type: 'MESSAGE',
          subject: `${payload.platform} message sent`,
          description: `Sent via ${payload.platform}: ${payload.documentType || 'General'} ${payload.documentNo || ''}`,
          activityDate: new Date(),
          status: 'COMPLETED',
          priority: 'NORMAL',
          createdBy: userId
        }
      });
    } catch (error) {
      console.error('Failed to log CRM activity:', error);
    }
  }

  /**
   * Get message template by code
   */
  async getTemplate(code: string) {
    return prisma.messageTemplate.findUnique({
      where: { code }
    });
  }

  /**
   * Get all message templates
   */
  async getTemplates(category?: string) {
    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }
    return prisma.messageTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
  }

  /**
   * Create or update message template
   */
  async saveTemplate(data: any, userId?: number) {
    if (data.id) {
      return prisma.messageTemplate.update({
        where: { id: data.id },
        data: {
          ...data,
          modifiedBy: userId,
          updatedAt: new Date()
        }
      });
    }

    return prisma.messageTemplate.create({
      data: {
        ...data,
        createdBy: userId
      }
    });
  }

  /**
   * Delete message template
   */
  async deleteTemplate(id: number) {
    return prisma.messageTemplate.delete({
      where: { id }
    });
  }

  /**
   * Replace template variables
   */
  replaceTemplateVariables(template: string, variables: TemplateVariables): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }
    return result;
  }

  /**
   * Get message logs
   */
  async getMessageLogs(options: {
    customerId?: number;
    documentType?: string;
    documentId?: number;
    platform?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { customerId, documentType, documentId, platform, page = 1, pageSize = 20 } = options;
    
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (documentType) where.documentType = documentType;
    if (documentId) where.documentId = documentId;
    if (platform) where.platform = platform;

    const [data, total] = await Promise.all([
      prisma.messageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.messageLog.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Process incoming inquiry (from webhook)
   */
  async processInquiry(data: {
    platform: string;
    senderPhone?: string;
    senderName?: string;
    senderUsername?: string;
    message: string;
  }) {
    // Create inquiry record
    const inquiry = await prisma.messagingInquiry.create({
      data: {
        platform: data.platform,
        senderPhone: data.senderPhone,
        senderName: data.senderName,
        senderUsername: data.senderUsername,
        message: data.message,
        status: 'NEW'
      }
    });

    // Try to match to existing customer by phone
    if (data.senderPhone) {
      const customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: data.senderPhone },
            { mobile: data.senderPhone }
          ]
        }
      });

      if (customer) {
        await prisma.messagingInquiry.update({
          where: { id: inquiry.id },
          data: { customerId: customer.id }
        });

        // Log as CRM activity
        await prisma.cRMActivity.create({
          data: {
            customerId: customer.id,
            type: 'MESSAGE',
            subject: `Incoming ${data.platform} message`,
            description: data.message.substring(0, 500),
            activityDate: new Date(),
            status: 'COMPLETED',
            priority: 'NORMAL'
          }
        });
      }
    }

    // Log inbound message
    await prisma.messageLog.create({
      data: {
        platform: data.platform,
        direction: 'INBOUND',
        recipientPhone: data.senderPhone,
        recipientName: data.senderName,
        body: data.message,
        status: 'DELIVERED'
      }
    });

    return inquiry;
  }

  /**
   * Get inquiries
   */
  async getInquiries(options: {
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { status, page = 1, pageSize = 20 } = options;
    
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.messagingInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.messagingInquiry.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Convert inquiry to CRM lead
   */
  async convertInquiryToLead(inquiryId: number, userId?: number) {
    const inquiry = await prisma.messagingInquiry.findUnique({
      where: { id: inquiryId }
    });

    if (!inquiry) {
      throw new Error('Inquiry not found');
    }

    // Generate lead code
    const lastLead = await prisma.cRMLead.findFirst({
      orderBy: { id: 'desc' }
    });
    const nextNum = (lastLead?.id || 0) + 1;
    const code = `LEAD${String(nextNum).padStart(5, '0')}`;

    // Create lead
    const lead = await prisma.cRMLead.create({
      data: {
        code,
        companyName: inquiry.senderName || 'Unknown',
        contactName: inquiry.senderName,
        phone: inquiry.senderPhone,
        source: inquiry.platform,
        status: 'NEW',
        description: inquiry.message,
        createdBy: userId
      }
    });

    // Update inquiry
    await prisma.messagingInquiry.update({
      where: { id: inquiryId },
      data: {
        status: 'CONVERTED',
        crmLeadId: lead.id,
        processedBy: userId,
        processedAt: new Date()
      }
    });

    return lead;
  }
}

export const messagingService = new MessagingService();
