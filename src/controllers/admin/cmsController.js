const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');
const { ok, created, notFound, fail, serverError } = require('../../utils/response');
const { uploadToCloudinary } = require('../../utils/cloudinary');

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

    const slugify = (text) =>
      String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');

    const baseSlug = payload.slug ? slugify(payload.slug) : slugify(payload.title);
    let slug = baseSlug;
    let suffix = 1;
    while (await db.collection('articles').findOne({ slug })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const doc = {
      title: payload.title,
      author: payload.author || 'Drone Bangladesh',
      slug,
      category: payload.category || 'General',
      excerpt: payload.excerpt || '',
      content: payload.content || '',
      imageUrl: await uploadToCloudinary(payload.imageUrl, 'articles') || '',
      status: ['draft', 'published', 'scheduled'].includes(payload.status) ? payload.status : 'draft',
      metaDescription: payload.metaDescription || '',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
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

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid article ID format.');
    if (!payload.title) return fail(res, 'Article title is required.');

    const slugify = (text) =>
      String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');

    const desiredSlug = payload.slug ? slugify(payload.slug) : slugify(payload.title);
    let slug = desiredSlug;
    let suffix = 1;
    while (true) {
      const existing = await db.collection('articles').findOne({ slug });
      if (!existing || String(existing._id) === String(id)) break;
      suffix += 1;
      slug = `${desiredSlug}-${suffix}`;
    }

    const update = {
      title: payload.title,
      author: payload.author || 'Drone Bangladesh',
      slug,
      category: payload.category || 'General',
      excerpt: payload.excerpt || '',
      content: payload.content || '',
      status: ['draft', 'published', 'scheduled'].includes(payload.status) ? payload.status : 'draft',
      metaDescription: payload.metaDescription || '',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      productRefs: Array.isArray(payload.productRefs) ? payload.productRefs : [],
      updatedAt: new Date(),
    };
    if (payload.imageUrl !== undefined) update.imageUrl = await uploadToCloudinary(payload.imageUrl, 'articles') || '';

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

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid article ID format.');

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

const VALID_SECTIONS = ['products', 'maintenance', 'contact'];

const createBanner = async (req, res) => {
  try {
    const db = await getDB();
    const payload = req.body || {};

    if (!payload.imageUrl) {
      return fail(res, 'Banner imageUrl is required.');
    }

    // Upload image to Cloudinary if it is a base64 string; pass through existing URLs
    const uploadedImageUrl = await uploadToCloudinary(payload.imageUrl, 'banners');

    const section = VALID_SECTIONS.includes(payload.section) ? payload.section : 'products';

    // title is optional — default to section name + timestamp for internal tracking
    const autoTitle = payload.title?.trim() || `${section}-banner-${Date.now()}`;

    const doc = {
      title: autoTitle,
      imageUrl: uploadedImageUrl || payload.imageUrl,
      sortOrder: Number(payload.sortOrder) || 0,
      isLive: false,
      isActive: false,
      section,
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
    if (payload.isLive !== undefined)    $set.isLive    = Boolean(payload.isLive);
    if (payload.isActive !== undefined)  $set.isActive  = Boolean(payload.isActive);
    if (payload.section !== undefined)   $set.section   = VALID_SECTIONS.includes(payload.section) ? payload.section : 'products';

    // If imageUrl is a new base64 string, upload it; existing https URLs are passed through
    if (payload.imageUrl !== undefined) {
      $set.imageUrl = await uploadToCloudinary(payload.imageUrl, 'banners') || payload.imageUrl;
    }

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

    // Find the target banner first so we know its section
    const target = await db.collection('banners').findOne({ _id: new ObjectId(id) });
    if (!target) return notFound(res, 'Banner not found.');

    // Deactivate only banners in the same section, then activate the target
    await db.collection('banners').updateMany(
      { section: target.section },
      { $set: { isActive: false, isLive: false, updatedAt: new Date() } }
    );
    await db.collection('banners').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: true, isLive: true, updatedAt: new Date() } }
    );

    return ok(res, { bannerId: id, isActive: true, isLive: true, section: target.section }, 'Live banner updated successfully.');
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
