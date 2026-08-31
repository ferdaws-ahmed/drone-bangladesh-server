const { getDB } = require('../../config/db');
const { uploadToCloudinary } = require('../../utils/cloudinary');
const { ObjectId } = require('mongodb');

const getHandheldsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required',
      });
    }

    const db = await getDB();
    const products = await db.collection('handhelds')
      .find({ category })
      .project({ _id: 1, title: 1, productCode: 1, category: 1, images: 1 })
      .toArray();
    
    return res.status(200).json({
      success: true,
      data: products,
      message: 'Handhelds fetched successfully',
    });
  } catch (err) {
    console.error('Error in getHandheldsByCategory:', err);
    return res.status(500).json({
      success: false,
      message: 'Server Error: Failed to fetch handhelds',
    });
  }
};

const createHandheldProduct = async (req, res) => {
  try {
    const { category, subCategory, categoryImage, basic, specs, faqs, accessories, combos } = req.body;

    if (!category || !subCategory || !basic?.title || !basic?.productCode || !basic?.regularPrice) {
      return res.status(400).json({
        success: false,
        message: 'Required fields (Title, SKU, Category, SubCategory, Price) are missing',
      });
    }

    // Convert accessories and combos to ObjectId arrays if provided
    const accessoriesIds = accessories && Array.isArray(accessories) 
      ? accessories.map(id => new ObjectId(id)) 
      : [];
    
    const combosIds = combos && Array.isArray(combos) 
      ? combos.map(id => new ObjectId(id)) 
      : [];

    // Upload images to Cloudinary
    let uploadedImages = [];
    if (basic.images && Array.isArray(basic.images)) {
      uploadedImages = await Promise.all(
        basic.images.map((img) => uploadToCloudinary(img, 'handhelds/gallery'))
      );
    }

    let uploadedDescImg = null;
    if (basic.descriptionImage) {
      uploadedDescImg = await uploadToCloudinary(basic.descriptionImage, 'handhelds/descriptions');
    }

    let uploadedCatImg = null;
    if (categoryImage) {
      uploadedCatImg = await uploadToCloudinary(categoryImage, 'handhelds/categories');
    }

    const db = await getDB();
    const collection = db.collection('handhelds');

    const existingProduct = await collection.findOne({ productCode: basic.productCode.trim() });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product SKU / Code already exists in database',
      });
    }

    const newProduct = {
      title: basic.title.trim(),
      productCode: basic.productCode.trim(),
      brand: basic.brand?.trim() || '',
      category,
      subCategory,
      categoryImage: uploadedCatImg,
      stockStatus: basic.stockStatus || 'In Stock',
      warranty: basic.warranty || '',
      pricing: {
        regularPrice: Number(basic.regularPrice) || 0,
        discountPercent: Number(basic.discountPercent) || 0,
        offerPrice: Number(basic.offerPrice) || 0,
        savingsAmount: Number(basic.savingsAmount) || 0,
        emiPercentage: Number(basic.emiPercentage) || 0,
      },
      images: uploadedImages,
      descriptionImage: uploadedDescImg,
      description: basic.description || '',
      keyFeatures: basic.keyFeatures || [],
      techSpecs: specs || {},
      faqs: faqs || [],
      accessories: accessoriesIds,
      combos: combosIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newProduct);
    return res.status(200).json({
      success: true,
      data: { _id: result.insertedId, ...newProduct },
      message: 'Handheld product created successfully',
    });
  } catch (err) {
    console.error('Error in createHandheldProduct:', err);
    return res.status(500).json({
      success: false,
      message: 'Server Error: Failed to save handheld product',
    });
  }
};

module.exports = {
  getHandheldsByCategory,
  createHandheldProduct,
};
