const express = require('express');
const router = express.Router();
const {
  listCoupons,
  createCoupon,
  deleteCoupon,
} = require('../../controllers/couponController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.use(verifyToken, verifyAdmin);
router.get('/', listCoupons);
router.post('/', createCoupon);
router.delete('/:id', deleteCoupon);

module.exports = router;
