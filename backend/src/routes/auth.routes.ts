import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);
router.post('/lookup-username', authController.lookupUsername);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);
router.post('/delete-account', authenticate, authController.deleteAccount);
// MFA management
router.post('/mfa/setup', authenticate, authController.mfaSetup);
router.post('/mfa/enable', authenticate, authController.mfaEnable);
router.post('/mfa/disable', authenticate, authController.mfaDisable);
router.get('/mfa/qrcode', authenticate, authController.mfaQrCode);

export default router;
