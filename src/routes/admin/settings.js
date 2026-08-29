const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getAdminSummary } = require('../../controllers/admin/settingsController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/summary', verifyToken, verifyAdmin, getAdminSummary);
router.get('/', verifyToken, verifyAdmin, getSettings);
router.put('/', verifyToken, verifyAdmin, updateSettings);

module.exports = router;
