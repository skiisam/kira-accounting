import { prisma } from '../config/database';

export class DocumentService {
  /**
   * Get next document number for a document type
   */
  async getNextNumber(documentType: string): Promise<string> {
    // Find the default series for this document type
    const series = await prisma.documentSeries.findFirst({
      where: {
        documentType,
        isDefault: true,
        isActive: true,
      },
    });

    if (!series) {
      // Fallback: generate simple number
      const count = await this.getDocumentCount(documentType);
      return `${documentType.substring(0, 3).toUpperCase()}-${String(count + 1).padStart(6, '0')}`;
    }

    // Check if we need to reset (yearly/monthly)
    const now = new Date();
    let nextNumber = series.nextNumber;

    // TODO: Implement yearly/monthly reset logic

    // Format the number
    const paddedNumber = String(nextNumber).padStart(series.numberLength, '0');
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');

    let documentNo = '';
    if (series.prefix) {
      documentNo = series.prefix
        .replace('{YYYY}', now.getFullYear().toString())
        .replace('{YY}', year)
        .replace('{MM}', month);
    }
    documentNo += paddedNumber;
    if (series.suffix) {
      documentNo += series.suffix;
    }

    // Increment the counter
    await prisma.documentSeries.update({
      where: { id: series.id },
      data: { nextNumber: nextNumber + 1 },
    });

    return documentNo;
  }

  /**
   * Get document count for fallback numbering
   */
  private async getDocumentCount(documentType: string): Promise<number> {
    switch (documentType) {
      case 'QUOTATION':
      case 'SALES_ORDER':
      case 'DELIVERY_ORDER':
      case 'INVOICE':
      case 'CASH_SALE':
      case 'CREDIT_NOTE':
        return prisma.salesHeader.count({ where: { documentType } });
      case 'PURCHASE_ORDER':
      case 'GRN':
      case 'PURCHASE_INVOICE':
        return prisma.purchaseHeader.count({ where: { documentType } });
      case 'AR_INVOICE':
        return prisma.aRInvoice.count();
      case 'AR_PAYMENT':
        return prisma.aRPayment.count();
      case 'AP_INVOICE':
        return prisma.aPInvoice.count();
      case 'AP_PAYMENT':
        return prisma.aPPayment.count();
      case 'JOURNAL':
        return prisma.journalEntry.count();
      default:
        return 0;
    }
  }

  /**
   * Parse discount text (e.g., "10%", "5%+2%", "100")
   */
  parseDiscount(discountText: string, amount: number): number {
    if (!discountText) return 0;

    const text = discountText.trim();

    // Fixed amount
    if (!text.includes('%')) {
      return parseFloat(text) || 0;
    }

    // Percentage(s)
    let remaining = amount;
    const parts = text.split('+');

    for (const part of parts) {
      const pct = parseFloat(part.replace('%', '')) || 0;
      const discount = remaining * (pct / 100);
      remaining -= discount;
    }

    return amount - remaining;
  }

  /**
   * Calculate tax amount
   */
  calculateTax(amount: number, taxRate: number, isTaxInclusive: boolean = false): { taxableAmount: number; taxAmount: number } {
    if (isTaxInclusive) {
      const taxableAmount = amount / (1 + taxRate / 100);
      const taxAmount = amount - taxableAmount;
      return { taxableAmount, taxAmount };
    } else {
      const taxAmount = amount * (taxRate / 100);
      return { taxableAmount: amount, taxAmount };
    }
  }

  /**
   * Round amount according to settings
   */
  roundAmount(amount: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Calculate rounding adjustment (for Malaysia 5 sen rounding)
   */
  calculateRounding(amount: number, roundTo: number = 0.05): number {
    const rounded = Math.round(amount / roundTo) * roundTo;
    return this.roundAmount(rounded - amount, 2);
  }
}

export const documentService = new DocumentService();
