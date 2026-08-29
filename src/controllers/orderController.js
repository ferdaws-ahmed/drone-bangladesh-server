const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { ok, created, notFound, fail, serverError } = require('../utils/response');

const DELIVERY_STATUSES = ['Processing', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Partial', 'Refunded'];

const generateOrderId = () => `#ORD-${Date.now().toString().slice(-5)}-${Math.floor(1000 + Math.random() * 9000)}`;

const createOrder = async (req, res) => {
  try {
    const db = await getDB();
    const {
      items, customerInfo, shippingAddress, subtotal, shipping, tax, discount, total,
      paymentMethod, notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return fail(res, 'At least one order item is required.');
    }
    if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      return fail(res, 'Customer name, email and phone are required.');
    }
    if (total == null) {
      return fail(res, 'Order total is required.');
    }

    const order = {
      orderId: generateOrderId(),
      items: items.map((it) => ({
        productId: it.productId,
        name: it.name,
        sku: it.sku || null,
        image: it.image || null,
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
      })),
      customerInfo: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
      },
      shippingAddress: shippingAddress || null,
      billingAddress: req.body.billingAddress || shippingAddress || null,
      pricing: {
        subtotal: Number(subtotal) || Number(total),
        shipping: Number(shipping) || 0,
        tax: Number(tax) || 0,
        discount: Number(discount) || 0,
        total: Number(total),
      },
      paymentMethod: paymentMethod || 'Cash on Delivery',
      paymentStatus: PAYMENT_STATUSES.includes(req.body.paymentStatus) ? req.body.paymentStatus : 'Pending',
      deliveryStatus: DELIVERY_STATUSES.includes(req.body.deliveryStatus) ? req.body.deliveryStatus : 'Processing',
      notes: notes || '',
      userId: req.user ? req.user.userId : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('orders').insertOne(order);
    return created(
      res,
      { insertedId: result.insertedId, orderId: order.orderId },
      'Order placed successfully.'
    );
  } catch (error) {
    return serverError(res, error);
  }
};

const getAllOrders = async (req, res) => {
  try {
    const db = await getDB();
    const filter = {};

    if (req.query.deliveryStatus) filter.deliveryStatus = req.query.deliveryStatus;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.search) {
      const s = String(req.query.search).trim();
      filter.$or = [
        { orderId: { $regex: s, $options: 'i' } },
        { 'customerInfo.name': { $regex: s, $options: 'i' } },
        { 'customerInfo.email': { $regex: s, $options: 'i' } },
        { 'customerInfo.phone': { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      db.collection('orders').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('orders').countDocuments(filter),
    ]);

    return ok(res, { items: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    return serverError(res, error);
  }
};

const getMyOrders = async (req, res) => {
  try {
    const db = await getDB();
    if (!req.user || !req.user.userId) {
      return fail(res, 'User not authenticated.');
    }

    const email = req.user.email;
    const userId = req.user.userId;

    const filter = {
      $or: [
        { userId },
        { 'customerInfo.email': email },
      ],
    };

    const orders = await db.collection('orders')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return ok(res, orders, `${orders.length} order(s) found.`);
  } catch (error) {
    return serverError(res, error);
  }
};

const getOrderById = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid order ID format.');

    const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });
    if (!order) return notFound(res, 'Order not found.');
    return ok(res, order);
  } catch (error) {
    return serverError(res, error);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    const { deliveryStatus, paymentStatus, trackingNumber, courier } = req.body;

    if (!ObjectId.isValid(id)) return fail(res, 'Invalid order ID format.');

    const $set = { updatedAt: new Date() };
    if (deliveryStatus) {
      if (!DELIVERY_STATUSES.includes(deliveryStatus)) {
        return fail(res, `Invalid deliveryStatus. Allowed: ${DELIVERY_STATUSES.join(', ')}`);
      }
      $set.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'Delivered') $set.deliveredAt = new Date();
    }
    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return fail(res, `Invalid paymentStatus. Allowed: ${PAYMENT_STATUSES.join(', ')}`);
      }
      $set.paymentStatus = paymentStatus;
      if (paymentStatus === 'Paid') $set.paidAt = new Date();
    }
    if (trackingNumber !== undefined) $set.trackingNumber = trackingNumber || null;
    if (courier !== undefined) $set.courier = courier || null;

    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(id) },
      { $set }
    );

    if (result.matchedCount === 0) return notFound(res, 'Order not found.');
    const updated = await db.collection('orders').findOne({ _id: new ObjectId(id) });
    return ok(res, updated, 'Order status updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const db = await getDB();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      totalMaintenance,
      orders,
    ] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('users').countDocuments({ role: 'customer' }),
      db.collection('maintenance').countDocuments(),
      db.collection('orders').find({ createdAt: { $gte: thirtyDaysAgo } }).toArray(),
    ]);

    const revenue = orders.reduce((sum, o) => {
      if (o.paymentStatus === 'Paid' || o.deliveryStatus === 'Delivered') {
        return sum + (o.pricing ? Number(o.pricing.total) || 0 : Number(o.total) || 0);
      }
      return sum;
    }, 0);

    const pendingOrders = orders.filter((o) => o.deliveryStatus === 'Processing' || o.deliveryStatus === 'Shipped').length;
    const maintenancePending = await db.collection('maintenance').countDocuments({
      status: { $in: ['Pending', 'In Progress'] },
    });

    return ok(res, {
      totalProducts,
      totalOrders,
      totalCustomers,
      totalMaintenance,
      totalRevenue: revenue,
      pendingOrders,
      maintenancePending,
      last30Days: {
        ordersCount: orders.length,
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getDashboardStats,
};
