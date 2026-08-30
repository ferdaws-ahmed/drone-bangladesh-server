// server/src/controllers/admin/productController.js
import { uploadToCloudinary } from '../../utils/cloudinary.js';

export const createDroneProduct = async (req, res) => {
  try {
    const { category, categoryImage, basic, specs, faqs } = req.body;

    if (!category || !basic?.title || !basic?.productCode || !basic?.regularPrice) {
      return fail(res, 'Required fields (Title, SKU, Category, Price) are missing', 400);
    }

    // 🟢 ১. ইমেজগুলো Cloudinary-তে আপলোড করে CDN URL তৈরি করা
    let uploadedImages = [];
    if (basic.images && Array.isArray(basic.images)) {
      uploadedImages = await Promise.all(
        basic.images.map(img => uploadToCloudinary(img, 'drones/gallery'))
      );
    }

    let uploadedDescImg = null;
    if (basic.descriptionImage) {
      uploadedDescImg = await uploadToCloudinary(basic.descriptionImage, 'drones/descriptions');
    }

    let uploadedCatImg = null;
    if (categoryImage) {
      uploadedCatImg = await uploadToCloudinary(categoryImage, 'drones/categories');
    }

    const db = getDb();
    const collection = db.collection('products');

    const existingProduct = await collection.findOne({ productCode: basic.productCode.trim() });
    if (existingProduct) {
      return fail(res, 'Product SKU / Code already exists in database', 400);
    }

    // 🟢 ২. ডাটাবেসে Base64-এর বদলে কেবল Clean URL সেভ হবে
    const newProduct = {
      title: basic.title.trim(),
      productCode: basic.productCode.trim(),
      brand: basic.brand?.trim() || '',
      category,
      categoryImage: uploadedCatImg, // Cloudinary URL
      stockStatus: basic.stockStatus || 'In Stock',
      warranty: basic.warranty || '',
      pricing: {
        regularPrice: Number(basic.regularPrice) || 0,
        discountPercent: Number(basic.discountPercent) || 0,
        offerPrice: Number(basic.offerPrice) || 0,
        savingsAmount: Number(basic.savingsAmount) || 0,
      },
      images: uploadedImages, // Cloudinary URLs Array
      descriptionImage: uploadedDescImg, // Cloudinary URL
      description: basic.description || '',
      techSpecs: specs || {},
      faqs: faqs || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newProduct);
    return ok(res, { _id: result.insertedId, ...newProduct }, 'Drone product created successfully');
  } catch (err) {
    console.error('Error in createDroneProduct:', err);
    return errorResponse(res, 'Server Error: Failed to save product', 500);
  }
};