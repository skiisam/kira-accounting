import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const purchaseController = new PurchaseController();

router.use(authenticate);

// Purchase Requests
router.get('/requests', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.listRequests);
router.get('/requests/:id', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.getRequest);
router.post('/requests', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.createRequest);
router.put('/requests/:id', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.updateRequest);
router.delete('/requests/:id', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.deleteRequest);
router.post('/requests/:id/transfer', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.transferRequest);
router.get('/requests/:id/transferable-lines', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.getTransferableLines);
router.post('/requests/:id/void', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.voidDocument);

// Purchase Orders
router.get('/orders', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.listOrders);
router.get('/orders/:id', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.getOrder);
router.post('/orders', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.createOrder);
router.put('/orders/:id', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.updateOrder);
router.delete('/orders/:id', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.deleteOrder);
router.post('/orders/:id/transfer', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.transferOrder);
router.get('/orders/:id/transferable-lines', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.getTransferableLines);
router.post('/orders/:id/void', requirePermission('PURCHASE', 'PURCHASE_ORDER'), purchaseController.voidDocument);

// Goods Received Notes
router.get('/grn', requirePermission('PURCHASE', 'GRN'), purchaseController.listGRN);
router.get('/grn/:id', requirePermission('PURCHASE', 'GRN'), purchaseController.getGRN);
router.post('/grn', requirePermission('PURCHASE', 'GRN'), purchaseController.createGRN);
router.put('/grn/:id', requirePermission('PURCHASE', 'GRN'), purchaseController.updateGRN);
router.delete('/grn/:id', requirePermission('PURCHASE', 'GRN'), purchaseController.deleteGRN);
router.post('/grn/:id/transfer', requirePermission('PURCHASE', 'GRN'), purchaseController.transferGRN);
router.get('/grn/:id/transferable-lines', requirePermission('PURCHASE', 'GRN'), purchaseController.getTransferableLines);
router.post('/grn/:id/void', requirePermission('PURCHASE', 'GRN'), purchaseController.voidDocument);

// Purchase Invoices
router.get('/invoices', requirePermission('PURCHASE', 'PURCHASE_INVOICE'), purchaseController.listInvoices);
router.get('/invoices/:id', requirePermission('PURCHASE', 'PURCHASE_INVOICE'), purchaseController.getInvoice);
router.post('/invoices', requirePermission('PURCHASE', 'PURCHASE_INVOICE'), purchaseController.createInvoice);
router.put('/invoices/:id', requirePermission('PURCHASE', 'PURCHASE_INVOICE'), purchaseController.updateInvoice);
router.delete('/invoices/:id', requirePermission('PURCHASE', 'PURCHASE_INVOICE'), purchaseController.deleteInvoice);
router.post('/invoices/:id/post', requirePermission('PURCHASE', 'PURCHASE_INVOICE'), purchaseController.postInvoice);
router.post('/invoices/:id/void', requirePermission('PURCHASE', 'PURCHASE_INVOICE'), purchaseController.voidDocument);

// Cash Purchases
router.get('/cash-purchases', requirePermission('PURCHASE', 'CASH_PURCHASE'), purchaseController.listCashPurchases);
router.post('/cash-purchases', requirePermission('PURCHASE', 'CASH_PURCHASE'), purchaseController.createCashPurchase);

// Credit Notes (Supplier Credit Note - reduces what we owe)
router.get('/credit-notes', requirePermission('PURCHASE', 'CREDIT_NOTE'), purchaseController.listCreditNotes);
router.get('/credit-notes/:id', requirePermission('PURCHASE', 'CREDIT_NOTE'), purchaseController.getCreditNote);
router.post('/credit-notes', requirePermission('PURCHASE', 'CREDIT_NOTE'), purchaseController.createCreditNote);
router.put('/credit-notes/:id', requirePermission('PURCHASE', 'CREDIT_NOTE'), purchaseController.updateCreditNote);
router.delete('/credit-notes/:id', requirePermission('PURCHASE', 'CREDIT_NOTE'), purchaseController.deleteCreditNote);
router.post('/credit-notes/:id/void', requirePermission('PURCHASE', 'CREDIT_NOTE'), purchaseController.voidDocument);

// Debit Notes (Supplier Debit Note - increases what we owe)
router.get('/debit-notes', requirePermission('PURCHASE', 'DEBIT_NOTE'), purchaseController.listDebitNotes);
router.get('/debit-notes/:id', requirePermission('PURCHASE', 'DEBIT_NOTE'), purchaseController.getDebitNote);
router.post('/debit-notes', requirePermission('PURCHASE', 'DEBIT_NOTE'), purchaseController.createDebitNote);
router.put('/debit-notes/:id', requirePermission('PURCHASE', 'DEBIT_NOTE'), purchaseController.updateDebitNote);
router.delete('/debit-notes/:id', requirePermission('PURCHASE', 'DEBIT_NOTE'), purchaseController.deleteDebitNote);
router.post('/debit-notes/:id/void', requirePermission('PURCHASE', 'DEBIT_NOTE'), purchaseController.voidDocument);

// Common
router.post('/:id/void', purchaseController.voidDocument);
router.post('/:id/print', purchaseController.printDocument);

export default router;
