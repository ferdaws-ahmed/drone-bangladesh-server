const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');
const { uploadToCloudinary } = require('../../utils/cloudinary');

const getCategories = async (req, res) => {
  try {
    console.log('GET /api/v1/admin/categories - Request received');
    const db = await getDB();
    console.log('Database connected');
    
    const { type } = req.query;
    const filter = type ? { type } : {};
    
    const categories = await db.collection('categories').find(filter).toArray();
    console.log('Categories fetched:', categories);
    return res.status(200).json({
      success: true,
      data: categories,
      message: 'Categories fetched successfully',
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: err.message
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, image, type } = req.body;
    console.log('Create category request:', { name, type, hasImage: !!image });
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    if (!type || !['drone', 'handheld'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Category type (drone/handheld) is required',
      });
    }

    let uploadedCatImage = null;
    if (image) {
      uploadedCatImage = await uploadToCloudinary(image, 'drones/categories');
    }

    const db = await getDB();
    const collection = db.collection('categories');
    const existing = await collection.findOne({ name: name.trim(), type });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists for this type',
      });
    }

    const newCategory = {
      name: name.trim(),
      type,
      image: uploadedCatImage,
      createdAt: new Date(),
    };

    console.log('Saving category to database:', newCategory);
    const result = await collection.insertOne(newCategory);
    console.log('Category saved with ID:', result.insertedId);
    
    return res.status(200).json({
      success: true,
      data: { _id: result.insertedId, ...newCategory },
      message: 'Category created successfully',
    });
  } catch (err) {
    console.error('Error creating category:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: err.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDB();
    const collection = db.collection('categories');
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category',
    });
  }
};

module.exports = { getCategories, createCategory, deleteCategory };