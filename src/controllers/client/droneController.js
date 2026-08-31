const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');

/**
 * @desc    Get all drone categories for the mega menu
 * @route   GET /api/client/drones/categories
 * @access  Public
 */
const getDroneCategories = async (req, res) => {
  try {
    const db = await getDB(); // 👈 এখানে await যুক্ত করা হয়েছে
    
    const categories = await db.collection('categories')
      .find({ type: 'drone' })
      .project({ name: 1, image: 1 })
      .toArray();

    const formattedCategories = categories.map((cat) => ({
      id: cat._id.toString(),
      name: cat.name,
      image: cat.image,
      slug: cat.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, ''),
    }));

    return res.status(200).json({
      success: true,
      count: formattedCategories.length,
      data: formattedCategories,
    });
  } catch (error) {
    console.error('Error fetching drone categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

/**
 * @desc    Get products by sub-category slug (Mega Menu click flow)
 * @route   GET /api/client/drones/category/:slug
 * @access  Public
 */
const getProductsBySubCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Category slug is required',
      });
    }

    const categoryName = slug.replace(/-/g, ' ');
    const db = await getDB(); // 👈 এখানে await যুক্ত করা হয়েছে

    const products = await db.collection('drones')
      .find({
        subCategory: { $regex: new RegExp(`^${categoryName}$`, 'i') },
      })
      .toArray();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

/**
 * @desc    Get single product details by ID
 * @route   GET /api/client/drones/product/:id
 * @access  Public
 */
const getSingleProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const db = await getDB(); // 👈 এখানে await যুক্ত করা হয়েছে
    const product = await db.collection('drones').findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

module.exports = {
  getDroneCategories,
  getProductsBySubCategory,
  getSingleProductDetails,
};