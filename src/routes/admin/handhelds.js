const express = require('express');
const router = express.Router();
const { getHandheldsByCategory, createHandheldProduct } = require('../../controllers/admin/handheldController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/by-category', verifyToken, verifyAdmin, getHandheldsByCategory);
router.post('/', verifyToken, verifyAdmin, createHandheldProduct);

module.exports = router;
