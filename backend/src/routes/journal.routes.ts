import { Router } from 'express';
import { JournalController } from '../controllers/journal.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const journalController = new JournalController();

router.use(authenticate);

// Journal Entries
router.get('/', requirePermission('GL', 'JOURNAL'), journalController.list);
router.get('/:id', requirePermission('GL', 'JOURNAL'), journalController.getById);
router.post('/', requirePermission('GL', 'JOURNAL'), journalController.create);
router.put('/:id', requirePermission('GL', 'JOURNAL'), journalController.update);
router.delete('/:id', requirePermission('GL', 'JOURNAL'), journalController.delete);
router.post('/:id/post', requirePermission('GL', 'JOURNAL'), journalController.post);
router.post('/:id/void', requirePermission('GL', 'JOURNAL'), journalController.void);
router.post('/:id/reverse', requirePermission('GL', 'JOURNAL'), journalController.reverse);

// Journal Types
router.get('/types/list', journalController.listTypes);

// Recurring Entries
router.get('/recurring', requirePermission('GL', 'RECURRING_JE'), journalController.listRecurring);
router.post('/recurring', requirePermission('GL', 'RECURRING_JE'), journalController.createRecurring);
router.post('/recurring/:id/generate', requirePermission('GL', 'RECURRING_JE'), journalController.generateFromRecurring);

// Templates
router.get('/templates', journalController.listTemplates);
router.post('/templates', journalController.saveTemplate);
router.post('/templates/:id/apply', journalController.applyTemplate);

export default router;
