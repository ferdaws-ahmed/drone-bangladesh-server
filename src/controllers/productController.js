const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { ok, created, notFound, fail, serverError } = require('../utils/response');

const ALLOWED_SORT_FIELDS = ['price', 'name', 'createdAt', 'rating', 'stock'];
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

const buildFilter = (query) => {
  const filter = {};

  if (query.category) {
    filter.category = query.category;
  }
  if (query.brand) {
    filter.brand = query.brand;
  }
  if (query.subCategory) {
    filter.subCategory = query.subCategory;
  }
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    if (Object.keys(filter.price).length === 0) delete filter.price;
  }
  if (query.inStock) {
    filter.stock = { $gt: 0 };
  }
  if (query.discount) {
    filter.discountPercentage = { $gte: Number(query.discount) };
  }
  if (query.search) {
    const searchRegex = { $regex: String(query.search).trim(), $options: 'i' };
    filter.$or = [{ name: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
  }

  return filter;
};

const getAllProducts = async (req, res) => {
  try {
    const db = await getDB();
    const collection = db.collection('products');

    const filter = buildFilter(req.query);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    let sort = { createdAt: -1 };
    if (req.query.sortBy && ALLOWED_SORT_FIELDS.includes(req.query.sortBy)) {
      const dir = req.query.sortOrder === 'asc' ? 1 : -1;
      sort = { [req.query.sortBy]: dir };
    }

    const [products, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    return ok(
      res,
      {
        items: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
      `${products.length} product(s) found.`
    );
  } catch (error) {
    return serverError(res, error);
  }
};

const getProductById = async (req, res) => {
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

    return ok(res, product);
  } catch (error) {
    return serverError(res, error);
  }
};

const createProduct = async (req, res) => {
  try {
    const db = await getDB();
    const {
      name, price, stock, category, description, images,
    } = req.body;

    if (!name || !price || !category) {
      return fail(res, 'Name, price and category are required.');
    }

    const newProduct = {
      name,
      price: Number(price),
      stock: Number(stock) || 0,
      category,
      description: description || '',
      images: images || [],
      rating: 0,
      reviewsCount: 0,
      discountPercentage: Number(req.body.discountPercentage) || 0,
      brand: req.body.brand || null,
      subCategory: req.body.subCategory || null,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      specifications: req.body.specifications || {},
      isActive: req.body.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('products').insertOne(newProduct);
    return created(
      res,
      { insertedId: result.insertedId, ...newProduct },
      'Product created successfully.'
    );
  } catch (error) {
    return serverError(res, error);
  }
};

const updateProduct = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return fail(res, 'Invalid product ID format.');
    }

    const numericFields = ['price', 'stock', 'discountPercentage', 'rating', 'reviewsCount'];
    const updates = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(req.body)) {
      if (value === undefined || key === '_id' || key === 'createdAt') continue;
      updates[key] = numericFields.includes(key) ? Number(value) : value;
    }

    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return notFound(res, 'Product not found.');
    }

    const updated = await db.collection('products').findOne({ _id: new ObjectId(id) });
    return ok(res, updated, 'Product updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const deleteProduct = async (req, res) => {
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

const bulkCreateProducts = async (req, res) => {
  try {
    const db = await getDB();
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return fail(res, 'Array of products is required.');
    }
    if (items.length > 500) {
      return fail(res, 'Maximum 500 products allowed per bulk operation.');
    }

    const docs = items.map((it) => {
      const numericFields = ['price', 'stock', 'discountPercentage', 'rating', 'reviewsCount'];
      const doc = {
        name: it.name,
        price: Number(it.price) || 0,
        stock: Number(it.stock) || 0,
        category: it.category,
        description: it.description || '',
        images: it.images || [],
        rating: Number(it.rating) || 0,
        reviewsCount: Number(it.reviewsCount) || 0,
        discountPercentage: Number(it.discountPercentage) || 0,
        brand: it.brand || null,
        subCategory: it.subCategory || null,
        tags: Array.isArray(it.tags) ? it.tags : [],
        specifications: it.specifications || {},
        isActive: it.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      for (const k of Object.keys(doc)) {
        if (numericFields.includes(k) && it[k] !== undefined) doc[k] = Number(it[k]) || 0;
      }
      return doc;
    });

    const invalid = docs.filter((d) => !d.name || !d.price || !d.category);
    if (invalid.length) {
      return fail(res, `${invalid.length} product(s) missing name/price/category.`);
    }

    const result = await db.collection('products').insertMany(docs, { ordered: false });
    return ok(
      res,
      { insertedCount: result.insertedCount, insertedIds: Object.values(result.insertedIds) },
      `Bulk created ${result.insertedCount} product(s).`
    );
  } catch (error) {
    return serverError(res, error);
  }
};

const bulkUpdateProducts = async (req, res) => {
  try {
    const db = await getDB();
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return fail(res, 'Array of products with _id is required.');
    }
    if (items.length > 500) {
      return fail(res, 'Maximum 500 products allowed per bulk operation.');
    }

    const numericFields = ['price', 'stock', 'discountPercentage', 'rating', 'reviewsCount'];
    const ops = [];

    for (const it of items) {
      if (!it._id || !ObjectId.isValid(it._id)) continue;
      const $set = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(it)) {
        if (v === undefined || k === '_id' || k === 'createdAt') continue;
        $set[k] = numericFields.includes(k) ? Number(v) : v;
      }
      ops.push({
        updateOne: {
          filter: { _id: new ObjectId(it._id) },
          update: { $set },
        },
      });
    }

    if (!ops.length) return fail(res, 'No valid products to update.');
    const result = await db.collection('products').bulkWrite(ops, { ordered: false });
    return ok(
      res,
      { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
      `Bulk updated ${result.modifiedCount} product(s).`
    );
  } catch (error) {
    return serverError(res, error);
  }
};

const bulkDeleteProducts = async (req, res) => {
  try {
    const db = await getDB();
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return fail(res, 'Array of product IDs is required.');
    }
    if (ids.length > 500) {
      return fail(res, 'Maximum 500 products allowed per bulk delete.');
    }

    const validIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (!validIds.length) return fail(res, 'No valid product IDs provided.');

    const result = await db.collection('products').deleteMany({ _id: { $in: validIds } });
    return ok(res, { deletedCount: result.deletedCount }, `Bulk deleted ${result.deletedCount} product(s).`);
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkCreateProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
};
