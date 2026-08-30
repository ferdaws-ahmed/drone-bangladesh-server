const { getDB } = require('../../config/db');
const { ok, serverError } = require('../../utils/response');

const getDashboardStats = async (req, res) => {
  try {
    const db = await getDB();
    
    // 🟢 রিয়েল-টাইম ডাটা দ্রুত পাওয়ার জন্য Optimized Parallel Queries
    const [totalOrders, totalProducts, totalCustomers, totalRevenue] = await Promise.all([
      db.collection('orders').estimatedDocumentCount(),
      db.collection('products').estimatedDocumentCount(),
      db.collection('users').countDocuments({ role: 'user' }),
      db.collection('orders').aggregate([
        { $match: { status: 'completed' } },
        { $project: { totalAmount: 1 } },
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