import { Router } from 'express';
import { StockController } from '../controllers/stock.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const stockController = new StockController();

router.use(authenticate);

// Stock Receive
router.get('/receive', requirePermission('STOCK', 'STOCK_RECEIVE'), stockController.listReceive);
router.get('/receive/:id', requirePermission('STOCK', 'STOCK_RECEIVE'), stockController.getReceive);
router.post('/receive', requirePermission('STOCK', 'STOCK_RECEIVE'), stockController.createReceive);
router.put('/receive/:id', requirePermission('STOCK', 'STOCK_RECEIVE'), stockController.updateReceive);
router.delete('/receive/:id', requirePermission('STOCK', 'STOCK_RECEIVE'), stockController.deleteReceive);

// Stock Issue
router.get('/issue', requirePermission('STOCK', 'STOCK_ISSUE'), stockController.listIssue);
router.get('/issue/:id', requirePermission('STOCK', 'STOCK_ISSUE'), stockController.getIssue);
router.post('/issue', requirePermission('STOCK', 'STOCK_ISSUE'), stockController.createIssue);
router.put('/issue/:id', requirePermission('STOCK', 'STOCK_ISSUE'), stockController.updateIssue);
router.delete('/issue/:id', requirePermission('STOCK', 'STOCK_ISSUE'), stockController.deleteIssue);

// Stock Transfer
router.get('/transfer', requirePermission('STOCK', 'STOCK_TRANSFER'), stockController.listTransfer);
router.get('/transfer/:id', requirePermission('STOCK', 'STOCK_TRANSFER'), stockController.getTransfer);
router.post('/transfer', requirePermission('STOCK', 'STOCK_TRANSFER'), stockController.createTransfer);
router.put('/transfer/:id', requirePermission('STOCK', 'STOCK_TRANSFER'), stockController.updateTransfer);
router.delete('/transfer/:id', requirePermission('STOCK', 'STOCK_TRANSFER'), stockController.deleteTransfer);

// Stock Adjustment
router.get('/adjustment', requirePermission('STOCK', 'STOCK_ADJUSTMENT'), stockController.listAdjustment);
router.get('/adjustment/:id', requirePermission('STOCK', 'STOCK_ADJUSTMENT'), stockController.getAdjustment);
router.post('/adjustment', requirePermission('STOCK', 'STOCK_ADJUSTMENT'), stockController.createAdjustment);
router.put('/adjustment/:id', requirePermission('STOCK', 'STOCK_ADJUSTMENT'), stockController.updateAdjustment);
router.delete('/adjustment/:id', requirePermission('STOCK', 'STOCK_ADJUSTMENT'), stockController.deleteAdjustment);

// Stock Take
router.get('/take', requirePermission('STOCK', 'STOCK_TAKE'), stockController.listStockTake);
router.post('/take', requirePermission('STOCK', 'STOCK_TAKE'), stockController.createStockTake);
router.post('/take/:id/finalize', requirePermission('STOCK', 'STOCK_TAKE'), stockController.finalizeStockTake);

// Assembly / Disassembly
router.get('/assembly', requirePermission('STOCK', 'ASSEMBLY'), stockController.listAssembly);
router.post('/assembly', requirePermission('STOCK', 'ASSEMBLY'), stockController.createAssembly);
router.post('/disassembly', requirePermission('STOCK', 'DISASSEMBLY'), stockController.createDisassembly);

// Stock Queries
router.get('/balance', stockController.getStockBalance);
router.get('/balance/:productId', stockController.getProductBalance);
router.get('/movements', stockController.getStockMovements);
router.get('/card/:productId', stockController.getStockCard);

// Locations
router.get('/locations', stockController.listLocations);
router.get('/locations/:id/balance', stockController.getLocationBalance);

export default router;
