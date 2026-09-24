const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addToCart, 
  removeFromCart, 
  updateCartQuantity,
  getWishlist, 
  toggleWishlist,
  removeFromWishlist
} = require('../controllers/cartWishlistController');

const { verifyToken } = require('../middleware/authMiddleware');

// ❌ গ্লোবাল router.use(verifyToken); এখানে আর রাখা যাবে না, কারণ এটি অন্য পাবলিক রুটগুলোকে ব্লক করে দেয়।

// Cart Routes (এখানে আলাদাভাবে verifyToken যুক্ত করা হলো)
router.get('/cart', verifyToken, getCart);
router.post('/cart', verifyToken, addToCart);
router.delete('/cart/:productId', verifyToken, removeFromCart);
router.patch('/cart/:productId', verifyToken, updateCartQuantity);

// Wishlist Routes (এখানেও আলাদাভাবে verifyToken যুক্ত করা হলো)
router.get('/wishlist', verifyToken, getWishlist);
router.post('/wishlist', verifyToken, toggleWishlist);
router.delete('/wishlist/:productId', verifyToken, removeFromWishlist);

module.exports = router;