import { Router } from 'express';
import { reportTemplateController } from '../controllers/reportTemplate.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get report types and categories (no permission needed, just auth)
router.get('/types', reportTemplateController.getTypes);

// Get available fields for a report type
router.get('/fields/:type', reportTemplateController.getFields);

// List templates (with filters)
router.get('/', reportTemplateController.list);

// Get single template
router.get('/:id', reportTemplateController.getById);

// Create new template
router.post('/', requirePermission('SYSTEM', 'REPORT_TEMPLATES'), reportTemplateController.create);

// Update template
router.put('/:id', requirePermission('SYSTEM', 'REPORT_TEMPLATES'), reportTemplateController.update);

// Delete template
router.delete('/:id', requirePermission('SYSTEM', 'REPORT_TEMPLATES'), reportTemplateController.delete);

// Clone template
router.post('/:id/clone', requirePermission('SYSTEM', 'REPORT_TEMPLATES'), reportTemplateController.clone);

// Generate preview
router.post('/:id/preview', requirePermission('SYSTEM', 'REPORT_TEMPLATES'), reportTemplateController.preview);

// Seed system templates for the current company
router.post('/seed-system', requirePermission('SYSTEM', 'REPORT_TEMPLATES'), reportTemplateController.seedSystemTemplates);

export default router;
