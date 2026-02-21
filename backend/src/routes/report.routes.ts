import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const reportController = new ReportController();

router.use(authenticate);

// General Ledger Reports
router.get('/gl/trial-balance', requirePermission('REPORTS', 'TRIAL_BALANCE'), reportController.trialBalance);
router.get('/gl/profit-loss', requirePermission('REPORTS', 'PROFIT_LOSS'), reportController.profitLoss);
router.get('/gl/balance-sheet', requirePermission('REPORTS', 'BALANCE_SHEET'), reportController.balanceSheet);
router.get('/gl/ledger-listing', requirePermission('REPORTS', 'GL_LEDGER'), reportController.ledgerListing);
router.get('/gl/journal-listing', requirePermission('REPORTS', 'GL_JOURNAL'), reportController.journalListing);

// AR Reports
router.get('/ar/customer-listing', requirePermission('REPORTS', 'CUSTOMER_LISTING'), reportController.customerListing);
router.get('/ar/customer-aging', requirePermission('REPORTS', 'AR_AGING'), reportController.customerAging);
router.get('/ar/customer-statement', requirePermission('REPORTS', 'CUSTOMER_STATEMENT'), reportController.customerStatement);
router.get('/ar/invoice-listing', requirePermission('REPORTS', 'AR_INVOICE'), reportController.arInvoiceListing);
router.get('/ar/payment-listing', requirePermission('REPORTS', 'AR_PAYMENT'), reportController.arPaymentListing);

// AP Reports
router.get('/ap/vendor-listing', requirePermission('REPORTS', 'VENDOR_LISTING'), reportController.vendorListing);
router.get('/ap/vendor-aging', requirePermission('REPORTS', 'AP_AGING'), reportController.vendorAging);
router.get('/ap/vendor-statement', requirePermission('REPORTS', 'VENDOR_STATEMENT'), reportController.vendorStatement);
router.get('/ap/invoice-listing', requirePermission('REPORTS', 'AP_INVOICE'), reportController.apInvoiceListing);
router.get('/ap/payment-listing', requirePermission('REPORTS', 'AP_PAYMENT'), reportController.apPaymentListing);

// Sales Reports
router.get('/sales/sales-listing', requirePermission('REPORTS', 'SALES_LISTING'), reportController.salesListing);
router.get('/sales/sales-by-customer', requirePermission('REPORTS', 'SALES_ANALYSIS'), reportController.salesByCustomer);
router.get('/sales/sales-by-product', requirePermission('REPORTS', 'SALES_ANALYSIS'), reportController.salesByProduct);
router.get('/sales/sales-by-agent', requirePermission('REPORTS', 'SALES_ANALYSIS'), reportController.salesByAgent);
router.get('/sales/outstanding-do', requirePermission('REPORTS', 'OUTSTANDING_DO'), reportController.outstandingDO);
router.get('/sales/outstanding-so', requirePermission('REPORTS', 'OUTSTANDING_SO'), reportController.outstandingSO);

// Purchase Reports
router.get('/purchase/purchase-listing', requirePermission('REPORTS', 'PURCHASE_LISTING'), reportController.purchaseListing);
router.get('/purchase/purchase-by-vendor', requirePermission('REPORTS', 'PURCHASE_ANALYSIS'), reportController.purchaseByVendor);
router.get('/purchase/purchase-by-product', requirePermission('REPORTS', 'PURCHASE_ANALYSIS'), reportController.purchaseByProduct);
router.get('/purchase/outstanding-po', requirePermission('REPORTS', 'OUTSTANDING_PO'), reportController.outstandingPO);

// Stock Reports
router.get('/stock/stock-balance', requirePermission('REPORTS', 'STOCK_BALANCE'), reportController.stockBalance);
router.get('/stock/stock-card', requirePermission('REPORTS', 'STOCK_CARD'), reportController.stockCard);
router.get('/stock/stock-movement', requirePermission('REPORTS', 'STOCK_MOVEMENT'), reportController.stockMovement);
router.get('/stock/stock-valuation', requirePermission('REPORTS', 'STOCK_VALUATION'), reportController.stockValuation);
router.get('/stock/reorder-advisory', requirePermission('REPORTS', 'REORDER_ADVISORY'), reportController.reorderAdvisory);
router.get('/stock/slow-moving', requirePermission('REPORTS', 'SLOW_MOVING'), reportController.slowMovingStock);

// Tax Reports
router.get('/tax/sst-report', requirePermission('REPORTS', 'SST_REPORT'), reportController.sstReport);

// Export
router.post('/export', reportController.exportReport);

export default router;
