const express = require('express');
const router = express.Router();
const { getCategories, createCategory, deleteCategory } = require('../../controllers/admin/categoryController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

// Test endpoint without auth
router.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ success: true, message: 'Categories route is working' });
});

router.get('/', verifyToken, verifyAdmin, getCategories);
router.post('/', verifyToken, verifyAdmin, createCategory);
router.delete('/:id', verifyToken, verifyAdmin, deleteCategory);

module.exports = router;