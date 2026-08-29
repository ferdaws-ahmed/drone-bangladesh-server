const express = require('express');
const router = express.Router();
// 🟢 updateMe যোগ করা হয়েছে
const { registerUser, loginUser, getCustomers, getMe, updateMe } = require('../controllers/authController'); 
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);
router.get('/customers', verifyToken, verifyAdmin, getCustomers);

module.exports = router;