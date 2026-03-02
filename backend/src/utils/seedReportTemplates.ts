import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default template design structure
 */
const createDefaultDesign = (type: string, title: string) => ({
  version: '1.0',
  format: 'kira-report',
  settings: {
    showLogo: true,
    showCompanyInfo: true,
    showFooter: true,
  },
  header: {
    height: 120,
    elements: [
      { id: 'logo', type: 'image', field: 'company.logo', x: 20, y: 10, width: 80, height: 80, visible: true },
      { id: 'companyName', type: 'text', field: 'company.name', x: 120, y: 15, fontSize: 18, fontWeight: 'bold', color: '#000000' },
      { id: 'companyAddress', type: 'text', field: 'company.address', x: 120, y: 40, fontSize: 10, color: '#333333' },
      { id: 'companyContact', type: 'text', field: 'company.phone', x: 120, y: 70, fontSize: 10, color: '#333333' },
      { id: 'docTitle', type: 'text', text: title.toUpperCase(), x: 480, y: 15, fontSize: 20, fontWeight: 'bold', color: '#000000', align: 'right' },
      { id: 'docNo', type: 'text', field: 'documentNo', x: 480, y: 45, fontSize: 12, color: '#000000', align: 'right', prefix: 'No: ' },
      { id: 'docDate', type: 'text', field: 'documentDate', x: 480, y: 65, fontSize: 10, color: '#333333', align: 'right', prefix: 'Date: ', format: 'date' },
    ],
  },
  body: {
    customerSection: {
      y: 140,
      height: 80,
      elements: [
        { id: 'billToLabel', type: 'text', text: 'Bill To:', x: 20, y: 0, fontSize: 10, fontWeight: 'bold' },
        { id: 'customerName', type: 'text', field: 'customerName', x: 20, y: 15, fontSize: 11, fontWeight: 'bold' },
        { id: 'customerAddress', type: 'text', field: 'billToAddress', x: 20, y: 30, fontSize: 10, multiline: true, maxLines: 4 },
      ],
    },
    table: {
      y: 240,
      columns: [
        { field: 'lineNo', header: 'No', width: 30, align: 'center' },
        { field: 'productCode', header: 'Item Code', width: 80, align: 'left' },
        { field: 'description', header: 'Description', width: 200, align: 'left', flex: 1 },
        { field: 'quantity', header: 'Qty', width: 50, align: 'right', format: 'number' },
        { field: 'uomCode', header: 'UOM', width: 40, align: 'center' },
        { field: 'unitPrice', header: 'Unit Price', width: 80, align: 'right', format: 'currency' },
        { field: 'discountAmount', header: 'Disc', width: 60, align: 'right', format: 'currency' },
        { field: 'subTotal', header: 'Amount', width: 90, align: 'right', format: 'currency' },
      ],
      headerStyle: { fontSize: 9, fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: 6 },
      rowStyle: { fontSize: 9, padding: 5, borderBottom: '1px solid #eee' },
      alternateRowColor: '#fafafa',
    },
    summary: {
      x: 380,
      width: 180,
      items: [
        { label: 'Sub Total', field: 'subTotal', format: 'currency' },
        { label: 'Discount', field: 'discountAmount', format: 'currency' },
        { label: 'Tax', field: 'taxAmount', format: 'currency' },
        { label: 'Rounding', field: 'roundingAmount', format: 'currency', showIfZero: false },
        { label: 'TOTAL', field: 'netTotal', format: 'currency', fontWeight: 'bold', fontSize: 12 },
      ],
    },
    notes: {
      y: -80, // Relative to bottom of table
      elements: [
        { id: 'notesLabel', type: 'text', text: 'Notes:', x: 20, y: 0, fontSize: 9, fontWeight: 'bold' },
        { id: 'notes', type: 'text', field: 'notes', x: 20, y: 12, fontSize: 9, multiline: true, maxWidth: 300 },
      ],
    },
  },
  footer: {
    height: 60,
    elements: [
      { id: 'footerLine', type: 'line', x: 20, y: 10, width: 555, color: '#cccccc' },
      { id: 'thankYou', type: 'text', text: 'Thank you for your business', x: 'center', y: 20, fontSize: 10, color: '#666666' },
      { id: 'pageNumber', type: 'text', text: 'Page {{pageNumber}} of {{totalPages}}', x: 'center', y: 40, fontSize: 8, color: '#999999' },
    ],
  },
});

/**
 * System report templates to seed
 */
const SYSTEM_TEMPLATES = [
  {
    code: 'SYS-INV-01',
    name: 'Standard Invoice',
    type: 'invoice',
    category: 'sales',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    design: createDefaultDesign('invoice', 'Invoice'),
  },
  {
    code: 'SYS-QUO-01',
    name: 'Standard Quotation',
    type: 'quotation',
    category: 'sales',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    design: createDefaultDesign('quotation', 'Quotation'),
  },
  {
    code: 'SYS-DO-01',
    name: 'Standard Delivery Order',
    type: 'do',
    category: 'sales',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    design: {
      ...createDefaultDesign('do', 'Delivery Order'),
      body: {
        ...createDefaultDesign('do', 'Delivery Order').body,
        table: {
          y: 240,
          columns: [
            { field: 'lineNo', header: 'No', width: 40, align: 'center' },
            { field: 'productCode', header: 'Item Code', width: 100, align: 'left' },
            { field: 'description', header: 'Description', width: 280, align: 'left', flex: 1 },
            { field: 'quantity', header: 'Qty', width: 60, align: 'right', format: 'number' },
            { field: 'uomCode', header: 'UOM', width: 50, align: 'center' },
          ],
          headerStyle: { fontSize: 10, fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: 8 },
          rowStyle: { fontSize: 10, padding: 6, borderBottom: '1px solid #eee' },
        },
        summary: null, // DO doesn't show amounts
      },
    },
  },
  {
    code: 'SYS-PO-01',
    name: 'Standard Purchase Order',
    type: 'po',
    category: 'purchase',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    design: {
      ...createDefaultDesign('po', 'Purchase Order'),
      body: {
        ...createDefaultDesign('po', 'Purchase Order').body,
        customerSection: {
          y: 140,
          height: 80,
          elements: [
            { id: 'vendorLabel', type: 'text', text: 'Vendor:', x: 20, y: 0, fontSize: 10, fontWeight: 'bold' },
            { id: 'vendorName', type: 'text', field: 'vendorName', x: 20, y: 15, fontSize: 11, fontWeight: 'bold' },
            { id: 'vendorAddress', type: 'text', field: 'vendorAddress', x: 20, y: 30, fontSize: 10, multiline: true, maxLines: 4 },
          ],
        },
      },
    },
  },
  {
    code: 'SYS-RCP-01',
    name: 'Standard Receipt',
    type: 'receipt',
    category: 'sales',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    design: {
      version: '1.0',
      format: 'kira-report',
      settings: {
        showLogo: true,
        showCompanyInfo: true,
        showFooter: true,
      },
      header: {
        height: 120,
        elements: [
          { id: 'logo', type: 'image', field: 'company.logo', x: 20, y: 10, width: 80, height: 80, visible: true },
          { id: 'companyName', type: 'text', field: 'company.name', x: 120, y: 15, fontSize: 18, fontWeight: 'bold', color: '#000000' },
          { id: 'companyAddress', type: 'text', field: 'company.address', x: 120, y: 40, fontSize: 10, color: '#333333' },
          { id: 'docTitle', type: 'text', text: 'OFFICIAL RECEIPT', x: 480, y: 15, fontSize: 20, fontWeight: 'bold', color: '#000000', align: 'right' },
          { id: 'docNo', type: 'text', field: 'paymentNo', x: 480, y: 45, fontSize: 12, color: '#000000', align: 'right', prefix: 'No: ' },
          { id: 'docDate', type: 'text', field: 'paymentDate', x: 480, y: 65, fontSize: 10, color: '#333333', align: 'right', prefix: 'Date: ', format: 'date' },
        ],
      },
      body: {
        customerSection: {
          y: 140,
          height: 60,
          elements: [
            { id: 'receivedFrom', type: 'text', text: 'Received From:', x: 20, y: 0, fontSize: 10, fontWeight: 'bold' },
            { id: 'customerName', type: 'text', field: 'customerName', x: 20, y: 15, fontSize: 12, fontWeight: 'bold' },
          ],
        },
        amountSection: {
          y: 220,
          elements: [
            { id: 'amountLabel', type: 'text', text: 'Amount Received:', x: 20, y: 0, fontSize: 12, fontWeight: 'bold' },
            { id: 'amount', type: 'text', field: 'paymentAmount', x: 20, y: 20, fontSize: 24, fontWeight: 'bold', format: 'currency' },
            { id: 'paymentMethod', type: 'text', field: 'paymentMethod', x: 20, y: 55, fontSize: 10, prefix: 'Payment Method: ' },
            { id: 'reference', type: 'text', field: 'reference', x: 20, y: 70, fontSize: 10, prefix: 'Reference: ' },
          ],
        },
        table: {
          y: 320,
          title: 'Applied to:',
          columns: [
            { field: 'documentNo', header: 'Invoice No', width: 150, align: 'left' },
            { field: 'documentDate', header: 'Date', width: 100, align: 'center', format: 'date' },
            { field: 'documentAmount', header: 'Invoice Amount', width: 120, align: 'right', format: 'currency' },
            { field: 'knockoffAmount', header: 'Applied', width: 120, align: 'right', format: 'currency' },
          ],
          headerStyle: { fontSize: 9, fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: 6 },
          rowStyle: { fontSize: 9, padding: 5, borderBottom: '1px solid #eee' },
        },
      },
      footer: {
        height: 80,
        elements: [
          { id: 'signature', type: 'text', text: '_________________________', x: 400, y: 20, fontSize: 10 },
          { id: 'signatureLabel', type: 'text', text: 'Authorized Signature', x: 400, y: 35, fontSize: 9, color: '#666666' },
          { id: 'thankYou', type: 'text', text: 'Thank you', x: 'center', y: 55, fontSize: 10, color: '#666666' },
        ],
      },
    },
  },
];

/**
 * Seed report templates for a company
 */
export async function seedReportTemplatesForCompany(companyId: number): Promise<void> {
  console.log(`🎨 Seeding report templates for company ${companyId}...`);

  for (const template of SYSTEM_TEMPLATES) {
    try {
      await prisma.reportTemplate.upsert({
        where: {
          code_companyId: {
            code: template.code,
            companyId,
          },
        },
        update: {},
        create: {
          code: template.code,
          name: template.name,
          type: template.type,
          category: template.category,
          isSystem: true,
          isActive: true,
          paperSize: template.paperSize,
          orientation: template.orientation,
          margins: template.margins,
          design: template.design,
          companyId,
        },
      });
    } catch (error) {
      console.error(`Failed to seed template ${template.code}:`, error);
    }
  }

  console.log(`✅ Report templates seeded for company ${companyId}`);
}

/**
 * Seed report templates for all existing companies
 */
export async function seedReportTemplatesForAllCompanies(): Promise<void> {
  const companies = await prisma.company.findMany({
    select: { id: true },
  });

  for (const company of companies) {
    await seedReportTemplatesForCompany(company.id);
  }
}

// Allow running directly
if (require.main === module) {
  seedReportTemplatesForAllCompanies()
    .then(() => {
      console.log('🎉 Report template seeding complete!');
      process.exit(0);
    })
    .catch((e) => {
      console.error('Error seeding report templates:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
