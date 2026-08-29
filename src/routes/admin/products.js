const express = require('express');
const router = express.Router();
const {
  listAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
} = require('../../controllers/admin/productController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, verifyAdmin, listAdminProducts);
router.get('/:id', verifyToken, verifyAdmin, getAdminProductById);
router.post('/', verifyToken, verifyAdmin, createAdminProduct);
router.put('/:id', verifyToken, verifyAdmin, updateAdminProduct);
router.delete('/:id', verifyToken, verifyAdmin, deleteAdminProduct);

module.exports = router;
