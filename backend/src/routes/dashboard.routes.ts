import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new DashboardController();

router.use(authenticate);

router.get('/stats', controller.getStats);
router.get('/recent', controller.getRecent);
router.get('/top-products', controller.getTopProducts);
router.get('/alerts', controller.getAlerts);

export default router;

