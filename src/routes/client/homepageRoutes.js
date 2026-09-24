const express = require('express');
const router = express.Router();
const {
  getFeaturedCategories,
  getHomepageProducts,
  getHonorableCustomers,
} = require('../../controllers/client/homepageController');

// ── Public homepage data endpoints ───────────────────────────────────────────
router.get('/featured-categories', getFeaturedCategories);
router.get('/products', getHomepageProducts);          // ?flag=isNewArrival&limit=8
router.get('/honorable-customers', getHonorableCustomers);

module.exports = router;
