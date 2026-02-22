import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

interface ChangeCodeRequest {
  oldCode: string;
  newCode: string;
}

interface ChangeCodeResult {
  masterUpdated: boolean;
  transactionsUpdated: Record<string, number>;
  totalRecordsUpdated: number;
}

export class CodeChangeController {
  /**
   * Change customer code and update all related transactions
   * POST /api/v1/settings/change-code/customer
   */
  changeCustomerCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldCode, newCode } = req.body as ChangeCodeRequest;

      // Validate input
      if (!oldCode || !newCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Both oldCode and newCode are required' },
        });
      }

      const upperOldCode = oldCode.toUpperCase();
      const upperNewCode = newCode.toUpperCase();

      if (upperOldCode === upperNewCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'New code must be different from old code' },
        });
      }

      // Check if old code exists
      const existingCustomer = await prisma.customer.findUnique({ where: { code: upperOldCode } });
      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Customer with code "${upperOldCode}" not found` },
        });
      }

      // Check if new code already exists
      const duplicateCustomer = await prisma.customer.findUnique({ where: { code: upperNewCode } });
      if (duplicateCustomer) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: `Customer code "${upperNewCode}" already exists` },
        });
      }

      // Execute in transaction
      const result = await prisma.$transaction(async (tx) => {
        const updates: Record<string, number> = {};

        // 1. Update master record
        await tx.customer.update({
          where: { code: upperOldCode },
          data: { code: upperNewCode },
        });
        updates.customer = 1;

        // 2. Update SalesHeader
        const salesHeaderResult = await tx.salesHeader.updateMany({
          where: { customerCode: upperOldCode },
          data: { customerCode: upperNewCode },
        });
        updates.salesHeader = salesHeaderResult.count;

        // 3. Update ARInvoice
        const arInvoiceResult = await tx.aRInvoice.updateMany({
          where: { customerCode: upperOldCode },
          data: { customerCode: upperNewCode },
        });
        updates.arInvoice = arInvoiceResult.count;

        // 4. Update ARPayment
        const arPaymentResult = await tx.aRPayment.updateMany({
          where: { customerCode: upperOldCode },
          data: { customerCode: upperNewCode },
        });
        updates.arPayment = arPaymentResult.count;

        return updates;
      });

      const totalRecordsUpdated = Object.values(result).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        data: {
          oldCode: upperOldCode,
          newCode: upperNewCode,
          masterUpdated: true,
          transactionsUpdated: result,
          totalRecordsUpdated,
        },
        message: `Customer code changed from "${upperOldCode}" to "${upperNewCode}". ${totalRecordsUpdated} record(s) updated.`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change vendor code and update all related transactions
   * POST /api/v1/settings/change-code/vendor
   */
  changeVendorCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldCode, newCode } = req.body as ChangeCodeRequest;

      // Validate input
      if (!oldCode || !newCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Both oldCode and newCode are required' },
        });
      }

      const upperOldCode = oldCode.toUpperCase();
      const upperNewCode = newCode.toUpperCase();

      if (upperOldCode === upperNewCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'New code must be different from old code' },
        });
      }

      // Check if old code exists
      const existingVendor = await prisma.vendor.findUnique({ where: { code: upperOldCode } });
      if (!existingVendor) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Vendor with code "${upperOldCode}" not found` },
        });
      }

      // Check if new code already exists
      const duplicateVendor = await prisma.vendor.findUnique({ where: { code: upperNewCode } });
      if (duplicateVendor) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: `Vendor code "${upperNewCode}" already exists` },
        });
      }

      // Execute in transaction
      const result = await prisma.$transaction(async (tx) => {
        const updates: Record<string, number> = {};

        // 1. Update master record
        await tx.vendor.update({
          where: { code: upperOldCode },
          data: { code: upperNewCode },
        });
        updates.vendor = 1;

        // 2. Update PurchaseHeader
        const purchaseHeaderResult = await tx.purchaseHeader.updateMany({
          where: { vendorCode: upperOldCode },
          data: { vendorCode: upperNewCode },
        });
        updates.purchaseHeader = purchaseHeaderResult.count;

        // 3. Update APInvoice
        const apInvoiceResult = await tx.aPInvoice.updateMany({
          where: { vendorCode: upperOldCode },
          data: { vendorCode: upperNewCode },
        });
        updates.apInvoice = apInvoiceResult.count;

        // 4. Update APPayment
        const apPaymentResult = await tx.aPPayment.updateMany({
          where: { vendorCode: upperOldCode },
          data: { vendorCode: upperNewCode },
        });
        updates.apPayment = apPaymentResult.count;

        return updates;
      });

      const totalRecordsUpdated = Object.values(result).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        data: {
          oldCode: upperOldCode,
          newCode: upperNewCode,
          masterUpdated: true,
          transactionsUpdated: result,
          totalRecordsUpdated,
        },
        message: `Vendor code changed from "${upperOldCode}" to "${upperNewCode}". ${totalRecordsUpdated} record(s) updated.`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change product code and update all related transactions
   * POST /api/v1/settings/change-code/product
   */
  changeProductCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldCode, newCode } = req.body as ChangeCodeRequest;

      // Validate input
      if (!oldCode || !newCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Both oldCode and newCode are required' },
        });
      }

      const upperOldCode = oldCode.toUpperCase();
      const upperNewCode = newCode.toUpperCase();

      if (upperOldCode === upperNewCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'New code must be different from old code' },
        });
      }

      // Check if old code exists
      const existingProduct = await prisma.product.findUnique({ where: { code: upperOldCode } });
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Product with code "${upperOldCode}" not found` },
        });
      }

      // Check if new code already exists
      const duplicateProduct = await prisma.product.findUnique({ where: { code: upperNewCode } });
      if (duplicateProduct) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: `Product code "${upperNewCode}" already exists` },
        });
      }

      // Execute in transaction
      const result = await prisma.$transaction(async (tx) => {
        const updates: Record<string, number> = {};

        // 1. Update master record
        await tx.product.update({
          where: { code: upperOldCode },
          data: { code: upperNewCode },
        });
        updates.product = 1;

        // 2. Update SalesDetail
        const salesDetailResult = await tx.salesDetail.updateMany({
          where: { productCode: upperOldCode },
          data: { productCode: upperNewCode },
        });
        updates.salesDetail = salesDetailResult.count;

        // 3. Update PurchaseDetail
        const purchaseDetailResult = await tx.purchaseDetail.updateMany({
          where: { productCode: upperOldCode },
          data: { productCode: upperNewCode },
        });
        updates.purchaseDetail = purchaseDetailResult.count;

        // 4. Update StockTransactionDetail
        const stockDetailResult = await tx.stockTransactionDetail.updateMany({
          where: { productCode: upperOldCode },
          data: { productCode: upperNewCode },
        });
        updates.stockTransactionDetail = stockDetailResult.count;

        return updates;
      });

      const totalRecordsUpdated = Object.values(result).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        data: {
          oldCode: upperOldCode,
          newCode: upperNewCode,
          masterUpdated: true,
          transactionsUpdated: result,
          totalRecordsUpdated,
        },
        message: `Product code changed from "${upperOldCode}" to "${upperNewCode}". ${totalRecordsUpdated} record(s) updated.`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change account code (accountNo) and update all related transactions
   * POST /api/v1/settings/change-code/account
   */
  changeAccountCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldCode, newCode } = req.body as ChangeCodeRequest;

      // Validate input
      if (!oldCode || !newCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Both oldCode and newCode are required' },
        });
      }

      // Account codes can be mixed case in some systems
      const trimOldCode = oldCode.trim();
      const trimNewCode = newCode.trim();

      if (trimOldCode === trimNewCode) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'New code must be different from old code' },
        });
      }

      // Check if old code exists (account uses accountNo field)
      const existingAccount = await prisma.account.findFirst({ where: { accountNo: trimOldCode } });
      if (!existingAccount) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Account with code "${trimOldCode}" not found` },
        });
      }

      // Check if new code already exists
      const duplicateAccount = await prisma.account.findFirst({ where: { accountNo: trimNewCode } });
      if (duplicateAccount) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: `Account code "${trimNewCode}" already exists` },
        });
      }

      // Execute in transaction
      const result = await prisma.$transaction(async (tx) => {
        const updates: Record<string, number> = {};

        // 1. Update master record
        await tx.account.update({
          where: { id: existingAccount.id },
          data: { accountNo: trimNewCode },
        });
        updates.account = 1;

        // Note: JournalEntryDetail, ARInvoiceDetail, APInvoiceDetail, SalesDetail, PurchaseDetail
        // all use accountId (foreign key) instead of accountNo string,
        // so they don't need to be updated - they reference by ID.
        // The account code change is purely cosmetic for the master record.

        return updates;
      });

      const totalRecordsUpdated = Object.values(result).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        data: {
          oldCode: trimOldCode,
          newCode: trimNewCode,
          masterUpdated: true,
          transactionsUpdated: result,
          totalRecordsUpdated,
          note: 'Account transactions reference by ID, so only the master record code was updated.',
        },
        message: `Account code changed from "${trimOldCode}" to "${trimNewCode}". ${totalRecordsUpdated} record(s) updated.`,
      });
    } catch (error) {
      next(error);
    }
  };
}
