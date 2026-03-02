import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const auditController = new AuditController();

router.use(authenticate);

router.get('/', auditController.getAuditTrail);

export default router;
