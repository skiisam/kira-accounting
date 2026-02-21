import { Router } from 'express';
import { ARController } from '../controllers/ar.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const arController = new ARController();

router.use(authenticate);

// AR Invoices
router.get('/invoices', requirePermission('AR', 'AR_INVOICE'), arController.listInvoices);
router.get('/invoices/:id', requirePermission('AR', 'AR_INVOICE'), arController.getInvoice);
router.post('/invoices', requirePermission('AR', 'AR_INVOICE'), arController.createInvoice);
router.put('/invoices/:id', requirePermission('AR', 'AR_INVOICE'), arController.updateInvoice);
router.delete('/invoices/:id', requirePermission('AR', 'AR_INVOICE'), arController.deleteInvoice);
router.post('/invoices/:id/post', requirePermission('AR', 'AR_INVOICE'), arController.postInvoice);
router.post('/invoices/:id/void', requirePermission('AR', 'AR_INVOICE'), arController.voidInvoice);

// AR Payments (Official Receipts)
router.get('/payments', requirePermission('AR', 'AR_PAYMENT'), arController.listPayments);
router.get('/payments/:id', requirePermission('AR', 'AR_PAYMENT'), arController.getPayment);
router.post('/payments', requirePermission('AR', 'AR_PAYMENT'), arController.createPayment);
router.put('/payments/:id', requirePermission('AR', 'AR_PAYMENT'), arController.updatePayment);
router.delete('/payments/:id', requirePermission('AR', 'AR_PAYMENT'), arController.deletePayment);
router.post('/payments/:id/void', requirePermission('AR', 'AR_PAYMENT'), arController.voidPayment);

// Credit Notes
router.get('/credit-notes', requirePermission('AR', 'AR_CREDIT_NOTE'), arController.listCreditNotes);
router.get('/credit-notes/:id', requirePermission('AR', 'AR_CREDIT_NOTE'), arController.getCreditNote);
router.post('/credit-notes', requirePermission('AR', 'AR_CREDIT_NOTE'), arController.createCreditNote);

// Debit Notes
router.get('/debit-notes', requirePermission('AR', 'AR_DEBIT_NOTE'), arController.listDebitNotes);
router.post('/debit-notes', requirePermission('AR', 'AR_DEBIT_NOTE'), arController.createDebitNote);

// Contra / Offset
router.post('/contra', requirePermission('AR', 'AR_CONTRA'), arController.createContra);

// Knockoff helpers
router.get('/outstanding/:customerId', arController.getOutstandingDocuments);

// Aging
router.get('/aging', requirePermission('AR', 'AR_AGING'), arController.getAgingReport);
router.get('/aging/:customerId', requirePermission('AR', 'AR_AGING'), arController.getCustomerAging);

export default router;
