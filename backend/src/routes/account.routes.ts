import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const accountController = new AccountController();

router.use(authenticate);

// List & Search
router.get('/', requirePermission('GL', 'ACCOUNT'), accountController.list);
router.get('/tree', requirePermission('GL', 'ACCOUNT'), accountController.getTree);
router.get('/search', requirePermission('GL', 'ACCOUNT'), accountController.search);
router.get('/lookup', requirePermission('GL', 'ACCOUNT'), accountController.lookup);

// CRUD
router.get('/:id', requirePermission('GL', 'ACCOUNT'), accountController.getById);
router.post('/', requirePermission('GL', 'ACCOUNT'), accountController.create);
router.put('/:id', requirePermission('GL', 'ACCOUNT'), accountController.update);
router.delete('/:id', requirePermission('GL', 'ACCOUNT'), accountController.delete);

// Related
router.get('/:id/ledger', accountController.getLedger);
router.get('/:id/balance', accountController.getBalance);

// Account Types
router.get('/types/list', accountController.listTypes);

// Trial Balance
router.get('/reports/trial-balance', accountController.getTrialBalance);

export default router;
