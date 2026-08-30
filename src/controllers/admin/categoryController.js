const { getDb } = require('../../config/db');
const { uploadToCloudinary } = require('../../utils/cloudinary');

const getCategories = async (req, res) => {
  try {
    const db = await getDb();
    const categories = await db.collection('categories').find({}).toArray();
    return res.status(200).json({
      success: true,
      data: categories,
      message: 'Categories fetched successfully',
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, image } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    let uploadedCatImage = null;
    if (image) {
      uploadedCatImage = await uploadToCloudinary(image, 'drones/categories');
    }

    const db = await getDb();
    const collection = db.collection('categories');
    const existing = await collection.findOne({ name: name.trim() });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists',
      });
    }

    const newCategory = {
      name: name.trim(),
      image: uploadedCatImage,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newCategory);
    return res.status(200).json({
      success: true,
      data: { _id: result.insertedId, ...newCategory },
      message: 'Category created successfully',
    });
  } catch (err) {
    console.error('Error creating category:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category',
    });
  }
};

module.exports = { getCategories, createCategory };