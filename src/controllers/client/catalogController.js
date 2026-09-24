const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');

const slugify = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');

const createCatalogController = ({ collectionName, categoryType }) => {
  const getCategories = async (req, res) => {
    try {
      const db = await getDB();
      const categories = await db.collection('categories')
        .find({ type: categoryType })
        .project({ name: 1, image: 1 })
        .toArray();

      const data = categories.map((category) => ({
        id: category._id.toString(),
        name: category.name,
        image: category.image,
        slug: slugify(category.name),
      }));

      return res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
      console.error(`Error fetching ${categoryType} categories:`, error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };

  const getProductsByCategory = async (req, res) => {
    try {
      const categoryName = decodeURIComponent(req.params.slug || '').replace(/-/g, ' ');
      if (!categoryName) {
        return res.status(400).json({ success: false, message: 'Category slug is required' });
      }

      const db = await getDB();
      const products = await db.collection(collectionName)
        .find({ subCategory: { $regex: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } })
        .toArray();

      return res.status(200).json({ success: true, count: products.length, data: products });
    } catch (error) {
      console.error(`Error fetching ${categoryType} products:`, error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };

  const getProductById = async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid product ID format' });
      }

      const db = await getDB();
      const product = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

      return res.status(200).json({ success: true, data: product });
    } catch (error) {
      console.error(`Error fetching ${categoryType} product:`, error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };

  const getRelatedProducts = async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid product ID format' });

      const db = await getDB();
      const current = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
      if (!current) return res.status(404).json({ success: false, message: 'Product not found' });

      const relation = ['similar', 'accessories', 'combos'].includes(req.query.relation)
        ? req.query.relation
        : 'similar';
      const target = relation === 'accessories' ? 'Accessories' : relation === 'combos' ? 'Combo' : null;
      const excludedId = new ObjectId(id);
      const sourceIds = relation === 'similar' ? [] : (Array.isArray(current[relation]) ? current[relation]
        .filter((value) => ObjectId.isValid(value?.toString?.() || value))
        .map((value) => new ObjectId(value.toString())) : []);
      const collections = ['Drones', 'handhelds'];
      const byId = new Map();

      if (sourceIds.length) {
        const explicit = await Promise.all(collections.map(async (name) => {
          const items = await db.collection(name).find({ _id: { $in: sourceIds } }).toArray();
          return items.map((item) => ({ ...item, productType: name === 'Drones' ? 'drones' : 'handhelds' }));
        }));
        explicit.flat().forEach((item) => byId.set(item._id.toString(), item));
      }

      const fallbackFilters = [
        target ? { category: target } : null,
        { subCategory: current.subCategory },
        { category: current.category },
        { brand: current.brand },
      ].filter((filter) => filter && Object.values(filter).some(Boolean));

      for (const filter of fallbackFilters) {
        if (byId.size >= (target ? 5 : 4)) break;
        const candidates = await Promise.all(collections.map(async (name) => {
          const items = await db.collection(name)
            .find({ ...filter, _id: { $ne: excludedId } }).sort({ createdAt: -1 }).limit(target ? 5 : 4).toArray();
          return items.map((item) => ({ ...item, productType: name === 'Drones' ? 'drones' : 'handhelds' }));
        }));
        candidates.flat().forEach((item) => {
          if (byId.size < (target ? 5 : 4) && item._id.toString() !== id) byId.set(item._id.toString(), item);
        });
      }

      return res.status(200).json({ success: true, count: byId.size, data: [...byId.values()].slice(0, target ? 5 : 4) });
    } catch (error) {
      console.error(`Error fetching related ${categoryType} products:`, error.stack || error);
      return res.status(500).json({ success: false, message: 'Internal Server Error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  };

  return { getCategories, getRepository: getProductsByCategory, getProductsByCategory, getProductById, getRelatedProducts };
};

module.exports = { createCatalogController };