const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../../controllers/admin/categoryController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, verifyAdmin, getCategories);
router.post('/', verifyToken, verifyAdmin, createCategory);

module.exports = router;