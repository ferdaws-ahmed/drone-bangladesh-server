const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getCustomers, getMe } = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', verifyToken, getMe);
router.get('/customers', verifyToken, verifyAdmin, getCustomers);

module.exports = router;