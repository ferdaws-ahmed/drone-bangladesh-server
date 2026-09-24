const { getDB } = require('../../config/db');
const { ok, created, notFound, fail, serverError } = require('../../utils/response');

const getSettings = async (req, res) => {
  try {
    const db = await getDB();
    const settings = await db.collection('settings').findOne({ key: 'store' }) || {
      key: 'store',
      storeName: '',
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
      storeName: payload.storeName || '',
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

    const [
      droneCount,
      handheldCount,
      orderCount,
      pendingOrderCount,
      customerCount,
      maintenancePending,
      bannerCount,
    ] = await Promise.all([
      db.collection('Drones').countDocuments(),
      db.collection('handhelds').countDocuments(),
      db.collection('orders').countDocuments(),
      db.collection('orders').countDocuments({
        deliveryStatus: { $in: ['Processing', 'Shipped', 'Out For Delivery'] },
      }),
      db.collection('users').countDocuments({ role: 'customer' }),
      db.collection('maintenance').countDocuments({
        status: { $in: ['Pending', 'In Progress', 'Awaiting Parts'] },
      }),
      db.collection('banners').countDocuments({ isActive: true }),
    ]);

    const productCount = droneCount + handheldCount;

    return ok(res, {
      productCount,
      orderCount,
      pendingOrderCount,
      customerCount,
      maintenanceCount: maintenancePending,
      bannerCount,
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
