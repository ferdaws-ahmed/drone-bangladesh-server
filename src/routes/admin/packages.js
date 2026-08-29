const express = require('express');
const router = express.Router();
const {
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
} = require('../../controllers/admin/packagesController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/', verifyToken, verifyAdmin, listPackages);
router.post('/', verifyToken, verifyAdmin, createPackage);
router.put('/:id', verifyToken, verifyAdmin, updatePackage);
router.delete('/:id', verifyToken, verifyAdmin, deletePackage);

module.exports = router;
