const { getDB } = require('../../config/db');
const { ok, notFound, serverError } = require('../../utils/response');

const listPublishedArticles = async (req, res) => {
  try {
    const db = await getDB();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 12));
    const filter = { status: 'published' };

    if (req.query.category) {
      filter.category = { $regex: new RegExp(`^${req.query.category}$`, 'i') };
    }
    if (req.query.tag) {
      filter.tags = { $in: [req.query.tag] };
    }

    const total = await db.collection('articles').countDocuments(filter);
    const items = await db.collection('articles')
      .find(filter)
      .project({ title: 1, slug: 1, author: 1, category: 1, excerpt: 1, imageUrl: 1, tags: 1, createdAt: 1, metaDescription: 1 })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return ok(res, { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }, 'Published articles fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const getPublishedArticle = async (req, res) => {
  try {
    const db = await getDB();
    const article = await db.collection('articles').findOne({ status: 'published', slug: req.params.slug });
    if (!article) return notFound(res, 'Article not found.');
    return ok(res, article, 'Article fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = { listPublishedArticles, getPublishedArticle };