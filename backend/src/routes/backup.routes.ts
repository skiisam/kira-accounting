import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticate } from '../middleware/authenticate';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();
const backupController = new BackupController();

// All backup routes require authentication and admin permissions
router.use(authenticate);

// Export data as JSON backup
router.get('/export', requirePermission('SETTINGS', 'BACKUP'), backupController.exportData);

// Import data from backup file
router.post('/import', requirePermission('SETTINGS', 'BACKUP'), backupController.importData);

// Get backup history
router.get('/history', requirePermission('SETTINGS', 'BACKUP'), backupController.getBackupHistory);

export default router;
