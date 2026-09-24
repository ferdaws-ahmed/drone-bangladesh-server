const { getDB } = require('../../config/db');
const { uploadToCloudinary } = require('../../utils/cloudinary');
const { ObjectId } = require('mongodb');

const COLLECTIONS = { drone: 'Drones', handheld: 'handhelds' };
const getCollectionName = (productType) => COLLECTIONS[productType];

const findProduct = async (db, id, productType) => {
  if (!ObjectId.isValid(id)) return null;
  const collections = productType && getCollectionName(productType)
    ? [[productType, getCollectionName(productType)]]
    : Object.entries(COLLECTIONS);

  for (const [type, collectionName] of collections) {
    const product = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
    if (product) return { product, productType: type, collectionName };
  }
  return null;
};

const listAdminProducts = async (req, res) => {
  try {
    const db = await getDB();
    const collectionEntries = req.query.productType && getCollectionName(req.query.productType)
      ? [[req.query.productType, getCollectionName(req.query.productType)]]
      : Object.entries(COLLECTIONS);
    const search = String(req.query.search || '').trim();
    const filter = {};

    if (req.query.category) filter.category = req.query.category;
    if (req.query.stockStatus) filter.stockStatus = req.query.stockStatus;
    if (search) {
      filter.$or = ['title', 'productCode', 'brand', 'subCategory'].map((field) => ({
        [field]: { $regex: search, $options: 'i' },
      }));
    }

    const results = await Promise.all(collectionEntries.map(async ([productType, collectionName]) => {
      const items = await db.collection(collectionName).find(filter).sort({ updatedAt: -1, createdAt: -1 }).toArray();
      return items.map((item) => ({ ...item, productType, collectionName }));
    }));
    const items = results.flat().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    return res.status(200).json({
      success: true,
      data: { items, pagination: { page: 1, limit: items.length, total: items.length, totalPages: 1 } },
      message: `${items.length} product(s) found.`,
    });
  } catch (error) {
    console.error('Error in listAdminProducts:', error);
    return res.status(500).json({ success: false, message: 'Failed to load products' });
  }
};

const getAdminProduct = async (req, res) => {
  try {
    const found = await findProduct(await getDB(), req.params.id, req.query.productType);
    if (!found) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.status(200).json({ success: true, data: { ...found.product, productType: found.productType, collectionName: found.collectionName } });
  } catch (error) {
    console.error('Error in getAdminProduct:', error);
    return res.status(500).json({ success: false, message: 'Failed to load product' });
  }
};

const updateAdminProduct = async (req, res) => {
  try {
    const db = await getDB();
    const found = await findProduct(db, req.params.id, req.body.productType);
    if (!found) return res.status(404).json({ success: false, message: 'Product not found' });
    const { _id, createdAt, productType, collectionName, ...updates } = req.body;
    if (updates.basic) {
      const { basic, specs, faqs, accessories, combos, category, subCategory } = updates;
      Object.assign(updates, {
        title: basic.title?.trim() || '', productCode: basic.productCode?.trim() || '',
        brand: basic.brand?.trim() || '', category, subCategory,
        stockStatus: basic.stockStatus || 'In Stock', warranty: basic.warranty || '',
        pricing: {
          regularPrice: Number(basic.regularPrice) || 0,
          discountPercent: Number(basic.discountPercent) || 0,
          offerPrice: Number(basic.offerPrice) || 0,
          savingsAmount: Number(basic.savingsAmount) || 0,
          emiPercentage: Number(basic.emiPercentage) || 0,
        },
        images: basic.images || [], descriptionImage: basic.descriptionImage || null,
        description: basic.description || '', keyFeatures: basic.keyFeatures || [],
        techSpecs: specs || {}, faqs: faqs || [],
        accessories: (accessories || []).map((id) => ObjectId.isValid(id) ? new ObjectId(id) : id),
        combos: (combos || []).map((id) => ObjectId.isValid(id) ? new ObjectId(id) : id),
      });
      delete updates.basic;
      delete updates.specs;
      delete updates.faqs;
      delete updates.accessories;
      delete updates.combos;
    }
    updates.updatedAt = new Date();
    await db.collection(found.collectionName).updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    const updated = await db.collection(found.collectionName).findOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ success: true, data: { ...updated, productType: found.productType, collectionName: found.collectionName }, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error in updateAdminProduct:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

const deleteAdminProduct = async (req, res) => {
  try {
    const db = await getDB();
    const found = await findProduct(db, req.params.id, req.query.productType);
    if (!found) return res.status(404).json({ success: false, message: 'Product not found' });
    await db.collection(found.collectionName).deleteOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ success: true, data: { deletedId: req.params.id }, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAdminProduct:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

const createDroneProduct = async (req, res) => {
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

    const db = await getDB();
    const collection = db.collection('Drones');

    const existingProduct = await collection.findOne({ productCode: basic.productCode.trim() });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product SKU / Code already exists in database',
      });
    }

    // ২. ডাটাবেসে Base64-এর বদলে কেবল Clean URL সেভ হবে
    const newProduct = {
      title: basic.title.trim(),
      productCode: basic.productCode.trim(),
      brand: basic.brand?.trim() || '',
      category,
      subCategory,
      categoryImage: uploadedCatImg, // Cloudinary URL
      stockStatus: basic.stockStatus || 'In Stock',
      warranty: basic.warranty || '',
      pricing: {
        regularPrice: Number(basic.regularPrice) || 0,
        discountPercent: Number(basic.discountPercent) || 0,
        offerPrice: Number(basic.offerPrice) || 0,
        savingsAmount: Number(basic.savingsAmount) || 0,
        emiPercentage: Number(basic.emiPercentage) || 0,
      },
      images: uploadedImages, // Cloudinary URLs Array
      descriptionImage: uploadedDescImg, // Cloudinary URL
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
  listAdminProducts,
  getAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
};