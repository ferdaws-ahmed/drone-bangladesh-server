// server/src/routes/admin/products.js
const express = require('express');
const router = express.Router();
const {
	createDroneProduct,
	listAdminProducts,
	getAdminProduct,
	updateAdminProduct,
	deleteAdminProduct,
} = require('../../controllers/admin/productController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, verifyAdmin, listAdminProducts);
router.get('/:id', verifyToken, verifyAdmin, getAdminProduct);
router.post('/', verifyToken, verifyAdmin, createDroneProduct);
router.put('/:id', verifyToken, verifyAdmin, updateAdminProduct);
router.delete('/:id', verifyToken, verifyAdmin, deleteAdminProduct);

module.exports = router;