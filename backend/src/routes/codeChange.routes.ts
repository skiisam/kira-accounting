import { Router } from 'express';
import { CodeChangeController } from '../controllers/codeChange.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const codeChangeController = new CodeChangeController();

// All code change operations require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

// Change customer code
router.post('/customer', codeChangeController.changeCustomerCode);

// Change vendor code
router.post('/vendor', codeChangeController.changeVendorCode);

// Change product code
router.post('/product', codeChangeController.changeProductCode);

// Change account code
router.post('/account', codeChangeController.changeAccountCode);

export default router;
