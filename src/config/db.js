const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'drone_bangladesh';

let cachedClient = null;
let cachedDb = null;
let connectionPromise = null;

/**
 * Connect to MongoDB and cache the client connection.
 * @returns {Promise<import('mongodb').Db>}
 */
const connectDB = async () => {
  
  if (cachedDb && cachedClient) {
    return cachedDb;
  }

  
  if (connectionPromise) {
    return connectionPromise;
  }

  if (!MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not defined.');
  }

  connectionPromise = (async () => {
    try {
      const client = new MongoClient(MONGO_URI, {
        maxPoolSize: Number(process.env.MONGO_MAX_POOL) || 10,
        minPoolSize: 2, 
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
    } catch (error) {
      
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
};

const getDB = () => {
  if (!cachedDb) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return cachedDb;
};

module.exports = { connectDB, getDB };

