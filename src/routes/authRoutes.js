const express = require('express');
const router = express.Router();
const {
  registerUser, loginUser, getCustomers, getMe, updateMe,
  deleteCustomer, toggleFreezeCustomer,
} = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/register',              registerUser);
router.post('/login',                 loginUser);
router.get('/me',                     verifyToken, getMe);
router.put('/me',                     verifyToken, updateMe);
router.get('/customers',              verifyToken, verifyAdmin, getCustomers);
router.delete('/customers/:id',       verifyToken, verifyAdmin, deleteCustomer);
router.patch('/customers/:id/freeze', verifyToken, verifyAdmin, toggleFreezeCustomer);

module.exports = router;
