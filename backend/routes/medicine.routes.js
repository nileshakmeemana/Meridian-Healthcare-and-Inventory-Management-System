// routes/medicine.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/medicine.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',           ctrl.getAllMedicines);
router.get('/low-stock',  ctrl.getLowStockMedicines);
router.get('/categories', ctrl.getCategories);
router.get('/:id',        ctrl.getMedicineById);
router.get('/:id/stock-history', ctrl.getStockHistory);

router.post('/',               authorize('admin','pharmacist'), ctrl.createMedicine);
router.put('/:id',             authorize('admin','pharmacist'), ctrl.updateMedicine);
router.patch('/:id/stock',     authorize('admin','pharmacist'), ctrl.updateStock);

module.exports = router;
