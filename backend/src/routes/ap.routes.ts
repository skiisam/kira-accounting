import { Router } from 'express';
import { APController } from '../controllers/ap.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const apController = new APController();

router.use(authenticate);

// AP Invoices
router.get('/invoices', requirePermission('AP', 'AP_INVOICE'), apController.listInvoices);
router.get('/invoices/:id', requirePermission('AP', 'AP_INVOICE'), apController.getInvoice);
router.post('/invoices', requirePermission('AP', 'AP_INVOICE'), apController.createInvoice);
router.put('/invoices/:id', requirePermission('AP', 'AP_INVOICE'), apController.updateInvoice);
router.delete('/invoices/:id', requirePermission('AP', 'AP_INVOICE'), apController.deleteInvoice);
router.post('/invoices/:id/post', requirePermission('AP', 'AP_INVOICE'), apController.postInvoice);
router.post('/invoices/:id/void', requirePermission('AP', 'AP_INVOICE'), apController.voidInvoice);

// AP Payments (Payment Vouchers)
router.get('/payments', requirePermission('AP', 'AP_PAYMENT'), apController.listPayments);
router.get('/payments/:id', requirePermission('AP', 'AP_PAYMENT'), apController.getPayment);
router.post('/payments', requirePermission('AP', 'AP_PAYMENT'), apController.createPayment);
router.put('/payments/:id', requirePermission('AP', 'AP_PAYMENT'), apController.updatePayment);
router.delete('/payments/:id', requirePermission('AP', 'AP_PAYMENT'), apController.deletePayment);
router.post('/payments/:id/void', requirePermission('AP', 'AP_PAYMENT'), apController.voidPayment);

// Debit Notes
router.get('/debit-notes', requirePermission('AP', 'AP_DEBIT_NOTE'), apController.listDebitNotes);
router.post('/debit-notes', requirePermission('AP', 'AP_DEBIT_NOTE'), apController.createDebitNote);

// Credit Notes  
router.get('/credit-notes', requirePermission('AP', 'AP_CREDIT_NOTE'), apController.listCreditNotes);
router.post('/credit-notes', requirePermission('AP', 'AP_CREDIT_NOTE'), apController.createCreditNote);

// Contra / Offset
router.post('/contra', requirePermission('AP', 'AP_CONTRA'), apController.createContra);

// Knockoff helpers
router.get('/outstanding/:vendorId', apController.getOutstandingDocuments);

// Aging
router.get('/aging', requirePermission('AP', 'AP_AGING'), apController.getAgingReport);
router.get('/aging/:vendorId', requirePermission('AP', 'AP_AGING'), apController.getVendorAging);

export default router;
