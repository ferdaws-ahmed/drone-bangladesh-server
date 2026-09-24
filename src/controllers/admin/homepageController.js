const { ObjectId } = require('mongodb');
const { getDB } = require('../../config/db');
const { uploadToCloudinary } = require('../../utils/cloudinary');

// ─────────────────────────────────────────────────────────────────────────────
// FEATURED CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/homepage/featured-categories
 * Returns all drone-type categories with their isFeatured status.
 */
const getFeaturedCategories = async (req, res) => {
  try {
    const db = await getDB();
    const categories = await db
      .collection('categories')
      .find({ type: 'drone' })
      .project({ name: 1, image: 1, type: 1, isFeatured: 1 })
      .sort({ name: 1 })
      .toArray();

    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    console.error('getFeaturedCategories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch featured categories' });
  }
};

/**
 * PATCH /api/v1/admin/homepage/featured-categories/:id
 * Toggle isFeatured on a category.
 * Business rule: max 4 categories can be featured at a time.
 */
const toggleFeaturedCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const db = await getDB();
    const collection = db.collection('categories');

    const category = await collection.findOne({ _id: new ObjectId(id) });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const newValue = !category.isFeatured;

    // Enforce max-4 rule only when featuring
    if (newValue) {
      const featuredCount = await collection.countDocuments({ type: 'drone', isFeatured: true });
      if (featuredCount >= 4) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 4 categories can be featured at a time. Please unfeature one first.',
        });
      }
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isFeatured: newValue, updatedAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      data: { _id: id, isFeatured: newValue },
      message: `Category ${newValue ? 'featured' : 'unfeatured'} successfully`,
    });
  } catch (err) {
    console.error('toggleFeaturedCategory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update featured status' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT FLAGS  (isNewArrival, isDjiDrone, isPersonalDrone, isBeginnerDrone)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_FLAGS = ['isNewArrival', 'isDjiDrone', 'isPersonalDrone', 'isBeginnerDrone'];

/**
 * GET /api/v1/admin/homepage/product-flags
 * Returns all drone products with their homepage flag values.
 */
const getProductFlags = async (req, res) => {
  try {
    const db = await getDB();
    const products = await db
      .collection('Drones')
      .find({})
      .project({
        title: 1,
        productCode: 1,
        brand: 1,
        images: 1,
        'pricing.offerPrice': 1,
        'pricing.regularPrice': 1,
        stockStatus: 1,
        category: 1,
        subCategory: 1,
        isNewArrival: 1,
        isDjiDrone: 1,
        isPersonalDrone: 1,
        isBeginnerDrone: 1,
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    return res.status(200).json({ success: true, data: products });
  } catch (err) {
    console.error('getProductFlags error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch product flags' });
  }
};

/**
 * PATCH /api/v1/admin/homepage/product-flags/:id
 * Body: { flag: 'isNewArrival', value: true/false }
 * Toggle a single homepage flag on a drone product.
 */
const updateProductFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag, value } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    if (!VALID_FLAGS.includes(flag)) {
      return res.status(400).json({
        success: false,
        message: `Invalid flag. Must be one of: ${VALID_FLAGS.join(', ')}`,
      });
    }

    const db = await getDB();
    const result = await db
      .collection('Drones')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { [flag]: Boolean(value), updatedAt: new Date() } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({
      success: true,
      data: { _id: id, [flag]: Boolean(value) },
      message: `${flag} updated successfully`,
    });
  } catch (err) {
    console.error('updateProductFlag error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update product flag' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HONORABLE CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/homepage/honorable-customers
 * Returns all honorable customers, sorted by createdAt desc.
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
    console.error('getHonorableCustomers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch honorable customers' });
  }
};

/**
 * POST /api/v1/admin/homepage/honorable-customers
 * Body: { name, date, description, image (base64) }
 */
const createHonorableCustomer = async (req, res) => {
  try {
    const { name, date, description, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Purchase description is required' });
    }

    let uploadedImage = null;
    if (image) {
      uploadedImage = await uploadToCloudinary(image, 'drones/customers');
    }

    const db = await getDB();
    const newCustomer = {
      name: name.trim(),
      date: date || new Date().toISOString().split('T')[0],
      description: description.trim(),
      image: uploadedImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('honorableCustomers').insertOne(newCustomer);

    return res.status(201).json({
      success: true,
      data: { _id: result.insertedId, ...newCustomer },
      message: 'Honorable customer created successfully',
    });
  } catch (err) {
    console.error('createHonorableCustomer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create honorable customer' });
  }
};

/**
 * PUT /api/v1/admin/homepage/honorable-customers/:id
 * Body: { name, date, description, image? (base64 or existing URL) }
 */
const updateHonorableCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const { name, date, description, image } = req.body;
    const db = await getDB();
    const collection = db.collection('honorableCustomers');

    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Only re-upload if a new base64 image is provided
    let updatedImage = existing.image;
    if (image && image.startsWith('data:')) {
      updatedImage = await uploadToCloudinary(image, 'drones/customers');
    } else if (image && image.startsWith('http')) {
      updatedImage = image; // keep existing URL
    }

    const updates = {
      ...(name && { name: name.trim() }),
      ...(date && { date }),
      ...(description && { description: description.trim() }),
      image: updatedImage,
      updatedAt: new Date(),
    };

    await collection.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    const updated = await collection.findOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Customer updated successfully',
    });
  } catch (err) {
    console.error('updateHonorableCustomer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update honorable customer' });
  }
};

/**
 * DELETE /api/v1/admin/homepage/honorable-customers/:id
 */
const deleteHonorableCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID' });
    }

    const db = await getDB();
    const result = await db
      .collection('honorableCustomers')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    return res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('deleteHonorableCustomer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete honorable customer' });
  }
};

module.exports = {
  getFeaturedCategories,
  toggleFeaturedCategory,
  getProductFlags,
  updateProductFlag,
  getHonorableCustomers,
  createHonorableCustomer,
  updateHonorableCustomer,
  deleteHonorableCustomer,
};
