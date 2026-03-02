import { Router } from 'express';
import multer from 'multer';
import { BankingController } from '../controllers/banking.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { config } from '../config/config';
import fs from 'fs';
import path from 'path';

const router = Router();
const controller = new BankingController();

router.use(authenticate);

// Ensure upload dir exists
const uploadDir = path.join(config.upload.dir, 'bank');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// Connections
router.get('/connections', requirePermission('SETTINGS', 'VIEW'), controller.listConnections);
router.post('/connect', requirePermission('SETTINGS', 'UPDATE'), controller.connect);
router.delete('/connections/:bankId', requirePermission('SETTINGS', 'UPDATE'), controller.disconnect);
router.post('/connections/:bankId/accounts', requirePermission('SETTINGS', 'UPDATE'), controller.getAccounts);

// Linking
router.put('/accounts/:id/link', requirePermission('SETTINGS', 'UPDATE'), controller.linkAccount);
router.delete('/accounts/:id/link', requirePermission('SETTINGS', 'UPDATE'), controller.unlinkAccount);

// Import statements
router.post('/import', requirePermission('SETTINGS', 'UPDATE'), upload.single('file'), controller.importStatement);

// Reconciliation basics
router.get('/statements', requirePermission('GL', 'ACCOUNT'), controller.listStatements);
router.get('/book-entries', requirePermission('GL', 'ACCOUNT'), controller.listBookEntries);
router.post('/reconciliation/match', requirePermission('GL', 'ACCOUNT'), controller.match);
router.post('/statements/:id/exclude', requirePermission('GL', 'ACCOUNT'), controller.exclude);
router.post('/reconciliation/auto-match', requirePermission('GL', 'ACCOUNT'), controller.autoMatch);
router.post('/reconciliation/complete', requirePermission('GL', 'ACCOUNT'), controller.completeReconciliation);

export default router;
