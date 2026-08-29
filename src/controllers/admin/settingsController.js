const { getDB } = require('../../config/db');
const { ok, created, notFound, fail, serverError } = require('../../utils/response');

const getSettings = async (req, res) => {
  try {
    const db = await getDB();
    const settings = await db.collection('settings').findOne({ key: 'store' }) || {
      key: 'store',
      contact: {
        phone: '',
        email: '',
        address: '',
        mapLink: '',
      },
    };

    return ok(res, settings, 'Store settings fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const db = await getDB();
    const payload = req.body || {};

    const doc = {
      key: 'store',
      contact: {
        phone: payload.contact?.phone || '',
        email: payload.contact?.email || '',
        address: payload.contact?.address || '',
        mapLink: payload.contact?.mapLink || '',
      },
      updatedAt: new Date(),
    };

    const existing = await db.collection('settings').findOne({ key: 'store' });
    if (existing) {
      await db.collection('settings').updateOne({ key: 'store' }, { $set: doc });
      return ok(res, doc, 'Store settings updated successfully.');
    }

    const result = await db.collection('settings').insertOne(doc);
    return created(res, { insertedId: result.insertedId, settings: doc }, 'Store settings created successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const getAdminSummary = async (req, res) => {
  try {
    const db = await getDB();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      productCount,
      liveProductCount,
      lowStockCount,
      orderCount,
      pendingOrderCount,
      customerCount,
      maintenanceCount,
      maintenancePending,
      bannerCount,
      liveBanner,
      packageCount,
      orders30d,
    ] = await Promise.all([
      db.collection('products').countDocuments(),
      db.collection('products').countDocuments({ isLive: { $ne: false } }),
      db.collection('products').countDocuments({ stock: { $lte: 5 } }),
      db.collection('orders').countDocuments(),
      db.collection('orders').countDocuments({
        deliveryStatus: { $in: ['Processing', 'Shipped', 'Out For Delivery'] },
      }),
      db.collection('users').countDocuments({ role: 'customer' }),
      db.collection('maintenance').countDocuments(),
      db.collection('maintenance').countDocuments({
        status: { $in: ['Pending', 'In Progress', 'Awaiting Parts'] },
      }),
      db.collection('banners').countDocuments(),
      db.collection('banners').findOne({ isLive: true }, { projection: { _id: 1, title: 1, imageUrl: 1 } }),
      db.collection('maintenance_packages').countDocuments(),
      db.collection('orders')
        .aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$pricing.total' } } },
        ])
        .toArray(),
    ]);

    const last30Days = (orders30d && orders30d[0]) || { count: 0, revenue: 0 };

    return ok(res, {
      counts: {
        products: productCount,
        liveProducts: liveProductCount,
        lowStockProducts: lowStockCount,
        orders: orderCount,
        pendingOrders: pendingOrderCount,
        customers: customerCount,
        maintenanceTickets: maintenanceCount,
        maintenancePending,
        banners: bannerCount,
        packages: packageCount,
      },
      last30Days: {
        ordersCount: last30Days.count || 0,
        revenue: last30Days.revenue || 0,
      },
      liveBanner,
      generatedAt: new Date().toISOString(),
    }, 'Admin summary fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getAdminSummary,
};
