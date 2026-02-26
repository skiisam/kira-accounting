import { Router } from 'express';
import { FilesController, upload } from '../controllers/files.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new FilesController();

router.use(authenticate);

// Sales -> Customer PO attachments
router.get('/sales/:id/po', controller.listSalesPOAttachments);
router.post('/sales/:id/po', upload.single('file'), controller.uploadSalesPOAttachment);
router.delete('/sales/:id/po/:file', controller.deleteSalesPOAttachment);

// Print templates (HTML)
router.get('/templates/:domain', controller.listTemplates);
router.post('/templates/:domain/:type', controller.uploadTemplate);

export default router;
