import { Router, Request, Response } from 'express';

const router = Router();

// Knowledge base for rule-based responses
const knowledgeBase: { keywords: string[]; response: string }[] = [
  {
    keywords: ['create invoice', 'make invoice', 'new invoice', 'how to invoice'],
    response: `📝 **How to Create an Invoice:**

1. Go to **Sales → Invoices** from the sidebar
2. Click the **"New Invoice"** button (top right)
3. Select a customer from the dropdown
4. Add line items:
   - Search for products or enter description
   - Set quantity and unit price
   - Tax is calculated automatically
5. Review the totals
6. Click **"Save"** to create as draft, or **"Save & Approve"** to finalize

💡 **Tips:**
- You can convert a Sales Order directly to an Invoice
- Use the preview feature before sending to customers
- Export to PDF for professional documents`,
  },
  {
    keywords: ['forgot password', 'reset password', 'change password', 'lost password'],
    response: `🔐 **Password Reset Instructions:**

1. Go to the login page
2. Click **"Forgot Password?"** link
3. Enter your registered email address
4. Check your inbox for the reset link
5. Click the link and create a new password

⚠️ **Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number

If you don't receive the email:
- Check your spam/junk folder
- Contact your admin to reset manually
- Email: support@kira-accounting.com`,
  },
  {
    keywords: ['pricing', 'price', 'cost', 'subscription', 'plan', 'how much'],
    response: `💰 **KIRA Pricing Plans:**

**🌟 Starter** - RM99/month
- Up to 3 users
- 500 invoices/month
- Basic reports
- Email support

**🚀 Professional** - RM299/month
- Up to 10 users
- Unlimited invoices
- Advanced reports & analytics
- AI document scanning
- Priority support

**🏢 Enterprise** - Custom pricing
- Unlimited users
- Custom integrations
- Dedicated account manager
- On-premise option available

📧 Contact sales@kira-accounting.com for custom quotes
🎁 14-day free trial available for all plans!`,
  },
  {
    keywords: ['quotation', 'quote', 'create quotation', 'make quote'],
    response: `📋 **How to Create a Quotation:**

1. Navigate to **Sales → Quotations**
2. Click **"New Quotation"**
3. Fill in the details:
   - Select customer
   - Set validity date
   - Add products/services
4. Click **"Save"**

**Converting to Sales Order:**
- Open the approved quotation
- Click **"Convert to Sales Order"**
- The system will auto-populate all details

💡 Quotations help track potential sales before commitment!`,
  },
  {
    keywords: ['customer', 'add customer', 'new customer', 'create customer'],
    response: `👥 **Adding a New Customer:**

1. Go to **Customers** in the sidebar
2. Click **"Add Customer"**
3. Fill in required fields:
   - Company/Customer name
   - Contact person
   - Email & phone
   - Address (for invoicing)
4. Click **"Save"**

💡 You can also add customers directly when creating invoices!`,
  },
  {
    keywords: ['product', 'add product', 'inventory', 'stock', 'item'],
    response: `📦 **Managing Products:**

**Adding a Product:**
1. Go to **Products** menu
2. Click **"Add Product"**
3. Enter details:
   - Product name & code
   - Category
   - Selling price & cost
   - Tax type
4. Save the product

**Stock Balance:**
- View at **Stock Balance** menu
- Shows qty on hand per location

💡 Enable batch/serial tracking in Settings for advanced inventory!`,
  },
  {
    keywords: ['report', 'reports', 'financial', 'statement'],
    response: `📊 **Available Reports:**

**Financial:**
- Profit & Loss Statement
- Balance Sheet
- Cash Flow Statement
- Trial Balance

**Sales:**
- Sales by Customer
- Sales by Product
- Outstanding Invoices

**Purchases:**
- Purchase Analysis
- Vendor Aging

Go to **Reports** menu to access all reports. Export to PDF or Excel available!`,
  },
  {
    keywords: ['payment', 'receive payment', 'record payment'],
    response: `💵 **Recording Payments:**

**For Customer Payments:**
1. Go to **Receivables → Receipts**
2. Click **"New Receipt"**
3. Select customer and invoice
4. Enter amount received
5. Choose payment method
6. Save

**For Vendor Payments:**
1. Go to **Payables → Payments**
2. Select vendor and invoice
3. Enter payment details
4. Save

Payments auto-update invoice status and ledger!`,
  },
  {
    keywords: ['help', 'support', 'contact', 'assistance'],
    response: `🤝 **Need More Help?**

**Self-Service:**
- Check our documentation at docs.kira-accounting.com
- Video tutorials available in Settings → Help

**Contact Support:**
📧 Email: support@kira-accounting.com
📞 Phone: +60 3-1234 5678
💬 Live chat: Available 9am-6pm (Mon-Fri)

**Emergency:**
For critical issues, call our hotline: +60 3-9999 8888`,
  },
  {
    keywords: ['tax', 'sst', 'gst', 'service tax'],
    response: `🧾 **Tax Settings:**

KIRA supports Malaysian SST (Sales & Service Tax):
- **Standard Rate (SR)**: 6%
- **Zero Rate (ZR)**: 0%
- **Exempt (ES)**: No tax

**Configure taxes:**
1. Go to **Settings → Tax Codes**
2. Add or modify tax rates
3. Set default tax for products

Tax is automatically calculated on invoices based on product settings!`,
  },
];

// Default fallback response
const fallbackResponse = `🤔 I'm not sure I understand that question.

Here are some things I can help with:
• How to create invoices
• Password reset
• Pricing information
• Creating quotations
• Managing customers
• Product & inventory
• Reports & statements
• Tax settings

Try asking one of these, or type **"help"** for support options!`;

// Simple keyword matching function
function findBestResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  for (const entry of knowledgeBase) {
    for (const keyword of entry.keywords) {
      if (lowerMessage.includes(keyword)) {
        return entry.response;
      }
    }
  }
  
  return fallbackResponse;
}

// POST /api/v1/support/chat
router.post('/chat', (req: Request, res: Response) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Simulate slight delay for realistic feel
  const reply = findBestResponse(message);
  
  // Add small delay to feel more natural
  setTimeout(() => {
    res.json({
      reply,
      timestamp: new Date().toISOString(),
    });
  }, 300 + Math.random() * 500);
});

// GET /api/v1/support/topics - Get available help topics
router.get('/topics', (_req: Request, res: Response) => {
  const topics = knowledgeBase.map((entry) => ({
    keywords: entry.keywords.slice(0, 2),
    preview: entry.response.substring(0, 100) + '...',
  }));
  
  res.json({ topics });
});

export default router;
