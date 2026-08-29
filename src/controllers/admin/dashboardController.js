const { getDB } = require('../../config/db');
const { ok, serverError } = require('../../utils/response');

const getDashboardStats = async (req, res) => {
  try {
    const db = await getDB();
    
    const [totalOrders, totalProducts, totalCustomers, totalRevenue] = await Promise.all([
      db.collection('orders').countDocuments(),
      db.collection('products').countDocuments(),
      db.collection('users').countDocuments({ role: 'user' }),
      db.collection('orders').aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).toArray()
    ]);

    return ok(res, {
      stats: {
        totalOrders,
        totalProducts,
        totalCustomers,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = { getDashboardStats };
