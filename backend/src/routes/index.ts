import { Router } from 'express';
import authRoutes from './auth.routes';
import registrationRoutes from './registration.routes';
import customerRoutes from './customer.routes';
import vendorRoutes from './vendor.routes';
import productRoutes from './product.routes';
import accountRoutes from './account.routes';
import salesRoutes from './sales.routes';
import purchaseRoutes from './purchase.routes';
import arRoutes from './ar.routes';
import apRoutes from './ap.routes';
import stockRoutes from './stock.routes';
import journalRoutes from './journal.routes';
import reportRoutes from './report.routes';
import settingsRoutes from './settings.routes';
import codeChangeRoutes from './codeChange.routes';
import messagingRoutes from './messaging.routes';
import backupRoutes from './backup.routes';
// import crmRoutes from './crm.routes'; // TODO: Fix CRM models

const router = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/auth', registrationRoutes);

// Protected routes (authentication required)
router.use('/customers', customerRoutes);
router.use('/vendors', vendorRoutes);
router.use('/products', productRoutes);
router.use('/accounts', accountRoutes);
router.use('/sales', salesRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/ar', arRoutes);
router.use('/ap', apRoutes);
router.use('/stock', stockRoutes);
router.use('/journals', journalRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/settings/change-code', codeChangeRoutes);
router.use('/messaging', messagingRoutes);
router.use('/backup', backupRoutes);
// router.use('/crm', crmRoutes); // TODO: Fix CRM models

export default router;
