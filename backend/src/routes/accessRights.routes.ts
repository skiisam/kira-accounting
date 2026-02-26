import { Router } from 'express';
import { accessRightsController } from '../controllers/accessRights.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// My permissions - any authenticated user
router.get('/my-permissions', accessRightsController.getMyPermissions);

// Admin-only routes below
router.use(requireAdmin);

/**
 * Access Rights Routes
 * Base path: /api/v1/access-rights
 */

// Get available modules and their actions
router.get('/modules', accessRightsController.getModules);

// User Groups CRUD
router.get('/groups', accessRightsController.listGroups);
router.get('/groups/:id', accessRightsController.getGroup);
router.post('/groups', accessRightsController.createGroup);
router.put('/groups/:id', accessRightsController.updateGroup);
router.delete('/groups/:id', accessRightsController.deleteGroup);

// Permissions for a specific group
router.put('/groups/:id/permissions', accessRightsController.updatePermissions);

export default router;
