const express = require('express');
const router = express.Router();
const {
  createMaintenance, getAllMaintenance, getMaintenanceById, updateMaintenance, deleteMaintenance,
} = require('../controllers/maintenanceController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

router.post('/', createMaintenance);
router.get('/', verifyToken, verifyAdmin, getAllMaintenance);
router.get('/:id', verifyToken, getMaintenanceById);
router.put('/:id', verifyToken, verifyAdmin, updateMaintenance);
router.delete('/:id', verifyToken, verifyAdmin, deleteMaintenance);

module.exports = router;
