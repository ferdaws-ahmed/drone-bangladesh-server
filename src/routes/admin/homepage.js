const express = require('express');
const router = express.Router();
const {
  getFeaturedCategories,
  toggleFeaturedCategory,
  getProductFlags,
  updateProductFlag,
  getHonorableCustomers,
  createHonorableCustomer,
  updateHonorableCustomer,
  deleteHonorableCustomer,
} = require('../../controllers/admin/homepageController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

// ── Featured Categories ──────────────────────────────────────────────────────
router.get('/featured-categories', verifyToken, verifyAdmin, getFeaturedCategories);
router.patch('/featured-categories/:id', verifyToken, verifyAdmin, toggleFeaturedCategory);

// ── Product Homepage Flags ───────────────────────────────────────────────────
router.get('/product-flags', verifyToken, verifyAdmin, getProductFlags);
router.patch('/product-flags/:id', verifyToken, verifyAdmin, updateProductFlag);

// ── Honorable Customers ──────────────────────────────────────────────────────
router.get('/honorable-customers', verifyToken, verifyAdmin, getHonorableCustomers);
router.post('/honorable-customers', verifyToken, verifyAdmin, createHonorableCustomer);
router.put('/honorable-customers/:id', verifyToken, verifyAdmin, updateHonorableCustomer);
router.delete('/honorable-customers/:id', verifyToken, verifyAdmin, deleteHonorableCustomer);

module.exports = router;
