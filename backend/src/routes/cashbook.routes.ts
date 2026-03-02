import { Router } from 'express';
import { CashBookController } from '../controllers/cashbook.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new CashBookController();

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
