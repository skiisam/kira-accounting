import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Subscription Routes
 * Base path: /api/v1/subscription
 */

// Public routes
router.get('/plans', subscriptionController.listPlans);

// Authenticated routes
router.use(authenticate);
router.get('/current', subscriptionController.getCurrentSubscription);
router.get('/features', subscriptionController.getFeatures);
router.get('/check-feature/:feature', subscriptionController.checkFeature);
router.post('/upgrade', subscriptionController.upgradePlan);

// Admin only routes
router.use(requireAdmin);
router.post('/plans', subscriptionController.upsertPlan);
router.post('/seed-plans', subscriptionController.seedPlans);
router.post('/extend-trial', subscriptionController.extendTrial);

export default router;
