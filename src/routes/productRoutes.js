const express = require('express');
const router = express.Router();
const {
  getAllProducts, getProductById, createProduct, updateProduct, deleteProduct,
  bulkCreateProducts, bulkUpdateProducts, bulkDeleteProducts,
} = require('../controllers/productController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.get('/', getAllProducts);
router.get('/:id', getProductById);

router.post('/', verifyToken, verifyAdmin, createProduct);
router.post('/bulk', verifyToken, verifyAdmin, bulkCreateProducts);
router.put('/bulk', verifyToken, verifyAdmin, bulkUpdateProducts);
router.delete('/bulk', verifyToken, verifyAdmin, bulkDeleteProducts);
router.put('/:id', verifyToken, verifyAdmin, updateProduct);
router.delete('/:id', verifyToken, verifyAdmin, deleteProduct);

module.exports = router;
