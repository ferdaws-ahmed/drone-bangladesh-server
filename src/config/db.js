const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'drone_bangladesh';

let cachedClient = null;
let cachedDb = null;
let connectionPromise = null;

/**
 * Lazily connect to MongoDB and cache the connection.
 * Optimized for serverless (Vercel) cold starts & concurrent invocations.
 * @returns {Promise<import('mongodb').Db>}
 */
const connectDB = async () => {
  if (cachedDb && cachedClient) {
    try {
      await cachedClient.db().command({ ping: 1 });
      return cachedDb;
    } catch {
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
    }
  }

  if (connectionPromise) return connectionPromise;

  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not defined.');
  }

  connectionPromise = (async () => {
    const client = new MongoClient(MONGO_URI, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL) || 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    await client.connect();
    const db = client.db(DB_NAME);

    cachedClient = client;
    cachedDb = db;

    console.log(`✅ MongoDB connected → ${DB_NAME}`);
    return db;
  })();

  return connectionPromise;
};

const getDB = async () => {
  if (!cachedDb) return connectDB();
  return cachedDb;
};

module.exports = { connectDB, getDB };
