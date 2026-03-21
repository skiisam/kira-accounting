import { Router } from 'express';
import { TwoFAController } from '../controllers/twofa.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new TwoFAController();

router.use(authenticate);

router.get('/status', controller.status);
router.post('/setup', controller.setup);
router.post('/verify', controller.verify);
router.post('/disable', controller.disable);

export default router;
