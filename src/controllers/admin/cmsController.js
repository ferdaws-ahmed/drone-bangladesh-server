const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');
const { ok, created, notFound, fail, serverError } = require('../../utils/response');

const listArticles = async (req, res) => {
  try {
    const db = await getDB();
    const items = await db.collection('articles').find({}).sort({ createdAt: -1 }).toArray();
    return ok(res, { items }, 'Articles fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const createArticle = async (req, res) => {
  try {
    const db = await getDB();
    const payload = req.body || {};

    if (!payload.title) {
      return fail(res, 'Article title is required.');
    }

    const doc = {
      title: payload.title,
      slug: payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: payload.category || 'general',
      excerpt: payload.excerpt || '',
      content: payload.content || '',
      imageUrl: payload.imageUrl || '',
      status: ['draft', 'published', 'scheduled'].includes(payload.status) ? payload.status : 'draft',
      productRefs: Array.isArray(payload.productRefs) ? payload.productRefs : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('articles').insertOne(doc);
    return created(res, { insertedId: result.insertedId, article: doc }, 'Article created successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const updateArticle = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    const payload = req.body || {};

    const update = {
      ...payload,
      updatedAt: new Date(),
    };

    const result = await db.collection('articles').updateOne({ _id: new ObjectId(id) }, { $set: update });
    if (result.matchedCount === 0) {
      return notFound(res, 'Article not found.');
    }

    const article = await db.collection('articles').findOne({ _id: new ObjectId(id) });
    return ok(res, article, 'Article updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const deleteArticle = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    const result = await db.collection('articles').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return notFound(res, 'Article not found.');
    }

    return ok(res, { deletedId: id }, 'Article deleted successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const listBanners = async (req, res) => {
  try {
    const db = await getDB();
    const items = await db.collection('banners').find({}).sort({ createdAt: -1 }).toArray();
    return ok(res, { items }, 'Banners fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const createBanner = async (req, res) => {
  try {
    const db = await getDB();
    const payload = req.body || {};

    if (!payload.title || !payload.imageUrl) {
      return fail(res, 'Banner title and imageUrl are required.');
    }

    const doc = {
      title: payload.title,
      subtitle: payload.subtitle || '',
      imageUrl: payload.imageUrl,
      linkUrl: payload.linkUrl || '/',
      ctaText: payload.ctaText || 'Shop Now',
      description: payload.description || '',
      sortOrder: Number(payload.sortOrder) || 0,
      isLive: false,
      bannerType: payload.bannerType || 'hero',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('banners').insertOne(doc);
    return created(res, { insertedId: result.insertedId, banner: doc }, 'Banner created successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const updateBanner = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    const payload = req.body || {};

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid banner ID format.');

    const $set = { ...payload, updatedAt: new Date() };
    if (payload.sortOrder !== undefined) $set.sortOrder = Number(payload.sortOrder) || 0;
    if (payload.isLive !== undefined) $set.isLive = Boolean(payload.isLive);

    const result = await db.collection('banners').updateOne({ _id: new ObjectId(id) }, { $set });
    if (result.matchedCount === 0) return notFound(res, 'Banner not found.');

    const updated = await db.collection('banners').findOne({ _id: new ObjectId(id) });
    return ok(res, updated, 'Banner updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const deleteBanner = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid banner ID format.');
    const result = await db.collection('banners').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound(res, 'Banner not found.');

    return ok(res, { deletedId: id }, 'Banner deleted successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const setLiveBanner = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid banner ID format.');
    await db.collection('banners').updateMany({}, { $set: { isLive: false, updatedAt: new Date() } });
    const result = await db.collection('banners').updateOne({ _id: new ObjectId(id) }, { $set: { isLive: true, updatedAt: new Date() } });

    if (result.matchedCount === 0) return notFound(res, 'Banner not found.');
    return ok(res, { bannerId: id, isLive: true }, 'Live banner updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  setLiveBanner,
};
