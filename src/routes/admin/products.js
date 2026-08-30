import express from 'express';
import { createDroneProduct } from '../../controllers/admin/productController.js';
import { verifyToken, verifyAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Base Path: /api/v1/admin/products
router.post('/', verifyToken, verifyAdmin, createDroneProduct);

export default router;