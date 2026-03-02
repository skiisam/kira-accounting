import { Router } from 'express';
import { FilesController, upload } from '../controllers/files.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const controller = new FilesController();

router.use(authenticate);

// Sales -> Customer PO attachments
router.get('/sales/:id/po', requirePermission('SALES', 'SALES_ORDER'), controller.listSalesPOAttachments);
router.post('/sales/:id/po', requirePermission('SALES', 'SALES_ORDER'), upload.single('file'), controller.uploadSalesPOAttachment);
router.delete('/sales/:id/po/:file', requirePermission('SALES', 'SALES_ORDER'), controller.deleteSalesPOAttachment);

// Print templates (HTML)
router.get('/templates/:domain', requirePermission('SETTINGS', 'VIEW'), controller.listTemplates);
router.post('/templates/:domain/:type', requirePermission('SETTINGS', 'UPDATE'), controller.uploadTemplate);

export default router;
