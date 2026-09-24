const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { ok, fail, serverError } = require('../utils/response');

const getUserId = (req) => req.user && (req.user.userId || req.user._id);

// --- CART CONTROLLERS ---

exports.getCart = async (req, res) => {
  try {
    const userIdValue = getUserId(req);
    if (!userIdValue) {
      return fail(res, 'Unauthorized access', 401);
    }

    const db = getDB();
    const userId = new ObjectId(userIdValue);

    const result = await db.collection('users').aggregate([
      { $match: { _id: userId } },
      { $unwind: { path: '$cart', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'Drones',
          localField: 'cart.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $lookup: {
          from: 'handhelds',
          localField: 'cart.productId',
          foreignField: '_id',
          as: 'handheldDetails'
        }
      },
      { $set: { productDetails: { $concatArrays: ['$productDetails', '$handheldDetails'] } } },
      { $unwind: { path: '$productDetails' } },
      {
        $group: {
          _id: '$_id',
          cart: {
            $push: {
              $cond: {
                if: { $ifNull: ['$cart.productId', false] },
                then: {
                  product: '$productDetails',
                  quantity: '$cart.quantity'
                },
                else: '$$REMOVE'
              }
            }
          }
        }
      }
    ]).toArray();

    const userCart = result.length > 0 ? result[0].cart : [];
    return ok(res, userCart, 'Cart fetched successfully');
  } catch (err) {
    return serverError(res, err);
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userIdValue = getUserId(req);
    if (!userIdValue) return fail(res, 'Unauthorized access', 401);

    const db = getDB();
    const userId = new ObjectId(userIdValue);
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) return fail(res, 'Product ID is required', 400);
    const prodId = new ObjectId(productId);

    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) return fail(res, 'User not found', 404);

    await db.collection('users').updateOne(
      { _id: userId, cart: { $not: { $elemMatch: { productId: prodId } } } },
      { $push: { cart: { productId: prodId, quantity: Number(quantity) } } }
    );

    return exports.getCart(req, res);
  } catch (err) {
    return serverError(res, err);
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const userIdValue = getUserId(req);
    if (!userIdValue) return fail(res, 'Unauthorized access', 401);

    const db = getDB();
    const userId = new ObjectId(userIdValue);
    const { productId } = req.params;
    const prodId = new ObjectId(productId);

    await db.collection('users').updateOne(
      { _id: userId },
      { $pull: { cart: { productId: prodId } } }
    );

    return exports.getCart(req, res);
  } catch (err) {
    return serverError(res, err);
  }
};


// --- WISHLIST CONTROLLERS ---

exports.getWishlist = async (req, res) => {
  try {
    const userIdValue = getUserId(req);
    if (!userIdValue) return fail(res, 'Unauthorized access', 401);

    const db = getDB();
    const userId = new ObjectId(userIdValue);

    const result = await db.collection('users').aggregate([
      { $match: { _id: userId } },
      { $unwind: { path: '$wishlist', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'Drones',
          localField: 'wishlist.productId',
          foreignField: '_id',
          as: 'productDetails',
          pipeline: [{ $set: { productType: 'drones' } }]
        }
      },
      {
        $lookup: {
          from: 'handhelds',
          localField: 'wishlist.productId',
          foreignField: '_id',
          as: 'handheldDetails',
          pipeline: [{ $set: { productType: 'handhelds' } }]
        }
      },
      { $set: { productDetails: { $concatArrays: ['$productDetails', '$handheldDetails'] } } },
      { $unwind: { path: '$productDetails' } },
      {
        $group: {
          _id: '$_id',
          wishlist: {
            $push: {
              $cond: {
                if: { $ifNull: ['$wishlist.productId', false] },
                then: { product: '$productDetails' },
                else: '$$REMOVE'
              }
            }
          }
        }
      }
    ]).toArray();

    const userWishlist = result.length > 0 ? result[0].wishlist : [];
    return ok(res, userWishlist, 'Wishlist fetched successfully');
  } catch (err) {
    return serverError(res, err);
  }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const userIdValue = getUserId(req);
    if (!userIdValue) return fail(res, 'Unauthorized access', 401);

    const db = getDB();
    const userId = new ObjectId(userIdValue);
    const { productId } = req.body;
    
    if (!productId) return fail(res, 'Product ID is required', 400);
    const prodId = new ObjectId(productId);

    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) return fail(res, 'User not found', 404);

    await db.collection('users').updateOne(
      { _id: userId, wishlist: { $not: { $elemMatch: { productId: prodId } } } },
      { $push: { wishlist: { productId: prodId } } }
    );

    return exports.getWishlist(req, res);
  } catch (err) {
    return serverError(res, err);
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const userIdValue = getUserId(req);
    if (!userIdValue) return fail(res, 'Unauthorized access', 401);

    const db = getDB();
    const userId = new ObjectId(userIdValue);
    const prodId = new ObjectId(req.params.productId);

    await db.collection('users').updateOne(
      { _id: userId },
      { $pull: { wishlist: { productId: prodId } } }
    );

    return exports.getWishlist(req, res);
  } catch (err) {
    return serverError(res, err);
  }
};

exports.updateCartQuantity = async (req, res) => {
  try {
    const userIdValue = getUserId(req);
    if (!userIdValue) return fail(res, 'Unauthorized access', 401);

    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return fail(res, 'Quantity must be a positive integer', 400);
    }

    const db = getDB();
    const userId = new ObjectId(userIdValue);
    const prodId = new ObjectId(req.params.productId);

    await db.collection('users').updateOne(
      { _id: userId, 'cart.productId': prodId },
      { $set: { 'cart.$.quantity': quantity } }
    );

    return exports.getCart(req, res);
  } catch (err) {
    return serverError(res, err);
  }
};