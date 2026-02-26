import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const salesController = new SalesController();

router.use(authenticate);

// Quotations
router.get('/quotations', requirePermission('SALES', 'QUOTATION'), salesController.listQuotations);
router.get('/quotations/:id', requirePermission('SALES', 'QUOTATION'), salesController.getQuotation);
router.post('/quotations', requirePermission('SALES', 'QUOTATION'), salesController.createQuotation);
router.put('/quotations/:id', requirePermission('SALES', 'QUOTATION'), salesController.updateQuotation);
router.delete('/quotations/:id', requirePermission('SALES', 'QUOTATION'), salesController.deleteQuotation);
router.post('/quotations/:id/transfer', requirePermission('SALES', 'QUOTATION'), salesController.transferQuotation);
router.get('/quotations/:id/transferable-lines', requirePermission('SALES', 'QUOTATION'), salesController.getTransferableLines);
router.post('/quotations/:id/void', requirePermission('SALES', 'QUOTATION'), salesController.voidDocument);

// Sales Orders
router.get('/orders', requirePermission('SALES', 'SALES_ORDER'), salesController.listOrders);
router.get('/orders/:id', requirePermission('SALES', 'SALES_ORDER'), salesController.getOrder);
router.post('/orders', requirePermission('SALES', 'SALES_ORDER'), salesController.createOrder);
router.put('/orders/:id', requirePermission('SALES', 'SALES_ORDER'), salesController.updateOrder);
router.delete('/orders/:id', requirePermission('SALES', 'SALES_ORDER'), salesController.deleteOrder);
router.post('/orders/:id/transfer', requirePermission('SALES', 'SALES_ORDER'), salesController.transferOrder);
router.get('/orders/:id/transferable-lines', requirePermission('SALES', 'SALES_ORDER'), salesController.getTransferableLines);
router.post('/orders/:id/void', requirePermission('SALES', 'SALES_ORDER'), salesController.voidDocument);
router.get('/orders/:id/stock-check', requirePermission('SALES', 'SALES_ORDER'), salesController.stockCheckForOrder);

// Delivery Orders
router.get('/delivery-orders', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.listDeliveryOrders);
router.get('/delivery-orders/:id', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.getDeliveryOrder);
router.post('/delivery-orders', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.createDeliveryOrder);
router.put('/delivery-orders/:id', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.updateDeliveryOrder);
router.delete('/delivery-orders/:id', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.deleteDeliveryOrder);
router.post('/delivery-orders/:id/transfer', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.transferDeliveryOrder);
router.get('/delivery-orders/:id/transferable-lines', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.getTransferableLines);
router.post('/delivery-orders/:id/void', requirePermission('SALES', 'DELIVERY_ORDER'), salesController.voidDocument);

// Invoices
router.get('/invoices', requirePermission('SALES', 'INVOICE'), salesController.listInvoices);
router.get('/invoices/:id', requirePermission('SALES', 'INVOICE'), salesController.getInvoice);
router.post('/invoices', requirePermission('SALES', 'INVOICE'), salesController.createInvoice);
router.put('/invoices/:id', requirePermission('SALES', 'INVOICE'), salesController.updateInvoice);
router.delete('/invoices/:id', requirePermission('SALES', 'INVOICE'), salesController.deleteInvoice);
router.post('/invoices/:id/post', requirePermission('SALES', 'INVOICE'), salesController.postInvoice);
router.post('/invoices/:id/void', requirePermission('SALES', 'INVOICE'), salesController.voidDocument);

// Pricing helpers
router.get('/price-history', requirePermission('SALES', 'VIEW'), salesController.getPriceHistory);

// Cash Sales
router.get('/cash-sales', requirePermission('SALES', 'CASH_SALE'), salesController.listCashSales);
router.get('/cash-sales/:id', requirePermission('SALES', 'CASH_SALE'), salesController.getCashSale);
router.post('/cash-sales', requirePermission('SALES', 'CASH_SALE'), salesController.createCashSale);
router.put('/cash-sales/:id', requirePermission('SALES', 'CASH_SALE'), salesController.updateCashSale);
router.delete('/cash-sales/:id', requirePermission('SALES', 'CASH_SALE'), salesController.deleteCashSale);
router.post('/cash-sales/:id/void', requirePermission('SALES', 'CASH_SALE'), salesController.voidDocument);

// Credit Notes (Sales CN - reduces customer balance)
router.get('/credit-notes', requirePermission('SALES', 'CREDIT_NOTE'), salesController.listCreditNotes);
router.get('/credit-notes/:id', requirePermission('SALES', 'CREDIT_NOTE'), salesController.getCreditNote);
router.post('/credit-notes', requirePermission('SALES', 'CREDIT_NOTE'), salesController.createCreditNote);
router.put('/credit-notes/:id', requirePermission('SALES', 'CREDIT_NOTE'), salesController.updateCreditNote);
router.delete('/credit-notes/:id', requirePermission('SALES', 'CREDIT_NOTE'), salesController.deleteCreditNote);
router.post('/credit-notes/:id/void', requirePermission('SALES', 'CREDIT_NOTE'), salesController.voidDocument);

// Debit Notes (Sales DN - increases customer balance)
router.get('/debit-notes', requirePermission('SALES', 'DEBIT_NOTE'), salesController.listDebitNotes);
router.get('/debit-notes/:id', requirePermission('SALES', 'DEBIT_NOTE'), salesController.getDebitNote);
router.post('/debit-notes', requirePermission('SALES', 'DEBIT_NOTE'), salesController.createDebitNote);
router.put('/debit-notes/:id', requirePermission('SALES', 'DEBIT_NOTE'), salesController.updateDebitNote);
router.delete('/debit-notes/:id', requirePermission('SALES', 'DEBIT_NOTE'), salesController.deleteDebitNote);
router.post('/debit-notes/:id/void', requirePermission('SALES', 'DEBIT_NOTE'), salesController.voidDocument);

// Common (fallback)
router.post('/:id/void', salesController.voidDocument);
router.post('/:id/print', salesController.printDocument);

export default router;
