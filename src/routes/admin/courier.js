const express = require('express');
const router = express.Router();
const { sendToCourier } = require('../../controllers/courierController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.post('/orders/:id/send', verifyToken, verifyAdmin, sendToCourier);

module.exports = router;