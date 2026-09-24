const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { ok, created, fail, notFound, serverError } = require('../utils/response');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const getCouponError = (coupon, subtotal) => {
  if (!coupon) return 'Invalid coupon code.';
  if (coupon.isActive === false) return 'This coupon is inactive.';
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 'This coupon has expired.';
  if (Number(subtotal) < Number(coupon.minOrderAmount || 0)) {
    return `Minimum order amount is ${Number(coupon.minOrderAmount || 0).toLocaleString()} BDT.`;
  }
  return null;
};

const calculateDiscount = (coupon) => Math.min(
  Number(coupon.discountAmount) || 0,
  Number(coupon.maxDiscountAmount) || Number(coupon.discountAmount) || 0
);

const findValidCoupon = async (code, subtotal) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return { coupon: null, error: 'Coupon code is required.' };

  const db = await getDB();
  const coupon = await db.collection('coupons').findOne({ code: normalizedCode });
  const error = getCouponError(coupon, subtotal);
  return { coupon, error };
};

const validateCoupon = async (req, res) => {
  try {
    const { coupon, error } = await findValidCoupon(req.body.code, req.body.subtotal);
    if (error) return fail(res, error, 400);

    return ok(res, {
      code: coupon.code,
      discountAmount: calculateDiscount(coupon),
      minOrderAmount: Number(coupon.minOrderAmount) || 0,
    }, 'Coupon applied successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const listCoupons = async (req, res) => {
  try {
    const db = await getDB();
    const coupons = await db.collection('coupons').find({}).sort({ createdAt: -1 }).toArray();
    return ok(res, coupons);
  } catch (error) {
    return serverError(res, error);
  }
};

const createCoupon = async (req, res) => {
  try {
    const db = await getDB();
    const code = normalizeCode(req.body.code);
    const minOrderAmount = Number(req.body.minOrderAmount);
    const discountAmount = Number(req.body.discountAmount);
    const maxDiscountAmount = req.body.maxDiscountAmount == null ? discountAmount : Number(req.body.maxDiscountAmount);

    if (!code) return fail(res, 'Coupon code is required.');
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) return fail(res, 'Minimum order amount must be a valid positive number.');
    if (!Number.isFinite(discountAmount) || discountAmount <= 0) return fail(res, 'Discount amount must be greater than zero.');
    if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0) return fail(res, 'Maximum discount amount must be greater than zero.');

    const duplicate = await db.collection('coupons').findOne({ code });
    if (duplicate) return fail(res, 'A coupon with this code already exists.', 409);

    const coupon = {
      code,
      minOrderAmount,
      discountAmount,
      maxDiscountAmount,
      isActive: req.body.isActive !== false,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user?.userId || null,
    };

    const result = await db.collection('coupons').insertOne(coupon);
    return created(res, { ...coupon, _id: result.insertedId }, 'Coupon created successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return fail(res, 'Invalid coupon ID.');
    const db = await getDB();
    const result = await db.collection('coupons').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return notFound(res, 'Coupon not found.');
    return ok(res, null, 'Coupon deleted successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  validateCoupon,
  findValidCoupon,
  calculateDiscount,
  listCoupons,
  createCoupon,
  deleteCoupon,
};
