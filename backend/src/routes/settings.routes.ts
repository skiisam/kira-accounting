import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate, requireAdmin, requirePermission } from '../middleware/auth';

const router = Router();
const settingsController = new SettingsController();

router.use(authenticate);

// My Permissions (for current user)
router.get('/my-permissions', settingsController.getMyPermissions);

// Company
router.get('/company', settingsController.getCompany);
router.put('/company', requireAdmin, settingsController.updateCompany);

// Users
router.get('/users', requireAdmin, settingsController.listUsers);
router.get('/users/:id', requireAdmin, settingsController.getUser);
router.post('/users', requireAdmin, settingsController.createUser);
router.post('/users/:id/change-password', requireAdmin, settingsController.changeUserPassword);
router.put('/users/:id', requireAdmin, settingsController.updateUser);
router.delete('/users/:id', requireAdmin, settingsController.deleteUser);

// User Groups
router.get('/user-groups', requireAdmin, settingsController.listUserGroups);
router.get('/user-groups/:id', requireAdmin, settingsController.getUserGroup);
router.post('/user-groups', requireAdmin, settingsController.createUserGroup);
router.put('/user-groups/:id', requireAdmin, settingsController.updateUserGroup);
router.delete('/user-groups/:id', requireAdmin, settingsController.deleteUserGroup);

// Access Rights
router.get('/access-rights/:groupId', requireAdmin, settingsController.getAccessRights);
router.put('/access-rights/:groupId', requireAdmin, settingsController.updateAccessRights);

// Currencies
router.get('/currencies', settingsController.listCurrencies);
router.post('/currencies', requireAdmin, settingsController.createCurrency);
router.put('/currencies/:code', requireAdmin, settingsController.updateCurrency);
router.delete('/currencies/:code', requireAdmin, settingsController.deleteCurrency);
router.put('/currencies/:code/rate', settingsController.updateExchangeRate);

// Tax Codes
router.get('/tax-codes', settingsController.listTaxCodes);
router.post('/tax-codes', requireAdmin, settingsController.createTaxCode);
router.put('/tax-codes/:code', requireAdmin, settingsController.updateTaxCode);
router.delete('/tax-codes/:code', requireAdmin, settingsController.deleteTaxCode);

// UOM (support both /uom and /uoms)
router.get('/uom', settingsController.listUOM);
router.get('/uoms', settingsController.listUOM);
router.post('/uom', requireAdmin, settingsController.createUOM);
router.post('/uoms', requireAdmin, settingsController.createUOM);
router.put('/uom/:id', requireAdmin, settingsController.updateUOM);
router.put('/uoms/:id', requireAdmin, settingsController.updateUOM);
router.delete('/uom/:id', requireAdmin, settingsController.deleteUOM);
router.delete('/uoms/:id', requireAdmin, settingsController.deleteUOM);

// Locations
router.get('/locations', settingsController.listLocations);
router.post('/locations', requireAdmin, settingsController.createLocation);
router.put('/locations/:id', requireAdmin, settingsController.updateLocation);
router.delete('/locations/:id', requireAdmin, settingsController.deleteLocation);

// Areas
router.get('/areas', settingsController.listAreas);
router.post('/areas', requireAdmin, settingsController.createArea);
router.put('/areas/:id', requireAdmin, settingsController.updateArea);
router.delete('/areas/:id', requireAdmin, settingsController.deleteArea);

// Sales Agents
router.get('/sales-agents', settingsController.listSalesAgents);
router.post('/sales-agents', requireAdmin, settingsController.createSalesAgent);
router.put('/sales-agents/:id', requireAdmin, settingsController.updateSalesAgent);
router.delete('/sales-agents/:id', requireAdmin, settingsController.deleteSalesAgent);

// Purchase Agents
router.get('/purchase-agents', settingsController.listPurchaseAgents);
router.post('/purchase-agents', requireAdmin, settingsController.createPurchaseAgent);
router.put('/purchase-agents/:id', requireAdmin, settingsController.updatePurchaseAgent);
router.delete('/purchase-agents/:id', requireAdmin, settingsController.deletePurchaseAgent);

// Product Groups
router.get('/product-groups', settingsController.listProductGroups);
router.post('/product-groups', requireAdmin, settingsController.createProductGroup);
router.put('/product-groups/:id', requireAdmin, settingsController.updateProductGroup);
router.delete('/product-groups/:id', requireAdmin, settingsController.deleteProductGroup);

// Product Types
router.get('/product-types', settingsController.listProductTypes);
router.post('/product-types', requireAdmin, settingsController.createProductType);
router.put('/product-types/:id', requireAdmin, settingsController.updateProductType);
router.delete('/product-types/:id', requireAdmin, settingsController.deleteProductType);

// Payment Methods
router.get('/payment-methods', settingsController.listPaymentMethods);
router.post('/payment-methods', requireAdmin, settingsController.createPaymentMethod);
router.put('/payment-methods/:id', requireAdmin, settingsController.updatePaymentMethod);
router.delete('/payment-methods/:id', requireAdmin, settingsController.deletePaymentMethod);

// Document Series
router.get('/document-series', settingsController.listDocumentSeries);
router.post('/document-series', requireAdmin, settingsController.createDocumentSeries);
router.put('/document-series/:id', requireAdmin, settingsController.updateDocumentSeries);

// Fiscal Years
router.get('/fiscal-years', settingsController.listFiscalYears);
router.post('/fiscal-years', requireAdmin, settingsController.createFiscalYear);
router.put('/fiscal-years/:id', requireAdmin, settingsController.updateFiscalYear);
router.post('/fiscal-years/:id/close', requireAdmin, settingsController.closeFiscalYear);
router.post('/fiscal-years/:id/lock', requireAdmin, settingsController.lockFiscalYear);
router.get('/fiscal-year/check-lock', settingsController.checkFiscalYearLock);

// Projects
router.get('/projects', settingsController.listProjects);
router.post('/projects', settingsController.createProject);
router.put('/projects/:id', settingsController.updateProject);
router.delete('/projects/:id', settingsController.deleteProject);

// Departments
router.get('/departments', settingsController.listDepartments);
router.post('/departments', requireAdmin, settingsController.createDepartment);
router.put('/departments/:id', requireAdmin, settingsController.updateDepartment);
router.delete('/departments/:id', requireAdmin, settingsController.deleteDepartment);

// Audit Trail
router.get('/audit-trail', requireAdmin, settingsController.getAuditTrail);

// System
router.post('/backup', requireAdmin, settingsController.createBackup);
router.post('/restore', requireAdmin, settingsController.restoreBackup);

export default router;
