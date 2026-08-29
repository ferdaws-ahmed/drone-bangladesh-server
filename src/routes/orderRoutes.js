const express = require('express');
const router = express.Router();
const {
  createOrder, getAllOrders, getOrderById, getMyOrders, updateOrderStatus, getDashboardStats,
} = require('../controllers/orderController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/', createOrder);
router.get('/mine', verifyToken, getMyOrders);
router.get('/stats', verifyToken, verifyAdmin, getDashboardStats);
router.get('/:id', verifyToken, getOrderById);
router.get('/', verifyToken, verifyAdmin, getAllOrders);
router.patch('/:id/status', verifyToken, verifyAdmin, updateOrderStatus);

module.exports = router;
