const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');
const { ok, created, notFound, fail, serverError } = require('../../utils/response');

const listAdminProducts = async (req, res) => {
  try {
    const db = await getDB();
    const collection = db.collection('products');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subCategory) filter.subCategory = req.query.subCategory;
    if (req.query.isLive !== undefined) filter.isLive = req.query.isLive === 'true';

    const [items, total] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    return ok(res, {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Products fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const getAdminProductById = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return fail(res, 'Invalid product ID format.');
    }

    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
    if (!product) {
      return notFound(res, 'Product not found.');
    }

    return ok(res, product, 'Product fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const createAdminProduct = async (req, res) => {
  try {
    const db = await getDB();
    const payload = req.body || {};

    if (!payload.name || !payload.category) {
      return fail(res, 'Product name and category are required.');
    }

    const doc = {
      ...payload,
      price: Number(payload.price) || 0,
      stock: Number(payload.stock) || 0,
      specifications: payload.specifications || {},
      accessories: Array.isArray(payload.accessories) ? payload.accessories : [],
      similarProducts: Array.isArray(payload.similarProducts) ? payload.similarProducts : [],
      isFeatured: Boolean(payload.isFeatured),
      badge: ['new-arrival', 'best-seller', 'hot', 'none'].includes(payload.badge) ? payload.badge : 'none',
      isLive: payload.isLive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('products').insertOne(doc);
    return created(res, { insertedId: result.insertedId, product: doc }, 'Product created successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const updateAdminProduct = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return fail(res, 'Invalid product ID format.');
    }

    const $set = {
      ...req.body,
      updatedAt: new Date(),
    };

    if (req.body.price !== undefined) $set.price = Number(req.body.price) || 0;
    if (req.body.stock !== undefined) $set.stock = Number(req.body.stock) || 0;
    if (req.body.specifications) $set.specifications = req.body.specifications;
    if (req.body.accessories) $set.accessories = Array.isArray(req.body.accessories) ? req.body.accessories : [];
    if (req.body.similarProducts) $set.similarProducts = Array.isArray(req.body.similarProducts) ? req.body.similarProducts : [];
    if (req.body.badge) {
      $set.badge = ['new-arrival', 'best-seller', 'hot', 'none'].includes(req.body.badge) ? req.body.badge : 'none';
    }
    if (req.body.isLive !== undefined) $set.isLive = Boolean(req.body.isLive);
    if (req.body.isFeatured !== undefined) $set.isFeatured = Boolean(req.body.isFeatured);

    const result = await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set });
    if (result.matchedCount === 0) {
      return notFound(res, 'Product not found.');
    }

    const updated = await db.collection('products').findOne({ _id: new ObjectId(id) });
    return ok(res, updated, 'Product updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const deleteAdminProduct = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return fail(res, 'Invalid product ID format.');
    }

    const result = await db.collection('products').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return notFound(res, 'Product not found.');
    }

    return ok(res, { deletedId: id }, 'Product deleted successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  listAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
};
