import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const customerController = new CustomerController();

// All routes require authentication
router.use(authenticate);

// List & Search
router.get('/', requirePermission('AR', 'CUSTOMER'), customerController.list);
router.get('/search', requirePermission('AR', 'CUSTOMER'), customerController.search);
router.get('/lookup', requirePermission('AR', 'CUSTOMER'), customerController.lookup);

// CRUD
router.get('/:id', requirePermission('AR', 'CUSTOMER'), customerController.getById);
router.post('/', requirePermission('AR', 'CUSTOMER'), customerController.create);
router.put('/:id', requirePermission('AR', 'CUSTOMER'), customerController.update);
router.delete('/:id', requirePermission('AR', 'CUSTOMER'), customerController.delete);

// Related
router.get('/:id/branches', customerController.getBranches);
router.get('/:id/transactions', customerController.getTransactions);
router.get('/:id/aging', customerController.getAging);
router.get('/:id/statement', customerController.getStatement);

export default router;
