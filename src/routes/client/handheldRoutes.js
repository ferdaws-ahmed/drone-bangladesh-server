const express = require('express');
const router = express.Router();
const {
  getCategories,
  getProductsByCategory,
  getProductById,
  getRelatedProducts,
} = require('../../controllers/client/handheldController');

router.get('/categories', getCategories);
router.get('/category/:slug', getProductsByCategory);
router.get('/product/:id', getProductById);
router.get('/product/:id/related', getRelatedProducts);

module.exports = router;