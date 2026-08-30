// server/src/routes/admin/products.js
const express = require('express');
const router = express.Router();
const { createDroneProduct } = require('../../controllers/admin/productController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.post('/', verifyToken, verifyAdmin, createDroneProduct);

module.exports = router;