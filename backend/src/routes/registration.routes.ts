import { Router } from 'express';
import { RegistrationController } from '../controllers/registration.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const registrationController = new RegistrationController();

// Public routes
router.post('/register', registrationController.register);

// Protected routes (require auth after registration)
router.get('/setup/status', authenticate, registrationController.getSetupStatus);
router.post('/setup/company-info', authenticate, registrationController.setupCompanyInfo);
router.post('/setup/fiscal-year', authenticate, registrationController.setupFiscalYear);
router.post('/setup/currency', authenticate, registrationController.setupCurrency);
router.post('/setup/chart-of-accounts', authenticate, registrationController.setupChartOfAccounts);
router.post('/setup/complete', authenticate, registrationController.completeSetup);

export default router;
