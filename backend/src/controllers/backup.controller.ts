import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { BaseController } from './base.controller';
import { BadRequestError } from '../middleware/errorHandler';
import * as fs from 'fs';
import * as path from 'path';

export class BackupController extends BaseController<any> {
  protected modelName = 'Backup';

  /**
   * Export all data as JSON backup
   */
  exportData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { includeTransactions = true, format = 'json' } = req.query;
      const userId = req.user?.userId;

      // Master data - always included
      const masterData = await this.exportMasterData();

      // Transaction data - optional
      let transactionData = {};
      if (includeTransactions === 'true' || includeTransactions === true) {
        transactionData = await this.exportTransactionData();
      }

      const backup = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: userId,
          version: '1.0.0',
          includesTransactions: includeTransactions === 'true' || includeTransactions === true,
        },
        master: masterData,
        transactions: transactionData,
      };

      // Set headers for file download
      const filename = `kira-backup-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.json(backup);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export master data only
   */
  private async exportMasterData() {
    const [
      customers,
      vendors,
      products,
      accounts,
      accountTypes,
      currencies,
      taxCodes,
      uoms,
      locations,
      userGroups,
      users,
      company,
    ] = await Promise.all([
      prisma.customer.findMany({ where: { isActive: true } }),
      prisma.vendor.findMany({ where: { isActive: true } }),
      prisma.product.findMany({ where: { isActive: true } }),
      prisma.account.findMany({ where: { isActive: true } }),
      prisma.accountType.findMany({ where: { isActive: true } }),
      prisma.currency.findMany({ where: { isActive: true } }),
      prisma.taxCode.findMany({ where: { isActive: true } }),
      prisma.uOM.findMany(),
      prisma.location.findMany({ where: { isActive: true } }),
      prisma.userGroup.findMany(),
      prisma.user.findMany({ select: { id: true, code: true, name: true, email: true, groupId: true, isAdmin: true } }),
      prisma.company.findFirst(),
    ]);

    return {
      customers,
      vendors,
      products,
      accounts,
      accountTypes,
      currencies,
      taxCodes,
      uoms,
      locations,
      userGroups,
      users,
      company,
    };
  }

  /**
   * Export transaction data
   */
  private async exportTransactionData() {
    const [
      salesHeaders,
      salesDetails,
      purchaseHeaders,
      purchaseDetails,
      arReceipts,
      apPayments,
      journalHeaders,
      journalDetails,
      stockMovements,
    ] = await Promise.all([
      prisma.salesHeader.findMany({ where: { isVoid: false } }),
      prisma.salesDetail.findMany(),
      prisma.purchaseHeader.findMany({ where: { isVoid: false } }),
      prisma.purchaseDetail.findMany(),
      prisma.aRReceipt.findMany({ where: { isVoid: false } }),
      prisma.aPPayment.findMany({ where: { isVoid: false } }),
      prisma.journalHeader.findMany({ where: { isVoid: false } }),
      prisma.journalDetail.findMany(),
      prisma.stockMovement.findMany(),
    ]);

    return {
      sales: { headers: salesHeaders, details: salesDetails },
      purchases: { headers: purchaseHeaders, details: purchaseDetails },
      arReceipts,
      apPayments,
      journals: { headers: journalHeaders, details: journalDetails },
      stockMovements,
    };
  }

  /**
   * Import data from backup file
   */
  importData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const backupData = req.body;
      const { overwrite = false, importTransactions = true } = req.query;
      const userId = req.user?.userId;

      if (!backupData || !backupData.metadata) {
        throw BadRequestError('Invalid backup file format');
      }

      const results = {
        master: { success: 0, failed: 0, errors: [] as string[] },
        transactions: { success: 0, failed: 0, errors: [] as string[] },
      };

      // Import master data
      if (backupData.master) {
        await this.importMasterData(backupData.master, overwrite === 'true', results.master);
      }

      // Import transaction data
      if (importTransactions === 'true' && backupData.transactions) {
        await this.importTransactionData(backupData.transactions, results.transactions);
      }

      this.successResponse(res, {
        message: 'Import completed',
        results,
        importedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Import master data
   */
  private async importMasterData(
    data: any,
    overwrite: boolean,
    results: { success: number; failed: number; errors: string[] }
  ) {
    // Import customers
    if (data.customers) {
      for (const customer of data.customers) {
        try {
          await prisma.customer.upsert({
            where: { code: customer.code },
            update: overwrite ? customer : {},
            create: customer,
          });
          results.success++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Customer ${customer.code}: ${e.message}`);
        }
      }
    }

    // Import vendors
    if (data.vendors) {
      for (const vendor of data.vendors) {
        try {
          await prisma.vendor.upsert({
            where: { code: vendor.code },
            update: overwrite ? vendor : {},
            create: vendor,
          });
          results.success++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Vendor ${vendor.code}: ${e.message}`);
        }
      }
    }

    // Import products
    if (data.products) {
      for (const product of data.products) {
        try {
          await prisma.product.upsert({
            where: { code: product.code },
            update: overwrite ? product : {},
            create: product,
          });
          results.success++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Product ${product.code}: ${e.message}`);
        }
      }
    }

    // Import accounts
    if (data.accounts) {
      for (const account of data.accounts) {
        try {
          await prisma.account.upsert({
            where: { accountNo: account.accountNo },
            update: overwrite ? account : {},
            create: account,
          });
          results.success++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Account ${account.accountNo}: ${e.message}`);
        }
      }
    }
  }

  /**
   * Import transaction data
   */
  private async importTransactionData(
    data: any,
    results: { success: number; failed: number; errors: string[] }
  ) {
    // This is more complex - need to handle relationships
    // For now, just count and skip (full implementation would need careful ordering)
    results.errors.push('Transaction import requires manual review - data exported for reference');
  }

  /**
   * Get backup history (if implemented with backup logging)
   */
  getBackupHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Placeholder - could track backups in a BackupLog table
      this.successResponse(res, {
        message: 'Backup history not yet implemented',
        backups: [],
      });
    } catch (error) {
      next(error);
    }
  };
}
