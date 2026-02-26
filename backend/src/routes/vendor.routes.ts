import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const vendorController = new VendorController();

router.use(authenticate);

// List & Search
router.get('/', requirePermission('AP', 'VENDOR'), vendorController.list);
router.get('/search', requirePermission('AP', 'VENDOR'), vendorController.search);
router.get('/lookup', requirePermission('AP', 'VENDOR'), vendorController.lookup);
router.get('/next-code', requirePermission('AP', 'VENDOR'), vendorController.nextCode);

// CRUD
router.get('/:id', requirePermission('AP', 'VENDOR'), vendorController.getById);
router.post('/', requirePermission('AP', 'VENDOR'), vendorController.create);
router.put('/:id', requirePermission('AP', 'VENDOR'), vendorController.update);
router.delete('/:id', requirePermission('AP', 'VENDOR'), vendorController.delete);

// Related
router.get('/:id/transactions', vendorController.getTransactions);
router.get('/:id/aging', vendorController.getAging);
router.get('/:id/statement', vendorController.getStatement);

export default router;
