// server/src/routes/admin/categories.js
import express from 'express';
import { getCategories, createCategory } from '../../controllers/admin/categoryController.js';
import { verifyToken, verifyAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Base Path: /api/v1/admin/categories
router.get('/', verifyToken, verifyAdmin, getCategories);
router.post('/', verifyToken, verifyAdmin, createCategory);

export default router;