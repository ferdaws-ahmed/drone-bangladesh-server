const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./src/config/db');
const { serverError } = require('./src/utils/response');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost:\d+$/,
  /^https?:\/\/127\.0\.0\.1:\d+$/,
  /\.vercel\.app$/,
  /\.dronebangladesh\.com$/,
  'https://dronebangladesh.com',
  'https://www.dronebangladesh.com',
  'https://admin.dronebangladesh.com',
  ...envOrigins,
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || NODE_ENV === 'development') return cb(null, true);
      const allowed = ALLOWED_ORIGINS.some((rule) =>
        rule instanceof RegExp ? rule.test(origin) : rule === origin
      );
      return cb(null, allowed);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Drone Bangladesh API is live',
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/orders', require('./src/routes/orderRoutes'));
app.use('/api/maintenance', require('./src/routes/maintenanceRoutes'));

app.use('/api/v1/admin/auth', require('./src/routes/authRoutes'));
app.use('/api/v1/admin/orders', require('./src/routes/orderRoutes'));
app.use('/api/v1/admin/me', require('./src/routes/authRoutes'));

app.use('/api/v1/admin/products', require('./src/routes/admin/products'));
app.use('/api/v1/admin/cms', require('./src/routes/admin/cms'));
app.use('/api/v1/admin/settings', require('./src/routes/admin/settings'));
app.use('/api/v1/admin/packages', require('./src/routes/admin/packages'));

app.use('/api/v1/admin/categories', require('./src/routes/admin/categories'));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
  });
});

app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  return serverError(res, NODE_ENV !== 'production' ? err : null);
});

const startServer = async () => {
  await connectDB();
  return app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${NODE_ENV}]`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  });
};

const dbConnected = { done: false };
const ensureDB = async () => {
  if (dbConnected.done) return;
  await connectDB();
  dbConnected.done = true;
};

const handler = async (req, res) => {
  try {
    await ensureDB();
  } catch (err) {
    console.error('[Serverless] DB connect failed:', err.message || err);
    return res.status(503).json({ success: false, message: 'Service unavailable' });
  }
  return app(req, res);
};

if (require.main === module) {
  startServer();
}

module.exports = handler;
module.exports.default = handler;
module.exports.app = app;
module.exports.ensureDB = ensureDB;
