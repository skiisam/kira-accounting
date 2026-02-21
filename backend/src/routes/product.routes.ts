import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const productController = new ProductController();

router.use(authenticate);

// List & Search
router.get('/', requirePermission('STOCK', 'PRODUCT'), productController.list);
router.get('/search', requirePermission('STOCK', 'PRODUCT'), productController.search);
router.get('/lookup', requirePermission('STOCK', 'PRODUCT'), productController.lookup);
router.get('/barcode/:barcode', requirePermission('STOCK', 'PRODUCT'), productController.getByBarcode);

// CRUD
router.get('/:id', requirePermission('STOCK', 'PRODUCT'), productController.getById);
router.post('/', requirePermission('STOCK', 'PRODUCT'), productController.create);
router.put('/:id', requirePermission('STOCK', 'PRODUCT'), productController.update);
router.delete('/:id', requirePermission('STOCK', 'PRODUCT'), productController.delete);

// Related
router.get('/:id/stock', productController.getStockBalance);
router.get('/:id/movements', productController.getStockMovements);
router.get('/:id/pricing', productController.getPricing);
router.put('/:id/pricing', productController.updatePricing);
router.get('/:id/bom', productController.getBOM);

// Groups & Types
router.get('/groups/list', productController.listGroups);
router.get('/types/list', productController.listTypes);

export default router;
