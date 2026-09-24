const { getDB } = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT: Homepage public endpoints (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/client/homepage/featured-categories
 * Returns up to 4 isFeatured drone categories.
 */
const getFeaturedCategories = async (req, res) => {
  try {
    const db = await getDB();
    const categoryQuery = { type: { $in: ['drone', 'Drone', 'DRONE'] }, isFeatured: true };
    let categories = await db
      .collection('categories')
      .find(categoryQuery)
      .project({ name: 1, image: 1, type: 1, isFeatured: 1 })
      .limit(4)
      .toArray();

    if (!categories.length) {
      categories = await db
        .collection('categories')
        .find({ type: { $in: ['drone', 'Drone', 'DRONE'] } })
        .project({ name: 1, image: 1, type: 1, isFeatured: 1 })
        .limit(4)
        .toArray();
    }

    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    console.error('client getFeaturedCategories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch featured categories' });
  }
};

/**
 * GET /api/client/homepage/products?flag=isNewArrival&limit=8
 * Returns drone products filtered by a homepage flag.
 * Supported flags: isNewArrival, isDjiDrone, isPersonalDrone, isBeginnerDrone
 */
const VALID_FLAGS = ['isNewArrival', 'isDjiDrone', 'isPersonalDrone', 'isBeginnerDrone'];

const getHomepageProducts = async (req, res) => {
  try {
    const { flag, limit = 8 } = req.query;
    const normalizedFlag = typeof flag === 'string'
      ? VALID_FLAGS.find((item) => item.toLowerCase() === flag.toLowerCase()) || flag
      : null;

    if (!normalizedFlag || !VALID_FLAGS.includes(normalizedFlag)) {
      return res.status(400).json({
        success: false,
        message: `flag query param is required. Must be one of: ${VALID_FLAGS.join(', ')}`,
      });
    }

    const db = await getDB();
    const productLimit = Number(limit) > 0 ? Number(limit) : 8;

    let products = await db
      .collection('Drones')
      .find({ [normalizedFlag]: true, stockStatus: { $ne: 'Discontinued' } })
      .project({
        title: 1,
        brand: 1,
        images: 1,
        pricing: 1,
        stockStatus: 1,
        category: 1,
        subCategory: 1,
        keyFeatures: 1,
        badge: 1,
        isBestSeller: 1,
        isNewArrival: 1,
        isDjiDrone: 1,
        isPersonalDrone: 1,
        isBeginnerDrone: 1,
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(productLimit)
      .toArray();

    if (!products.length) {
      products = await db
        .collection('Drones')
        .find({ stockStatus: { $ne: 'Discontinued' } })
        .project({
          title: 1,
          brand: 1,
          images: 1,
          pricing: 1,
          stockStatus: 1,
          category: 1,
          subCategory: 1,
          keyFeatures: 1,
          badge: 1,
          isBestSeller: 1,
          isNewArrival: 1,
          isDjiDrone: 1,
          isPersonalDrone: 1,
          isBeginnerDrone: 1,
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(productLimit)
        .toArray();
    }

    return res.status(200).json({ success: true, data: products });
  } catch (err) {
    console.error('getHomepageProducts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch homepage products' });
  }
};

/**
 * GET /api/client/homepage/honorable-customers
 * Returns all honorable customers for the /customers page.
 * Home page slider will take first 5 via client-side slicing.
 */
const getHonorableCustomers = async (req, res) => {
  try {
    const db = await getDB();
    const customers = await db
      .collection('honorableCustomers')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ success: true, data: customers });
  } catch (err) {
    console.error('client getHonorableCustomers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch honorable customers' });
  }
};

module.exports = {
  getFeaturedCategories,
  getHomepageProducts,
  getHonorableCustomers,
};
