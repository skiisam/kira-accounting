import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { BadRequestError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

// Field definitions for each report type
const REPORT_FIELDS: Record<string, { label: string; fields: { name: string; label: string; type: string }[] }> = {
  invoice: {
    label: 'Invoice',
    fields: [
      // Document
      { name: 'documentNo', label: 'Invoice No', type: 'string' },
      { name: 'documentDate', label: 'Invoice Date', type: 'date' },
      { name: 'dueDate', label: 'Due Date', type: 'date' },
      { name: 'reference', label: 'Reference', type: 'string' },
      { name: 'description', label: 'Description', type: 'string' },
      // Customer
      { name: 'customerCode', label: 'Customer Code', type: 'string' },
      { name: 'customerName', label: 'Customer Name', type: 'string' },
      { name: 'billToAddress', label: 'Bill To Address', type: 'text' },
      { name: 'shipToAddress', label: 'Ship To Address', type: 'text' },
      // Totals
      { name: 'subTotal', label: 'Sub Total', type: 'currency' },
      { name: 'discountAmount', label: 'Discount', type: 'currency' },
      { name: 'taxAmount', label: 'Tax Amount', type: 'currency' },
      { name: 'netTotal', label: 'Net Total', type: 'currency' },
      // Line items (table)
      { name: 'details', label: 'Line Items', type: 'table' },
      { name: 'details.lineNo', label: 'Line No', type: 'number' },
      { name: 'details.productCode', label: 'Item Code', type: 'string' },
      { name: 'details.description', label: 'Description', type: 'string' },
      { name: 'details.quantity', label: 'Quantity', type: 'number' },
      { name: 'details.uomCode', label: 'UOM', type: 'string' },
      { name: 'details.unitPrice', label: 'Unit Price', type: 'currency' },
      { name: 'details.discountAmount', label: 'Discount', type: 'currency' },
      { name: 'details.taxAmount', label: 'Tax', type: 'currency' },
      { name: 'details.subTotal', label: 'Amount', type: 'currency' },
      // Company
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.address', label: 'Company Address', type: 'text' },
      { name: 'company.phone', label: 'Company Phone', type: 'string' },
      { name: 'company.email', label: 'Company Email', type: 'string' },
      { name: 'company.registrationNo', label: 'Registration No', type: 'string' },
      { name: 'company.taxRegistrationNo', label: 'Tax Reg No', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  quotation: {
    label: 'Quotation',
    fields: [
      { name: 'documentNo', label: 'Quotation No', type: 'string' },
      { name: 'documentDate', label: 'Date', type: 'date' },
      { name: 'dueDate', label: 'Valid Until', type: 'date' },
      { name: 'reference', label: 'Reference', type: 'string' },
      { name: 'description', label: 'Description', type: 'string' },
      { name: 'customerCode', label: 'Customer Code', type: 'string' },
      { name: 'customerName', label: 'Customer Name', type: 'string' },
      { name: 'billToAddress', label: 'Bill To Address', type: 'text' },
      { name: 'shipToAddress', label: 'Ship To Address', type: 'text' },
      { name: 'subTotal', label: 'Sub Total', type: 'currency' },
      { name: 'discountAmount', label: 'Discount', type: 'currency' },
      { name: 'taxAmount', label: 'Tax Amount', type: 'currency' },
      { name: 'netTotal', label: 'Net Total', type: 'currency' },
      { name: 'details', label: 'Line Items', type: 'table' },
      { name: 'details.lineNo', label: 'Line No', type: 'number' },
      { name: 'details.productCode', label: 'Item Code', type: 'string' },
      { name: 'details.description', label: 'Description', type: 'string' },
      { name: 'details.quantity', label: 'Quantity', type: 'number' },
      { name: 'details.uomCode', label: 'UOM', type: 'string' },
      { name: 'details.unitPrice', label: 'Unit Price', type: 'currency' },
      { name: 'details.discountAmount', label: 'Discount', type: 'currency' },
      { name: 'details.taxAmount', label: 'Tax', type: 'currency' },
      { name: 'details.subTotal', label: 'Amount', type: 'currency' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.address', label: 'Company Address', type: 'text' },
      { name: 'company.phone', label: 'Company Phone', type: 'string' },
      { name: 'company.email', label: 'Company Email', type: 'string' },
      { name: 'company.registrationNo', label: 'Registration No', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  do: {
    label: 'Delivery Order',
    fields: [
      { name: 'documentNo', label: 'DO No', type: 'string' },
      { name: 'documentDate', label: 'Date', type: 'date' },
      { name: 'deliveryDate', label: 'Delivery Date', type: 'date' },
      { name: 'reference', label: 'Reference', type: 'string' },
      { name: 'customerCode', label: 'Customer Code', type: 'string' },
      { name: 'customerName', label: 'Customer Name', type: 'string' },
      { name: 'shipToAddress', label: 'Ship To Address', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'text' },
      { name: 'details', label: 'Line Items', type: 'table' },
      { name: 'details.lineNo', label: 'Line No', type: 'number' },
      { name: 'details.productCode', label: 'Item Code', type: 'string' },
      { name: 'details.description', label: 'Description', type: 'string' },
      { name: 'details.quantity', label: 'Quantity', type: 'number' },
      { name: 'details.uomCode', label: 'UOM', type: 'string' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.address', label: 'Company Address', type: 'text' },
      { name: 'company.phone', label: 'Company Phone', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  po: {
    label: 'Purchase Order',
    fields: [
      { name: 'documentNo', label: 'PO No', type: 'string' },
      { name: 'documentDate', label: 'Date', type: 'date' },
      { name: 'dueDate', label: 'Required Date', type: 'date' },
      { name: 'reference', label: 'Reference', type: 'string' },
      { name: 'vendorCode', label: 'Vendor Code', type: 'string' },
      { name: 'vendorName', label: 'Vendor Name', type: 'string' },
      { name: 'subTotal', label: 'Sub Total', type: 'currency' },
      { name: 'discountAmount', label: 'Discount', type: 'currency' },
      { name: 'taxAmount', label: 'Tax Amount', type: 'currency' },
      { name: 'netTotal', label: 'Net Total', type: 'currency' },
      { name: 'details', label: 'Line Items', type: 'table' },
      { name: 'details.lineNo', label: 'Line No', type: 'number' },
      { name: 'details.productCode', label: 'Item Code', type: 'string' },
      { name: 'details.description', label: 'Description', type: 'string' },
      { name: 'details.quantity', label: 'Quantity', type: 'number' },
      { name: 'details.uomCode', label: 'UOM', type: 'string' },
      { name: 'details.unitPrice', label: 'Unit Price', type: 'currency' },
      { name: 'details.subTotal', label: 'Amount', type: 'currency' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.address', label: 'Company Address', type: 'text' },
      { name: 'company.phone', label: 'Company Phone', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  receipt: {
    label: 'Receipt',
    fields: [
      { name: 'paymentNo', label: 'Receipt No', type: 'string' },
      { name: 'paymentDate', label: 'Date', type: 'date' },
      { name: 'customerCode', label: 'Customer Code', type: 'string' },
      { name: 'customerName', label: 'Customer Name', type: 'string' },
      { name: 'reference', label: 'Reference', type: 'string' },
      { name: 'description', label: 'Description', type: 'string' },
      { name: 'paymentAmount', label: 'Amount Received', type: 'currency' },
      { name: 'paymentMethod', label: 'Payment Method', type: 'string' },
      { name: 'chequeNo', label: 'Cheque No', type: 'string' },
      { name: 'knockoffs', label: 'Applied To', type: 'table' },
      { name: 'knockoffs.documentNo', label: 'Invoice No', type: 'string' },
      { name: 'knockoffs.documentDate', label: 'Invoice Date', type: 'date' },
      { name: 'knockoffs.documentAmount', label: 'Invoice Amount', type: 'currency' },
      { name: 'knockoffs.knockoffAmount', label: 'Applied Amount', type: 'currency' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.address', label: 'Company Address', type: 'text' },
      { name: 'company.phone', label: 'Company Phone', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  statement: {
    label: 'Customer Statement',
    fields: [
      { name: 'statementDate', label: 'Statement Date', type: 'date' },
      { name: 'dateFrom', label: 'From Date', type: 'date' },
      { name: 'dateTo', label: 'To Date', type: 'date' },
      { name: 'customerCode', label: 'Customer Code', type: 'string' },
      { name: 'customerName', label: 'Customer Name', type: 'string' },
      { name: 'customerAddress', label: 'Customer Address', type: 'text' },
      { name: 'openingBalance', label: 'Opening Balance', type: 'currency' },
      { name: 'closingBalance', label: 'Closing Balance', type: 'currency' },
      { name: 'transactions', label: 'Transactions', type: 'table' },
      { name: 'transactions.date', label: 'Date', type: 'date' },
      { name: 'transactions.documentNo', label: 'Document No', type: 'string' },
      { name: 'transactions.description', label: 'Description', type: 'string' },
      { name: 'transactions.debit', label: 'Debit', type: 'currency' },
      { name: 'transactions.credit', label: 'Credit', type: 'currency' },
      { name: 'transactions.balance', label: 'Balance', type: 'currency' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.address', label: 'Company Address', type: 'text' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  'balance-sheet': {
    label: 'Balance Sheet',
    fields: [
      { name: 'reportDate', label: 'As At Date', type: 'date' },
      { name: 'assets', label: 'Assets', type: 'table' },
      { name: 'assets.accountNo', label: 'Account No', type: 'string' },
      { name: 'assets.accountName', label: 'Account Name', type: 'string' },
      { name: 'assets.amount', label: 'Amount', type: 'currency' },
      { name: 'liabilities', label: 'Liabilities', type: 'table' },
      { name: 'liabilities.accountNo', label: 'Account No', type: 'string' },
      { name: 'liabilities.accountName', label: 'Account Name', type: 'string' },
      { name: 'liabilities.amount', label: 'Amount', type: 'currency' },
      { name: 'equity', label: 'Equity', type: 'table' },
      { name: 'equity.accountNo', label: 'Account No', type: 'string' },
      { name: 'equity.accountName', label: 'Account Name', type: 'string' },
      { name: 'equity.amount', label: 'Amount', type: 'currency' },
      { name: 'totalAssets', label: 'Total Assets', type: 'currency' },
      { name: 'totalLiabilities', label: 'Total Liabilities', type: 'currency' },
      { name: 'totalEquity', label: 'Total Equity', type: 'currency' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  pnl: {
    label: 'Profit & Loss',
    fields: [
      { name: 'dateFrom', label: 'From Date', type: 'date' },
      { name: 'dateTo', label: 'To Date', type: 'date' },
      { name: 'revenue', label: 'Revenue', type: 'table' },
      { name: 'revenue.accountNo', label: 'Account No', type: 'string' },
      { name: 'revenue.accountName', label: 'Account Name', type: 'string' },
      { name: 'revenue.amount', label: 'Amount', type: 'currency' },
      { name: 'expenses', label: 'Expenses', type: 'table' },
      { name: 'expenses.accountNo', label: 'Account No', type: 'string' },
      { name: 'expenses.accountName', label: 'Account Name', type: 'string' },
      { name: 'expenses.amount', label: 'Amount', type: 'currency' },
      { name: 'totalRevenue', label: 'Total Revenue', type: 'currency' },
      { name: 'totalExpenses', label: 'Total Expenses', type: 'currency' },
      { name: 'netProfit', label: 'Net Profit/Loss', type: 'currency' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  aging: {
    label: 'Aging Report',
    fields: [
      { name: 'reportDate', label: 'As At Date', type: 'date' },
      { name: 'agingType', label: 'Aging Type', type: 'string' },
      { name: 'items', label: 'Aging Items', type: 'table' },
      { name: 'items.customerCode', label: 'Customer Code', type: 'string' },
      { name: 'items.customerName', label: 'Customer Name', type: 'string' },
      { name: 'items.current', label: 'Current', type: 'currency' },
      { name: 'items.days30', label: '1-30 Days', type: 'currency' },
      { name: 'items.days60', label: '31-60 Days', type: 'currency' },
      { name: 'items.days90', label: '61-90 Days', type: 'currency' },
      { name: 'items.over90', label: 'Over 90 Days', type: 'currency' },
      { name: 'items.total', label: 'Total', type: 'currency' },
      { name: 'totalCurrent', label: 'Total Current', type: 'currency' },
      { name: 'totalDays30', label: 'Total 1-30', type: 'currency' },
      { name: 'totalDays60', label: 'Total 31-60', type: 'currency' },
      { name: 'totalDays90', label: 'Total 61-90', type: 'currency' },
      { name: 'totalOver90', label: 'Total Over 90', type: 'currency' },
      { name: 'grandTotal', label: 'Grand Total', type: 'currency' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
  custom: {
    label: 'Custom Report',
    fields: [
      { name: 'title', label: 'Report Title', type: 'string' },
      { name: 'subtitle', label: 'Subtitle', type: 'string' },
      { name: 'dateFrom', label: 'From Date', type: 'date' },
      { name: 'dateTo', label: 'To Date', type: 'date' },
      { name: 'company.name', label: 'Company Name', type: 'string' },
      { name: 'company.address', label: 'Company Address', type: 'text' },
      { name: 'company.logo', label: 'Company Logo', type: 'image' },
    ],
  },
};

// Default template designs for different report types
const getDefaultDesign = (type: string): object => {
  const baseDesign = {
    version: '1.0',
    format: 'kira-report',
    header: {
      height: 120,
      elements: [
        { type: 'image', field: 'company.logo', x: 20, y: 10, width: 80, height: 80 },
        { type: 'text', field: 'company.name', x: 120, y: 20, fontSize: 18, fontWeight: 'bold' },
        { type: 'text', field: 'company.address', x: 120, y: 45, fontSize: 10 },
        { type: 'text', field: 'company.phone', x: 120, y: 75, fontSize: 10 },
      ],
    },
    footer: {
      height: 40,
      elements: [
        { type: 'text', text: 'Page {{pageNumber}} of {{totalPages}}', x: 'center', y: 20, fontSize: 9 },
      ],
    },
    body: {
      elements: [],
    },
  };

  return baseDesign;
};

export class ReportTemplateController extends BaseController<any> {
  protected modelName = 'ReportTemplate';

  // System template designs (approximations of provided samples)
  private buildInvoiceDesign(): any {
    return {
      version: '1.0',
      format: 'kira-report',
      header: {
        height: 140,
        elements: [
          { type: 'image', field: 'company.logo', x: 20, y: 12, width: 80, height: 80 },
          { type: 'text', field: 'company.name', x: 120, y: 18, fontSize: 18, fontWeight: 'bold' },
          { type: 'text', field: 'company.address', x: 120, y: 44, fontSize: 10 },
          { type: 'text', field: 'company.phone', x: 120, y: 66, fontSize: 10 },
          { type: 'text', text: 'INVOICE', x: 'center', y: 110, fontSize: 18, fontWeight: 'bold' },
        ],
      },
      footer: {
        height: 60,
        elements: [
          { type: 'text', text: 'Authorised Signature', x: 40, y: 28, fontSize: 10 },
          { type: 'text', text: 'Page {{pageNumber}} of {{totalPages}}', x: 'center', y: 10, fontSize: 9 },
        ],
      },
      body: {
        elements: [
          // Right info box
          { type: 'text', text: 'No.:', x: 410, y: 0, fontSize: 10, fontWeight: 'bold' },
          { type: 'field', field: 'documentNo', x: 450, y: 0, fontSize: 10 },
          { type: 'text', text: 'Date:', x: 410, y: 18, fontSize: 9 },
          { type: 'field', field: 'documentDate', x: 480, y: 18, fontSize: 9 },
          { type: 'text', text: 'Due Date:', x: 410, y: 36, fontSize: 9 },
          { type: 'field', field: 'dueDate', x: 480, y: 36, fontSize: 9 },
          { type: 'text', text: 'Reference:', x: 410, y: 54, fontSize: 9 },
          { type: 'field', field: 'reference', x: 480, y: 54, fontSize: 9 },
          { type: 'text', text: 'Page:', x: 410, y: 72, fontSize: 9 },
          { type: 'text', text: '{{pageNumber}}', x: 480, y: 72, fontSize: 9 },
          // Bill to block
          { type: 'field', field: 'customerName', x: 20, y: 0, fontSize: 12, fontWeight: 'bold' },
          { type: 'field', field: 'billToAddress', x: 20, y: 18, fontSize: 10 },
          // Items table
          { 
            type: 'table', x: 20, y: 110, width: 560, height: 300, 
            properties: { 
              dataSource: 'details',
              columns: [
                { field: 'lineNo', header: 'Item', width: 40, align: 'left' },
                { field: 'description', header: 'Description', width: 250, align: 'left' },
                { field: 'quantity', header: 'Qty', width: 40, align: 'right' },
                { field: 'uomCode', header: 'UOM', width: 50, align: 'center' },
                { field: 'unitPrice', header: 'U/ Price RM', width: 70, align: 'right', format: 'currency' },
                { field: 'discountAmount', header: 'Disc. RM', width: 60, align: 'right', format: 'currency' },
                { field: 'subTotal', header: 'Total RM', width: 80, align: 'right', format: 'currency' },
              ],
              showHeader: true,
              headerBg: '#f5f5f5'
            } 
          },
          // Totals area
          { type: 'text', text: 'Net Total', x: 460, y: 420, fontSize: 12, fontWeight: 'bold' },
          { type: 'field', field: 'netTotal', x: 520, y: 418, fontSize: 12, align: 'right' },
          { type: 'text', text: 'Notes:', x: 20, y: 420, fontSize: 10, fontWeight: 'bold' },
          { type: 'field', field: 'description', x: 20, y: 440, fontSize: 9 },
        ],
      },
    };
  }

  private buildPurchaseOrderDesign(): any {
    return {
      version: '1.0',
      format: 'kira-report',
      header: {
        height: 140,
        elements: [
          { type: 'image', field: 'company.logo', x: 20, y: 12, width: 80, height: 80 },
          { type: 'text', field: 'company.name', x: 120, y: 18, fontSize: 18, fontWeight: 'bold' },
          { type: 'text', field: 'company.address', x: 120, y: 44, fontSize: 10 },
          { type: 'text', field: 'company.phone', x: 120, y: 66, fontSize: 10 },
          { type: 'text', text: 'PURCHASE ORDER', x: 'center', y: 110, fontSize: 18, fontWeight: 'bold' },
        ],
      },
      footer: {
        height: 60,
        elements: [
          { type: 'text', text: 'Authorised Signature', x: 40, y: 28, fontSize: 10 },
          { type: 'text', text: 'Page {{pageNumber}} of {{totalPages}}', x: 'center', y: 10, fontSize: 9 },
        ],
      },
      body: {
        elements: [
          { type: 'text', text: 'No.:', x: 410, y: 0, fontSize: 10, fontWeight: 'bold' },
          { type: 'field', field: 'documentNo', x: 450, y: 0, fontSize: 10 },
          { type: 'text', text: 'Date:', x: 410, y: 18, fontSize: 9 },
          { type: 'field', field: 'documentDate', x: 480, y: 18, fontSize: 9 },
          { type: 'text', text: 'Page:', x: 410, y: 36, fontSize: 9 },
          { type: 'text', text: '{{pageNumber}}', x: 480, y: 36, fontSize: 9 },
          { type: 'field', field: 'vendorName', x: 20, y: 0, fontSize: 12, fontWeight: 'bold' },
          { type: 'field', field: 'billToAddress', x: 20, y: 18, fontSize: 10 },
          { 
            type: 'table', x: 20, y: 110, width: 560, height: 300, 
            properties: { 
              dataSource: 'details',
              columns: [
                { field: 'lineNo', header: 'No', width: 40, align: 'left' },
                { field: 'description', header: 'Description', width: 280, align: 'left' },
                { field: 'quantity', header: 'Qty', width: 50, align: 'right' },
                { field: 'uomCode', header: 'UOM', width: 50, align: 'center' },
                { field: 'unitPrice', header: 'U/ Price', width: 70, align: 'right', format: 'currency' },
                { field: 'subTotal', header: 'Amount', width: 70, align: 'right', format: 'currency' },
              ],
              showHeader: true,
              headerBg: '#f5f5f5'
            } 
          },
          { type: 'text', text: 'Total Amount', x: 440, y: 420, fontSize: 12, fontWeight: 'bold' },
          { type: 'field', field: 'netTotal', x: 520, y: 418, fontSize: 12, align: 'right' },
        ],
      },
    };
  }

  private buildProformaInvoiceDesign(): any {
    return {
      version: '1.0',
      format: 'kira-report',
      header: {
        height: 140,
        elements: [
          { type: 'image', field: 'company.logo', x: 20, y: 12, width: 80, height: 80 },
          { type: 'text', field: 'company.name', x: 120, y: 18, fontSize: 18, fontWeight: 'bold' },
          { type: 'text', field: 'company.address', x: 120, y: 44, fontSize: 10 },
          { type: 'text', field: 'company.phone', x: 120, y: 66, fontSize: 10 },
          { type: 'text', text: 'PROFORMA INVOICE', x: 'center', y: 110, fontSize: 18, fontWeight: 'bold' },
        ],
      },
      footer: {
        height: 60,
        elements: [
          { type: 'text', text: 'Computer Generated. No sign is required.', x: 20, y: 10, fontSize: 9 },
          { type: 'text', text: 'Page {{pageNumber}} of {{totalPages}}', x: 'center', y: 10, fontSize: 9 },
        ],
      },
      body: {
        elements: [
          { type: 'text', text: 'No.:', x: 410, y: 0, fontSize: 10, fontWeight: 'bold' },
          { type: 'field', field: 'documentNo', x: 450, y: 0, fontSize: 10 },
          { type: 'text', text: 'Date:', x: 410, y: 18, fontSize: 9 },
          { type: 'field', field: 'documentDate', x: 480, y: 18, fontSize: 9 },
          { type: 'text', text: 'Page:', x: 410, y: 36, fontSize: 9 },
          { type: 'text', text: '{{pageNumber}}', x: 480, y: 36, fontSize: 9 },
          { type: 'field', field: 'customerName', x: 20, y: 0, fontSize: 12, fontWeight: 'bold' },
          { type: 'field', field: 'billToAddress', x: 20, y: 18, fontSize: 10 },
          { 
            type: 'table', x: 20, y: 110, width: 560, height: 300, 
            properties: { 
              dataSource: 'details',
              columns: [
                { field: 'lineNo', header: 'Item', width: 40, align: 'left' },
                { field: 'description', header: 'Description', width: 280, align: 'left' },
                { field: 'quantity', header: 'Quantity', width: 60, align: 'right' },
                { field: 'uomCode', header: 'UOM', width: 50, align: 'center' },
                { field: 'unitPrice', header: 'U/ Price RM', width: 70, align: 'right', format: 'currency' },
                { field: 'subTotal', header: 'Amount RM', width: 70, align: 'right', format: 'currency' },
              ],
              showHeader: true,
              headerBg: '#f5f5f5'
            } 
          },
          { type: 'text', text: 'Net Total', x: 460, y: 420, fontSize: 12, fontWeight: 'bold' },
          { type: 'field', field: 'netTotal', x: 520, y: 418, fontSize: 12, align: 'right' },
        ],
      },
    };
  }

  /**
   * List report templates with filtering
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skip, take, page, pageSize } = this.getPagination(req);
      const orderBy = this.getSorting(req, 'name', 'asc');

      const companyId = (req as any).user?.companyId;
      if (!companyId) throw BadRequestError('Company context required');

      const where: Prisma.ReportTemplateWhereInput = {
        companyId,
        isActive: req.query.includeInactive === 'true' ? undefined : true,
      };

      if (req.query.type) {
        where.type = req.query.type as string;
      }

      if (req.query.category) {
        where.category = req.query.category as string;
      }

      if (req.query.search) {
        const search = req.query.search as string;
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (req.query.isSystem !== undefined) {
        where.isSystem = req.query.isSystem === 'true';
      }

      let [templates, total] = await Promise.all([
        prisma.reportTemplate.findMany({
          where,
          skip,
          take,
          orderBy,
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            category: true,
            isSystem: true,
            isActive: true,
            paperSize: true,
            orientation: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.reportTemplate.count({ where }),
      ]);

      // Auto-seed system templates if empty and system tab requested
      const isSystemFlag = String(req.query.isSystem) === 'true';
      if (isSystemFlag && total === 0) {
        await prisma.reportTemplate.createMany({
          data: [
            {
              code: 'SYS_INV_STD',
              name: 'Invoice - Standard',
              type: 'invoice',
              category: 'sales',
              isSystem: true,
              isActive: true,
              paperSize: 'A4' as any,
              orientation: 'portrait' as any,
              margins: { top: 20, bottom: 20, left: 20, right: 20 } as any,
              design: this.buildInvoiceDesign() as any,
              createdBy: (req as any).user?.userId?.toString() || null,
              companyId,
            } as any,
            {
              code: 'SYS_PO_STD',
              name: 'Purchase Order - Standard',
              type: 'po',
              category: 'purchase',
              isSystem: true,
              isActive: true,
              paperSize: 'A4' as any,
              orientation: 'portrait' as any,
              margins: { top: 20, bottom: 20, left: 20, right: 20 } as any,
              design: this.buildPurchaseOrderDesign() as any,
              createdBy: (req as any).user?.userId?.toString() || null,
              companyId,
            } as any,
            {
              code: 'SYS_PROFORMA_STD',
              name: 'Proforma Invoice - Standard',
              type: 'invoice',
              category: 'sales',
              isSystem: true,
              isActive: true,
              paperSize: 'A4' as any,
              orientation: 'portrait' as any,
              margins: { top: 20, bottom: 20, left: 20, right: 20 } as any,
              design: this.buildProformaInvoiceDesign() as any,
              createdBy: (req as any).user?.userId?.toString() || null,
              companyId,
            } as any,
          ],
        } as any);

        [templates, total] = await Promise.all([
          prisma.reportTemplate.findMany({
            where,
            skip,
            take,
            orderBy,
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              category: true,
              isSystem: true,
              isActive: true,
              paperSize: true,
              orientation: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          prisma.reportTemplate.count({ where }),
        ]);
      }

      this.paginatedResponse(res, templates, total, page, pageSize);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get single template by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.companyId;

      const template = await prisma.reportTemplate.findFirst({
        where: { id, companyId },
      });

      if (!template) {
        throw NotFoundError('Report template not found');
      }

      this.successResponse(res, template);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new report template
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) throw BadRequestError('Company context required');

      const { code, name, type, category, paperSize, orientation, margins, design } = req.body;

      this.validateRequired(req.body, ['code', 'name', 'type', 'category']);

      // Check for duplicate code
      const existing = await prisma.reportTemplate.findFirst({
        where: { code, companyId },
      });

      if (existing) {
        throw ConflictError(`Template with code "${code}" already exists`);
      }

      const template = await prisma.reportTemplate.create({
        data: {
          code,
          name,
          type,
          category,
          isSystem: false,
          isActive: true,
          paperSize: paperSize || 'A4',
          orientation: orientation || 'portrait',
          margins: margins || { top: 20, bottom: 20, left: 20, right: 20 },
          design: design || getDefaultDesign(type),
          createdBy: userId?.toString(),
          companyId,
        },
      });

      this.createdResponse(res, template);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update report template
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.companyId;

      const existing = await prisma.reportTemplate.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        throw NotFoundError('Report template not found');
      }

      // Prevent editing system templates (but allow copying)
      if (existing.isSystem) {
        throw BadRequestError('System templates cannot be modified. Clone it to create a custom version.');
      }

      const { code, name, type, category, paperSize, orientation, margins, design, isActive } = req.body;

      // Check for duplicate code if changing
      if (code && code !== existing.code) {
        const duplicate = await prisma.reportTemplate.findFirst({
          where: { code, companyId, id: { not: id } },
        });
        if (duplicate) {
          throw ConflictError(`Template with code "${code}" already exists`);
        }
      }

      const template = await prisma.reportTemplate.update({
        where: { id },
        data: {
          ...(code && { code }),
          ...(name && { name }),
          ...(type && { type }),
          ...(category && { category }),
          ...(paperSize && { paperSize }),
          ...(orientation && { orientation }),
          ...(margins !== undefined && { margins }),
          ...(design !== undefined && { design }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      this.successResponse(res, template, 'Template updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete report template
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.companyId;

      const existing = await prisma.reportTemplate.findFirst({
        where: { id, companyId },
      });

      if (!existing) {
        throw NotFoundError('Report template not found');
      }

      if (existing.isSystem) {
        throw BadRequestError('System templates cannot be deleted');
      }

      await prisma.reportTemplate.delete({ where: { id } });

      this.deletedResponse(res);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clone a report template
   */
  clone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;

      const source = await prisma.reportTemplate.findFirst({
        where: { id, companyId },
      });

      if (!source) {
        throw NotFoundError('Source template not found');
      }

      const { code, name } = req.body;
      const newCode = code || `${source.code}_COPY`;
      const newName = name || `${source.name} (Copy)`;

      // Check for duplicate code
      const existing = await prisma.reportTemplate.findFirst({
        where: { code: newCode, companyId },
      });

      if (existing) {
        throw ConflictError(`Template with code "${newCode}" already exists`);
      }

      const cloned = await prisma.reportTemplate.create({
        data: {
          code: newCode,
          name: newName,
          type: source.type,
          category: source.category,
          isSystem: false,
          isActive: true,
          paperSize: source.paperSize,
          orientation: source.orientation,
          margins: source.margins as any,
          design: source.design as any,
          createdBy: userId?.toString(),
          companyId,
        },
      });

      this.createdResponse(res, cloned, 'Template cloned successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate PDF preview of template
   */
  preview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.companyId;

      const template = await prisma.reportTemplate.findFirst({
        where: { id, companyId },
      });

      if (!template) {
        throw NotFoundError('Report template not found');
      }

      // Get sample data based on template type
      const sampleData = req.body.sampleData || this.getSampleData(template.type);

      // TODO: Integrate with PDF generation library (puppeteer/playwright)
      // For now, return the template with sample data for frontend rendering
      this.successResponse(res, {
        template,
        sampleData,
        previewUrl: null, // Will be populated when PDF generation is implemented
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Seed system templates for the current company
   */
  seedSystemTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      const userId = (req as any).user?.id;
      if (!companyId) throw BadRequestError('Company context required');

      const existing = await prisma.reportTemplate.findMany({
        where: { companyId, isSystem: true },
        select: { code: true },
      });
      const codes = new Set(existing.map(e => e.code));

      const creations: Array<{ code: string; name: string; type: string; category: string; design: any }> = [];
      if (!codes.has('SYS_INV_STD')) {
        creations.push({ code: 'SYS_INV_STD', name: 'Invoice - Standard', type: 'invoice', category: 'sales', design: this.buildInvoiceDesign() });
      }
      if (!codes.has('SYS_PO_STD')) {
        creations.push({ code: 'SYS_PO_STD', name: 'Purchase Order - Standard', type: 'po', category: 'purchase', design: this.buildPurchaseOrderDesign() });
      }
      if (!codes.has('SYS_PROFORMA_STD')) {
        creations.push({ code: 'SYS_PROFORMA_STD', name: 'Proforma Invoice - Standard', type: 'invoice', category: 'sales', design: this.buildProformaInvoiceDesign() });
      }

      for (const c of creations) {
        await prisma.reportTemplate.create({
          data: {
            code: c.code,
            name: c.name,
            type: c.type,
            category: c.category,
            isSystem: true,
            isActive: true,
            paperSize: 'A4',
            orientation: 'portrait',
            margins: { top: 20, bottom: 20, left: 20, right: 20 } as any,
            design: c.design as any,
            createdBy: userId?.toString(),
            companyId,
          },
        });
      }

      this.successResponse(res, { created: creations.length });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get available fields for a report type
   */
  getFields = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;

      const fieldDef = REPORT_FIELDS[type];

      if (!fieldDef) {
        throw NotFoundError(`Unknown report type: ${type}`);
      }

      this.successResponse(res, fieldDef);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all report types and their categories
   */
  getTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const types = Object.entries(REPORT_FIELDS).map(([key, value]) => ({
        type: key,
        label: value.label,
        category: this.getCategoryForType(key),
      }));

      const categories = [
        { code: 'sales', name: 'Sales' },
        { code: 'purchase', name: 'Purchase' },
        { code: 'accounting', name: 'Accounting' },
        { code: 'stock', name: 'Stock' },
        { code: 'custom', name: 'Custom' },
      ];

      this.successResponse(res, { types, categories });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper: Get category for report type
   */
  private getCategoryForType(type: string): string {
    switch (type) {
      case 'invoice':
      case 'quotation':
      case 'do':
      case 'receipt':
      case 'statement':
        return 'sales';
      case 'po':
        return 'purchase';
      case 'balance-sheet':
      case 'pnl':
      case 'aging':
        return 'accounting';
      default:
        return 'custom';
    }
  }

  /**
   * Helper: Generate sample data for preview
   */
  private getSampleData(type: string): object {
    const company = {
      name: 'Sample Company Sdn Bhd',
      address: '123 Business Street\nCity, State 12345\nMalaysia',
      phone: '+60 3-1234 5678',
      email: 'info@sample.com',
      registrationNo: '123456-A',
      taxRegistrationNo: 'GST-12345678',
      logo: null,
    };

    switch (type) {
      case 'invoice':
      case 'quotation':
        return {
          documentNo: 'INV-0001',
          documentDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          customerCode: 'CUST001',
          customerName: 'ABC Trading Sdn Bhd',
          billToAddress: '456 Customer Road\nCustomer City 54321',
          subTotal: 1000.0,
          discountAmount: 50.0,
          taxAmount: 57.0,
          netTotal: 1007.0,
          details: [
            { lineNo: 1, productCode: 'ITEM001', description: 'Product A', quantity: 10, uomCode: 'PCS', unitPrice: 50.0, discountAmount: 25.0, taxAmount: 28.5, subTotal: 503.5 },
            { lineNo: 2, productCode: 'ITEM002', description: 'Product B', quantity: 5, uomCode: 'PCS', unitPrice: 100.0, discountAmount: 25.0, taxAmount: 28.5, subTotal: 503.5 },
          ],
          company,
        };

      case 'receipt':
        return {
          paymentNo: 'RCP-0001',
          paymentDate: new Date().toISOString(),
          customerCode: 'CUST001',
          customerName: 'ABC Trading Sdn Bhd',
          paymentAmount: 1000.0,
          paymentMethod: 'Bank Transfer',
          knockoffs: [
            { documentNo: 'INV-0001', documentDate: new Date().toISOString(), documentAmount: 1007.0, knockoffAmount: 1000.0 },
          ],
          company,
        };

      default:
        return { company };
    }
  }
}

export const reportTemplateController = new ReportTemplateController();
