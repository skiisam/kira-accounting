import { Router } from 'express';
import { KnockOffController } from '../controllers/knockoff.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new KnockOffController();

router.use(authenticate);

router.get('/', controller.list);
router.get('/outstanding', controller.getOutstanding);
router.post('/', controller.create);
router.put('/:id/void', controller.voidEntry);

export default router;
