const { getDb } = require('../../config/db');
const { uploadToCloudinary } = require('../../utils/cloudinary');

const createDroneProduct = async (req, res) => {
  try {
    const { category, categoryImage, basic, specs, faqs } = req.body;

    if (!category || !basic?.title || !basic?.productCode || !basic?.regularPrice) {
      return res.status(400).json({
        success: false,
        message: 'Required fields (Title, SKU, Category, Price) are missing',
      });
    }

    // 🟢 ১. ইমেজগুলো Cloudinary-তে আপলোড করে CDN URL তৈরি করা
    let uploadedImages = [];
    if (basic.images && Array.isArray(basic.images)) {
      uploadedImages = await Promise.all(
        basic.images.map((img) => uploadToCloudinary(img, 'drones/gallery'))
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
      return res.status(400).json({
        success: false,
        message: 'Product SKU / Code already exists in database',
      });
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
    return res.status(200).json({
      success: true,
      data: { _id: result.insertedId, ...newProduct },
      message: 'Drone product created successfully',
    });
  } catch (err) {
    console.error('Error in createDroneProduct:', err);
    return res.status(500).json({
      success: false,
      message: 'Server Error: Failed to save product',
    });
  }
};

module.exports = {
  createDroneProduct,
};