// server/src/controllers/admin/categoryController.js
import { getDb } from '../../config/db.js';
import { ok, fail, errorResponse } from '../../utils/response.js';
import { uploadToCloudinary } from '../../utils/cloudinary.js';

export const getCategories = async (req, res) => {
  try {
    const db = getDb();
    const categories = await db.collection('categories').find({}).toArray();
    return ok(res, categories, 'Categories fetched successfully');
  } catch (err) {
    console.error('Error fetching categories:', err);
    return errorResponse(res, 'Failed to fetch categories', 500);
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name || !name.trim()) {
      return fail(res, 'Category name is required', 400);
    }

    let uploadedCatImage = null;
    if (image) {
      uploadedCatImage = await uploadToCloudinary(image, 'drones/categories');
    }

    const db = getDb();
    const collection = db.collection('categories');

    const existing = await collection.findOne({ name: name.trim() });
    if (existing) {
      return fail(res, 'Category already exists', 400);
    }

    const newCategory = {
      name: name.trim(),
      image: uploadedCatImage,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newCategory);
    return ok(res, { _id: result.insertedId, ...newCategory }, 'Category created successfully');
  } catch (err) {
    console.error('Error creating category:', err);
    return errorResponse(res, 'Failed to create category', 500);
  }
};