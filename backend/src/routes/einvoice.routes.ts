import { Router } from 'express';
import { EInvoiceController } from '../controllers/einvoice.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();
const einvoiceController = new EInvoiceController();

// All e-invoice routes require authentication
router.use(authenticate);

// Validate invoice against LHDN requirements
router.post('/validate/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.validateInvoice);

// Submit invoice to MyInvois
router.post('/submit/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.submitInvoice);

// Check submission status
router.get('/status/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.getStatus);

// Cancel submitted invoice
router.post('/cancel/:invoiceId', requirePermission('SALES', 'INVOICE'), einvoiceController.cancelInvoice);

// Get company e-invoice settings
router.get('/settings', requirePermission('SETTINGS', 'EINVOICE'), einvoiceController.getSettings);

// Update company e-invoice settings
router.put('/settings', requirePermission('SETTINGS', 'EINVOICE'), einvoiceController.updateSettings);

export default router;
