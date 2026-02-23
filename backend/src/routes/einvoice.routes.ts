import { Router } from 'express';
import { EInvoiceController } from '../controllers/einvoice.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const einvoiceController = new EInvoiceController();

// All e-invoice routes require authentication
router.use(authenticate);

// Validate invoice against LHDN requirements
router.post('/validate/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.validateInvoice);

// Submit invoice to MyInvois
router.post('/submit/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.submitInvoice);

// Check submission status
router.get('/status/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.getInvoiceStatus);

// Cancel submitted invoice
router.post('/cancel/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.cancelInvoice);

// Get configuration status
router.get('/config', einvoiceController.getConfigStatus);

// Get pending invoices for submission
router.get('/pending', requirePermission('SALES', 'INVOICE'), einvoiceController.getPendingInvoices);

// Batch submit multiple invoices
router.post('/batch', requirePermission('SALES', 'INVOICE'), einvoiceController.batchSubmit);

export default router;
