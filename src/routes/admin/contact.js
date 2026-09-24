const express = require('express');
const router = express.Router();
const {
  getContactSubmissions,
  updateSubmissionStatus,
  getSubmissionStats,
} = require('../../controllers/contactController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, verifyAdmin, getContactSubmissions);
router.get('/stats', verifyToken, verifyAdmin, getSubmissionStats);
router.put('/:id/status', verifyToken, verifyAdmin, updateSubmissionStatus);

module.exports = router;
