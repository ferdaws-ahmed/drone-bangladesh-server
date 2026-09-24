const express = require('express');
const router = express.Router();
const {
  getCategories: getDroneCategories,
  getProductsByCategory: getProductsBySubCategory,
  getProductById: getSingleProductDetails,
  getRelatedProducts,
} = require('../../controllers/client/droneController');

// ১. মেগা মেনুর জন্য ক্যাটাগরি ফেচ করার রুট
router.get('/categories', getDroneCategories);

// ২. মেগা মেনু কার্ডে ক্লিক করলে নির্দিষ্ট ক্যাটাগরির প্রোডাক্ট দেখানোর রুট
router.get('/category/:slug', getProductsBySubCategory);

// ৩. প্রোডাক্ট কার্ডে ক্লিক করলে সিঙ্গেল প্রোডাক্টের ডিটেইলস পেজ দেখানোর রুট
router.get('/product/:id', getSingleProductDetails);
router.get('/product/:id/related', getRelatedProducts);

module.exports = router;