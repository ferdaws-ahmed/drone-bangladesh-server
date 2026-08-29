const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../../controllers/admin/dashboardController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/stats', verifyToken, verifyAdmin, getDashboardStats);

module.exports = router;
