/**
 * LHDN E-Invoice (MyInvois) Service
 * 
 * Handles e-invoice generation, validation, and submission to MyInvois system.
 * Reference: https://sdk.myinvois.hasil.gov.my/
 */

import { prisma } from '../config/database';
import { createHash } from 'crypto';
import logger from '../utils/logger';

// Environment configuration
const MYINVOIS_ENV = process.env.MYINVOIS_ENV || 'sandbox';
const MYINVOIS_CLIENT_ID = process.env.MYINVOIS_CLIENT_ID || '';
const MYINVOIS_CLIENT_SECRET = process.env.MYINVOIS_CLIENT_SECRET || '';

// API Base URLs
const API_URLS = {
  sandbox: {
    api: 'https://preprod-api.myinvois.hasil.gov.my',
    portal: 'https://preprod.myinvois.hasil.gov.my',
  },
  production: {
    api: 'https://api.myinvois.hasil.gov.my',
    portal: 'https://myinvois.hasil.gov.my',
  },
};

// E-Invoice Status
export enum EInvoiceStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  VALID = 'VALID',
  INVALID = 'INVALID',
  CANCELLED = 'CANCELLED',
}

// Document Type Codes (LHDN)
export const DOCUMENT_TYPE_CODES = {
  INVOICE: '01',
  CREDIT_NOTE: '02',
  DEBIT_NOTE: '03',
  REFUND_NOTE: '04',
  SELF_BILLED_INVOICE: '11',
  SELF_BILLED_CREDIT_NOTE: '12',
  SELF_BILLED_DEBIT_NOTE: '13',
  SELF_BILLED_REFUND_NOTE: '14',
};

// Tax Type Codes
export const TAX_TYPE_CODES = {
  SALES_TAX: '01',
  SERVICE_TAX: '02',
  TOURISM_TAX: '03',
  HIGH_VALUE_GOODS_TAX: '04',
  SALES_TAX_LOW_VALUE_GOODS: '05',
  NOT_APPLICABLE: '06',
  TAX_EXEMPTION: 'E',
};

// Validation error interface
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// E-Invoice document structure (UBL 2.1 JSON format)
interface EInvoiceDocument {
  _D: string; // Document namespace
  _A: string; // Additional namespace
  Invoice: EInvoiceContent[];
}

interface EInvoiceContent {
  ID: ValueField[];
  IssueDate: ValueField[];
  IssueTime: ValueField[];
  InvoiceTypeCode: TypeCodeField[];
  DocumentCurrencyCode: ValueField[];
  TaxCurrencyCode?: ValueField[];
  InvoicePeriod?: InvoicePeriod[];
  BillingReference?: BillingReference[];
  AccountingSupplierParty: Party[];
  AccountingCustomerParty: Party[];
  Delivery?: Delivery[];
  PaymentMeans?: PaymentMeans[];
  PaymentTerms?: PaymentTerms[];
  PrepaidPayment?: PrepaidPayment[];
  AllowanceCharge?: AllowanceCharge[];
  TaxTotal: TaxTotal[];
  LegalMonetaryTotal: LegalMonetaryTotal[];
  InvoiceLine: InvoiceLine[];
}

interface ValueField {
  _: string;
}

interface TypeCodeField {
  _: string;
  listVersionID?: string;
}

interface Party {
  Party: PartyDetails[];
}

interface PartyDetails {
  IndustryClassificationCode?: ValueField[];
  PartyIdentification: PartyIdentification[];
  PostalAddress: PostalAddress[];
  PartyLegalEntity: PartyLegalEntity[];
  Contact?: Contact[];
}

interface PartyIdentification {
  ID: IdentificationField[];
}

interface IdentificationField {
  _: string;
  schemeID: string;
}

interface PostalAddress {
  CityName: ValueField[];
  PostalZone: ValueField[];
  CountrySubentityCode: ValueField[];
  AddressLine: AddressLine[];
  Country: Country[];
}

interface AddressLine {
  Line: ValueField[];
}

interface Country {
  IdentificationCode: TypeCodeField[];
}

interface PartyLegalEntity {
  RegistrationName: ValueField[];
}

interface Contact {
  Telephone?: ValueField[];
  ElectronicMail?: ValueField[];
}

interface TaxTotal {
  TaxAmount: CurrencyField[];
  TaxSubtotal: TaxSubtotal[];
}

interface CurrencyField {
  _: number | string;
  currencyID: string;
}

interface TaxSubtotal {
  TaxableAmount: CurrencyField[];
  TaxAmount: CurrencyField[];
  TaxCategory: TaxCategory[];
}

interface TaxCategory {
  ID: ValueField[];
  TaxScheme: TaxScheme[];
}

interface TaxScheme {
  ID: TypeCodeField[];
}

interface LegalMonetaryTotal {
  LineExtensionAmount: CurrencyField[];
  TaxExclusiveAmount: CurrencyField[];
  TaxInclusiveAmount: CurrencyField[];
  AllowanceTotalAmount?: CurrencyField[];
  ChargeTotalAmount?: CurrencyField[];
  PayableRoundingAmount?: CurrencyField[];
  PayableAmount: CurrencyField[];
}

interface InvoiceLine {
  ID: ValueField[];
  InvoicedQuantity: QuantityField[];
  LineExtensionAmount: CurrencyField[];
  AllowanceCharge?: AllowanceCharge[];
  TaxTotal: TaxTotal[];
  Item: Item[];
  Price: Price[];
  ItemPriceExtension: ItemPriceExtension[];
}

interface QuantityField {
  _: number | string;
  unitCode: string;
}

interface AllowanceCharge {
  ChargeIndicator: ValueField[];
  AllowanceChargeReason?: ValueField[];
  Amount: CurrencyField[];
}

interface Item {
  CommodityClassification: CommodityClassification[];
  Description: ValueField[];
}

interface CommodityClassification {
  ItemClassificationCode: TypeCodeField[];
}

interface Price {
  PriceAmount: CurrencyField[];
}

interface ItemPriceExtension {
  Amount: CurrencyField[];
}

interface InvoicePeriod {
  StartDate?: ValueField[];
  EndDate?: ValueField[];
  Description?: ValueField[];
}

interface BillingReference {
  InvoiceDocumentReference: InvoiceDocumentReference[];
}

interface InvoiceDocumentReference {
  ID: ValueField[];
  UUID?: ValueField[];
}

interface Delivery {
  DeliveryParty?: DeliveryParty[];
  Shipment?: Shipment[];
}

interface DeliveryParty {
  PartyLegalEntity: PartyLegalEntity[];
  PostalAddress?: PostalAddress[];
  PartyIdentification?: PartyIdentification[];
  Contact?: Contact[];
}

interface Shipment {
  ID: ValueField[];
  FreightAllowanceCharge?: FreightAllowanceCharge[];
}

interface FreightAllowanceCharge {
  ChargeIndicator: ValueField[];
  AllowanceChargeReason?: ValueField[];
  Amount: CurrencyField[];
}

interface PaymentMeans {
  PaymentMeansCode: ValueField[];
  PayeeFinancialAccount?: PayeeFinancialAccount[];
}

interface PayeeFinancialAccount {
  ID: ValueField[];
}

interface PaymentTerms {
  Note: ValueField[];
}

interface PrepaidPayment {
  ID?: ValueField[];
  PaidAmount: CurrencyField[];
  PaidDate?: ValueField[];
  PaidTime?: ValueField[];
}

export class EInvoiceService {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private get apiBaseUrl(): string {
    return MYINVOIS_ENV === 'production' 
      ? API_URLS.production.api 
      : API_URLS.sandbox.api;
  }

  private get portalBaseUrl(): string {
    return MYINVOIS_ENV === 'production' 
      ? API_URLS.production.portal 
      : API_URLS.sandbox.portal;
  }

  /**
   * Get or refresh OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!MYINVOIS_CLIENT_ID || !MYINVOIS_CLIENT_SECRET) {
      throw new Error('MyInvois credentials not configured');
    }

    const response = await fetch(`${this.apiBaseUrl}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MYINVOIS_CLIENT_ID,
        client_secret: MYINVOIS_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'InvoicingAPI',
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000); // Refresh 60s early

    return this.accessToken!;
  }

  /**
   * Validate a TIN (Tax Identification Number) with LHDN
   */
  async validateTIN(tin: string, idType: string, idValue: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(
        `${this.apiBaseUrl}/api/v1.0/taxpayer/validate/${encodeURIComponent(tin)}?idType=${encodeURIComponent(idType)}&idValue=${encodeURIComponent(idValue)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        return { valid: true };
      } else if (response.status === 400) {
        return { valid: false, message: 'TIN validation failed - invalid format or mismatch' };
      } else {
        const error = await response.json();
        return { valid: false, message: error.message || 'TIN validation failed' };
      }
    } catch (error) {
      logger.error('TIN validation error:', error);
      return { valid: false, message: 'TIN validation service unavailable' };
    }
  }

  /**
   * Validate invoice data against LHDN requirements
   */
  async validateInvoice(invoiceId: number): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];

    const invoice = await prisma.salesHeader.findUnique({
      where: { id: invoiceId },
      include: {
        details: { include: { product: true } },
        customer: true,
      },
    });

    if (!invoice) {
      return { valid: false, errors: [{ field: 'invoice', message: 'Invoice not found', code: 'NOT_FOUND' }] };
    }

    // Only INVOICE, CREDIT_NOTE, DEBIT_NOTE can be submitted
    const validDocTypes = ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'CASH_SALE'];
    if (!validDocTypes.includes(invoice.documentType)) {
      errors.push({ field: 'documentType', message: 'Document type not supported for e-Invoice', code: 'INVALID_DOC_TYPE' });
    }

    // Validate supplier info (from company settings)
    const company = await prisma.company.findFirst({ where: { isActive: true } });
    if (!company) {
      errors.push({ field: 'company', message: 'Company not configured', code: 'NO_COMPANY' });
    } else {
      if (!company.taxRegistrationNo) {
        errors.push({ field: 'supplier.tin', message: 'Company TIN not configured', code: 'MISSING_TIN' });
      }
      if (!company.registrationNo) {
        errors.push({ field: 'supplier.brn', message: 'Company BRN not configured', code: 'MISSING_BRN' });
      }
      if (!company.name || company.name.length > 300) {
        errors.push({ field: 'supplier.name', message: 'Company name required (max 300 chars)', code: 'INVALID_NAME' });
      }
      if (!company.address1) {
        errors.push({ field: 'supplier.address', message: 'Company address required', code: 'MISSING_ADDRESS' });
      }
      if (company.phone && (company.phone.length < 8 || company.phone.length > 20)) {
        errors.push({ field: 'supplier.phone', message: 'Phone must be 8-20 characters', code: 'INVALID_PHONE' });
      }
      if (company.postcode && company.country === 'Malaysia' && !/^\d{5}$/.test(company.postcode)) {
        errors.push({ field: 'supplier.postcode', message: 'Malaysian postcode must be 5 digits', code: 'INVALID_POSTCODE' });
      }
    }

    // Validate buyer info
    const customer = invoice.customer;
    if (!customer) {
      errors.push({ field: 'buyer', message: 'Customer not found', code: 'NO_CUSTOMER' });
    } else {
      if (!customer.taxRegNo) {
        errors.push({ field: 'buyer.tin', message: 'Customer TIN required for B2B', code: 'MISSING_TIN' });
      }
      if (!customer.businessRegNo) {
        errors.push({ field: 'buyer.brn', message: 'Customer BRN required', code: 'MISSING_BRN' });
      }
      if (!customer.name || customer.name.length > 300) {
        errors.push({ field: 'buyer.name', message: 'Customer name required (max 300 chars)', code: 'INVALID_NAME' });
      }
      if (!customer.address1) {
        errors.push({ field: 'buyer.address', message: 'Customer address required', code: 'MISSING_ADDRESS' });
      }
    }

    // Validate document date (cannot be more than 72 hours in the past)
    const maxAge = 72 * 60 * 60 * 1000; // 72 hours in ms
    if (new Date().getTime() - invoice.documentDate.getTime() > maxAge) {
      errors.push({ field: 'documentDate', message: 'Document date cannot be more than 72 hours in the past', code: 'DATE_TOO_OLD' });
    }

    // Validate line items
    if (!invoice.details || invoice.details.length === 0) {
      errors.push({ field: 'lineItems', message: 'At least one line item required', code: 'NO_ITEMS' });
    } else {
      invoice.details.forEach((line, index) => {
        if (!line.description) {
          errors.push({ field: `lineItems[${index}].description`, message: 'Item description required', code: 'MISSING_DESC' });
        }
        if (Number(line.quantity) <= 0) {
          errors.push({ field: `lineItems[${index}].quantity`, message: 'Quantity must be positive', code: 'INVALID_QTY' });
        }
      });
    }

    // Validate amounts
    if (Number(invoice.netTotal) === 0) {
      errors.push({ field: 'netTotal', message: 'Invoice total cannot be zero', code: 'ZERO_TOTAL' });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate UBL 2.1 JSON document for submission
   */
  async generateDocument(invoiceId: number): Promise<EInvoiceDocument> {
    const invoice = await prisma.salesHeader.findUnique({
      where: { id: invoiceId },
      include: {
        details: { include: { product: true } },
        customer: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const company = await prisma.company.findFirst({ where: { isActive: true } });
    if (!company) {
      throw new Error('Company not configured');
    }

    const customer = invoice.customer;
    const invoiceDate = invoice.documentDate;
    const currencyCode = invoice.currencyCode || 'MYR';

    // Map document type
    let typeCode = DOCUMENT_TYPE_CODES.INVOICE;
    if (invoice.documentType === 'CREDIT_NOTE') typeCode = DOCUMENT_TYPE_CODES.CREDIT_NOTE;
    else if (invoice.documentType === 'DEBIT_NOTE') typeCode = DOCUMENT_TYPE_CODES.DEBIT_NOTE;

    // Build invoice lines
    const invoiceLines: InvoiceLine[] = invoice.details.map((line, index) => ({
      ID: [{ _: String(index + 1) }],
      InvoicedQuantity: [{ _: Number(line.quantity), unitCode: line.uomCode || 'C62' }],
      LineExtensionAmount: [{ _: Number(line.subTotal), currencyID: currencyCode }],
      AllowanceCharge: Number(line.discountAmount) > 0 ? [{
        ChargeIndicator: [{ _: 'false' }],
        AllowanceChargeReason: [{ _: 'Discount' }],
        Amount: [{ _: Number(line.discountAmount), currencyID: currencyCode }],
      }] : undefined,
      TaxTotal: [{
        TaxAmount: [{ _: Number(line.taxAmount), currencyID: currencyCode }],
        TaxSubtotal: [{
          TaxableAmount: [{ _: Number(line.subTotal), currencyID: currencyCode }],
          TaxAmount: [{ _: Number(line.taxAmount), currencyID: currencyCode }],
          TaxCategory: [{
            ID: [{ _: line.taxCode || '01' }],
            TaxScheme: [{
              ID: [{ _: 'OTH', listVersionID: '1.0' }],
            }],
          }],
        }],
      }],
      Item: [{
        CommodityClassification: [{
          ItemClassificationCode: [{ _: '001', listVersionID: '1.0' }], // Default classification
        }],
        Description: [{ _: line.description || 'Item' }],
      }],
      Price: [{
        PriceAmount: [{ _: Number(line.unitPrice), currencyID: currencyCode }],
      }],
      ItemPriceExtension: [{
        Amount: [{ _: Number(line.quantity) * Number(line.unitPrice), currencyID: currencyCode }],
      }],
    }));

    const document: EInvoiceDocument = {
      _D: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      _A: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      Invoice: [{
        ID: [{ _: invoice.documentNo }],
        IssueDate: [{ _: invoiceDate.toISOString().split('T')[0] }],
        IssueTime: [{ _: invoiceDate.toISOString().split('T')[1].split('.')[0] + 'Z' }],
        InvoiceTypeCode: [{ _: typeCode, listVersionID: '1.0' }],
        DocumentCurrencyCode: [{ _: currencyCode }],
        TaxCurrencyCode: [{ _: currencyCode }],
        AccountingSupplierParty: [{
          Party: [{
            IndustryClassificationCode: [{ _: '46510' }], // Default MSIC code
            PartyIdentification: [
              { ID: [{ _: company.taxRegistrationNo || '', schemeID: 'TIN' }] },
              { ID: [{ _: company.registrationNo || '', schemeID: 'BRN' }] },
              { ID: [{ _: 'NA', schemeID: 'SST' }] },
              { ID: [{ _: 'NA', schemeID: 'TTX' }] },
            ],
            PostalAddress: [{
              CityName: [{ _: company.city || '' }],
              PostalZone: [{ _: company.postcode || '' }],
              CountrySubentityCode: [{ _: this.getStateCode(company.state || '') }],
              AddressLine: [
                { Line: [{ _: company.address1 || '' }] },
                { Line: [{ _: company.address2 || '' }] },
                { Line: [{ _: company.address3 || '' }] },
              ],
              Country: [{
                IdentificationCode: [{ _: 'MYS', listVersionID: 'ISO3166-1:2006' }],
              }],
            }],
            PartyLegalEntity: [{
              RegistrationName: [{ _: company.name }],
            }],
            Contact: [{
              Telephone: [{ _: company.phone || '' }],
              ElectronicMail: [{ _: company.email || '' }],
            }],
          }],
        }],
        AccountingCustomerParty: [{
          Party: [{
            PartyIdentification: [
              { ID: [{ _: customer.taxRegNo || '', schemeID: 'TIN' }] },
              { ID: [{ _: customer.businessRegNo || '', schemeID: 'BRN' }] },
              { ID: [{ _: 'NA', schemeID: 'SST' }] },
              { ID: [{ _: 'NA', schemeID: 'TTX' }] },
            ],
            PostalAddress: [{
              CityName: [{ _: customer.city || '' }],
              PostalZone: [{ _: customer.postcode || '' }],
              CountrySubentityCode: [{ _: this.getStateCode(customer.state || '') }],
              AddressLine: [
                { Line: [{ _: customer.address1 || '' }] },
                { Line: [{ _: customer.address2 || '' }] },
                { Line: [{ _: customer.address3 || '' }] },
              ],
              Country: [{
                IdentificationCode: [{ _: 'MYS', listVersionID: 'ISO3166-1:2006' }],
              }],
            }],
            PartyLegalEntity: [{
              RegistrationName: [{ _: customer.name }],
            }],
            Contact: [{
              Telephone: [{ _: customer.phone || '' }],
              ElectronicMail: [{ _: customer.email || '' }],
            }],
          }],
        }],
        TaxTotal: [{
          TaxAmount: [{ _: Number(invoice.taxAmount), currencyID: currencyCode }],
          TaxSubtotal: [{
            TaxableAmount: [{ _: Number(invoice.subTotal), currencyID: currencyCode }],
            TaxAmount: [{ _: Number(invoice.taxAmount), currencyID: currencyCode }],
            TaxCategory: [{
              ID: [{ _: '01' }], // Default tax type
              TaxScheme: [{
                ID: [{ _: 'OTH', listVersionID: '1.0' }],
              }],
            }],
          }],
        }],
        LegalMonetaryTotal: [{
          LineExtensionAmount: [{ _: Number(invoice.subTotal), currencyID: currencyCode }],
          TaxExclusiveAmount: [{ _: Number(invoice.subTotal) - Number(invoice.discountAmount), currencyID: currencyCode }],
          TaxInclusiveAmount: [{ _: Number(invoice.netTotal), currencyID: currencyCode }],
          AllowanceTotalAmount: Number(invoice.discountAmount) > 0 
            ? [{ _: Number(invoice.discountAmount), currencyID: currencyCode }] 
            : undefined,
          PayableRoundingAmount: Number(invoice.roundingAmount) !== 0 
            ? [{ _: Number(invoice.roundingAmount), currencyID: currencyCode }] 
            : undefined,
          PayableAmount: [{ _: Number(invoice.netTotal), currencyID: currencyCode }],
        }],
        InvoiceLine: invoiceLines,
      }],
    };

    return document;
  }

  /**
   * Submit invoice to MyInvois
   */
  async submitInvoice(invoiceId: number): Promise<{
    success: boolean;
    submissionId?: string;
    uuid?: string;
    longId?: string;
    errors?: string[];
  }> {
    // Validate first
    const validation = await this.validateInvoice(invoiceId);
    if (!validation.valid) {
      return { 
        success: false, 
        errors: validation.errors.map(e => `${e.field}: ${e.message}`) 
      };
    }

    try {
      // Generate document
      const document = await this.generateDocument(invoiceId);
      const documentStr = JSON.stringify(document);
      const documentBase64 = Buffer.from(documentStr).toString('base64');
      const documentHash = createHash('sha256').update(documentStr).digest('base64');

      const invoice = await prisma.salesHeader.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Get access token
      const token = await this.getAccessToken();

      // Submit document
      const response = await fetch(`${this.apiBaseUrl}/api/v1.0/documentsubmissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: [{
            format: 'JSON',
            documentHash,
            codeNumber: invoice.documentNo,
            document: documentBase64,
          }],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error?.message || result.message || 'Submission failed';
        await prisma.salesHeader.update({
          where: { id: invoiceId },
          data: {
            einvoiceStatus: EInvoiceStatus.INVALID,
            einvoiceErrorMsg: errorMsg,
          },
        });
        return { success: false, errors: [errorMsg] };
      }

      // Update invoice with submission info
      const submissionId = result.submissionUid;
      const acceptedDoc = result.acceptedDocuments?.[0];
      
      await prisma.salesHeader.update({
        where: { id: invoiceId },
        data: {
          einvoiceStatus: EInvoiceStatus.SUBMITTED,
          einvoiceSubmissionId: submissionId,
          einvoiceUUID: acceptedDoc?.uuid,
          einvoiceLongId: acceptedDoc?.longId,
          einvoiceSubmittedAt: new Date(),
          einvoiceQRUrl: acceptedDoc?.uuid && acceptedDoc?.longId 
            ? `${this.portalBaseUrl}/${acceptedDoc.uuid}/share/${acceptedDoc.longId}` 
            : null,
        },
      });

      return {
        success: true,
        submissionId,
        uuid: acceptedDoc?.uuid,
        longId: acceptedDoc?.longId,
      };
    } catch (error) {
      logger.error('E-Invoice submission error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      await prisma.salesHeader.update({
        where: { id: invoiceId },
        data: {
          einvoiceStatus: EInvoiceStatus.INVALID,
          einvoiceErrorMsg: errorMsg,
        },
      });

      return { success: false, errors: [errorMsg] };
    }
  }

  /**
   * Get submission status from MyInvois
   */
  async getSubmissionStatus(submissionId: string): Promise<{
    overallStatus: string;
    documents: Array<{
      uuid: string;
      status: number;
      statusName: string;
      longId?: string;
    }>;
  }> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.apiBaseUrl}/api/v1.0/documentsubmissions/${submissionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get submission status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check and update invoice status from MyInvois
   */
  async checkInvoiceStatus(invoiceId: number): Promise<{
    status: string;
    uuid?: string;
    longId?: string;
    validatedAt?: Date;
    error?: string;
  }> {
    const invoice = await prisma.salesHeader.findUnique({ where: { id: invoiceId } });
    
    if (!invoice || !invoice.einvoiceSubmissionId) {
      return { status: 'NOT_SUBMITTED' };
    }

    try {
      const submission = await this.getSubmissionStatus(invoice.einvoiceSubmissionId);
      const doc = submission.documents?.find(d => d.uuid === invoice.einvoiceUUID);

      if (!doc) {
        return { status: invoice.einvoiceStatus || 'UNKNOWN' };
      }

      let newStatus: string;
      switch (doc.status) {
        case 1: newStatus = EInvoiceStatus.SUBMITTED; break;
        case 2: newStatus = EInvoiceStatus.VALID; break;
        case 3: newStatus = EInvoiceStatus.INVALID; break;
        case 4: newStatus = EInvoiceStatus.CANCELLED; break;
        default: newStatus = EInvoiceStatus.SUBMITTED;
      }

      // Update database
      await prisma.salesHeader.update({
        where: { id: invoiceId },
        data: {
          einvoiceStatus: newStatus,
          einvoiceLongId: doc.longId || invoice.einvoiceLongId,
          einvoiceValidatedAt: newStatus === EInvoiceStatus.VALID ? new Date() : invoice.einvoiceValidatedAt,
          einvoiceQRUrl: doc.longId 
            ? `${this.portalBaseUrl}/${doc.uuid}/share/${doc.longId}` 
            : invoice.einvoiceQRUrl,
        },
      });

      return {
        status: newStatus,
        uuid: doc.uuid,
        longId: doc.longId,
        validatedAt: newStatus === EInvoiceStatus.VALID ? new Date() : undefined,
      };
    } catch (error) {
      logger.error('Error checking invoice status:', error);
      return { 
        status: invoice.einvoiceStatus || 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an e-invoice
   */
  async cancelInvoice(invoiceId: number, reason: string): Promise<{ success: boolean; error?: string }> {
    const invoice = await prisma.salesHeader.findUnique({ where: { id: invoiceId } });
    
    if (!invoice || !invoice.einvoiceUUID) {
      return { success: false, error: 'Invoice not submitted to MyInvois' };
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.apiBaseUrl}/api/v1.0/documents/state/${invoice.einvoiceUUID}/state`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'cancelled',
            reason,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Cancellation failed' };
      }

      await prisma.salesHeader.update({
        where: { id: invoiceId },
        data: {
          einvoiceStatus: EInvoiceStatus.CANCELLED,
        },
      });

      return { success: true };
    } catch (error) {
      logger.error('E-Invoice cancellation error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get Malaysian state code from state name
   */
  private getStateCode(state: string): string {
    const stateCodes: Record<string, string> = {
      'johor': '01', 'kedah': '02', 'kelantan': '03', 'melaka': '04',
      'negeri sembilan': '05', 'pahang': '06', 'pulau pinang': '07', 'penang': '07',
      'perak': '08', 'perlis': '09', 'selangor': '10', 'terengganu': '11',
      'sabah': '12', 'sarawak': '13', 'kuala lumpur': '14', 'kl': '14',
      'labuan': '15', 'putrajaya': '16',
    };
    return stateCodes[state.toLowerCase()] || '17'; // 17 = Not applicable
  }

  /**
   * Check if E-Invoice is configured and ready
   */
  isConfigured(): boolean {
    return !!(MYINVOIS_CLIENT_ID && MYINVOIS_CLIENT_SECRET);
  }
}

export const einvoiceService = new EInvoiceService();
