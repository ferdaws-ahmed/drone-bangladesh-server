const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');
const { ok, created, notFound, fail, serverError } = require('../../utils/response');

const listPackages = async (req, res) => {
  try {
    const db = await getDB();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.appliesTo) filter.appliesTo = req.query.appliesTo; // 'drone' | 'handheld' | 'both'

    const [items, total] = await Promise.all([
      db.collection('maintenance_packages').find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('maintenance_packages').countDocuments(filter),
    ]);

    return ok(res, {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Maintenance packages fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const createPackage = async (req, res) => {
  try {
    const db = await getDB();
    const p = req.body || {};

    if (!p.name || p.price === undefined || p.price === null) {
      return fail(res, 'Package name and price are required.');
    }

    const doc = {
      name: String(p.name).trim(),
      slug: p.slug || String(p.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      price: Number(p.price) || 0,
      originalPrice: Number(p.originalPrice) || 0,
      appliesTo: ['drone', 'handheld', 'both'].includes(p.appliesTo) ? p.appliesTo : 'both',
      duration: p.duration || '3-5 business days',
      shortDescription: p.shortDescription || '',
      description: p.description || '',
      features: Array.isArray(p.features) ? p.features.filter(Boolean) : [],
      inclusions: Array.isArray(p.inclusions) ? p.inclusions.filter(Boolean) : [],
      exclusions: Array.isArray(p.exclusions) ? p.exclusions.filter(Boolean) : [],
      badge: ['popular', 'best-value', 'recommended', 'none'].includes(p.badge) ? p.badge : 'none',
      sortOrder: Number(p.sortOrder) || 0,
      isActive: p.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('maintenance_packages').insertOne(doc);
    return created(res, { insertedId: result.insertedId, package: doc }, 'Maintenance package created successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const updatePackage = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    const p = req.body || {};

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid package ID format.');

    const $set = { ...p, updatedAt: new Date() };
    if (p.price !== undefined) $set.price = Number(p.price) || 0;
    if (p.originalPrice !== undefined) $set.originalPrice = Number(p.originalPrice) || 0;
    if (p.sortOrder !== undefined) $set.sortOrder = Number(p.sortOrder) || 0;
    if (p.isActive !== undefined) $set.isActive = Boolean(p.isActive);
    if (p.features) $set.features = Array.isArray(p.features) ? p.features.filter(Boolean) : [];
    if (p.inclusions) $set.inclusions = Array.isArray(p.inclusions) ? p.inclusions.filter(Boolean) : [];
    if (p.exclusions) $set.exclusions = Array.isArray(p.exclusions) ? p.exclusions.filter(Boolean) : [];
    if (p.appliesTo) {
      $set.appliesTo = ['drone', 'handheld', 'both'].includes(p.appliesTo) ? p.appliesTo : 'both';
    }
    if (p.badge) {
      $set.badge = ['popular', 'best-value', 'recommended', 'none'].includes(p.badge) ? p.badge : 'none';
    }

    const result = await db.collection('maintenance_packages').updateOne({ _id: new ObjectId(id) }, { $set });
    if (result.matchedCount === 0) return notFound(res, 'Maintenance package not found.');

    const updated = await db.collection('maintenance_packages').findOne({ _id: new ObjectId(id) });
    return ok(res, updated, 'Maintenance package updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const deletePackage = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return fail(res, 'Invalid package ID format.');

    const result = await db.collection('maintenance_packages').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound(res, 'Maintenance package not found.');

    return ok(res, { deletedId: id }, 'Maintenance package deleted successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
};
