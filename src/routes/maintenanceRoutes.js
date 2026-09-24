const express = require('express');
const router = express.Router();
const {
  createMaintenance, getAllMaintenance, getMaintenanceById, updateMaintenance, deleteMaintenance,
} = require('../controllers/maintenanceController');
const { submitServiceRequest }          = require('../controllers/serviceRequestController');
const { getPageContent }               = require('./admin/maintenancePageHelpers');
const { listPackages }                 = require('../controllers/admin/packagesController');
const { verifyToken, verifyAdmin }      = require('../middleware/authMiddleware');

// ── Public: page content for the frontend ────────────────────────────────────
router.get('/page-content', getPageContent);

// ── Public: active maintenance packages list ─────────────────────────────────
router.get('/packages', async (req, res) => {
  // Force isActive filter for public consumers
  req.query.isActive = 'true';
  return listPackages(req, res);
});

// ── Public: customer service booking submission ───────────────────────────────
router.post('/service-requests', submitServiceRequest);

// ── Internal job tickets (admin) ──────────────────────────────────────────────
router.post('/', createMaintenance);
router.get('/', verifyToken, verifyAdmin, getAllMaintenance);
router.get('/:id', verifyToken, getMaintenanceById);
router.put('/:id', verifyToken, verifyAdmin, updateMaintenance);
router.delete('/:id', verifyToken, verifyAdmin, deleteMaintenance);

module.exports = router;
