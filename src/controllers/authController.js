const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');
const { ok, created, conflict, unauthorized, notFound, serverError, fail } = require('../utils/response');

const TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 10;

const RESERVED_FIELDS = ['role', '_id', 'createdAt', 'updatedAt', 'isActive', 'permissions'];

const registerUser = async (req, res) => {
  try {
    const db = await getDB();
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return fail(res, 'Name, email and password are required.');
    }

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return conflict(res, 'User already exists with this email.');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role: 'customer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);
    return created(res, { insertedId: result.insertedId, role: 'customer' }, 'User registered successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const loginUser = async (req, res) => {
  try {
    const db = await getDB();
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, 'Email and password are required.');
    }

    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return unauthorized(res, 'Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return unauthorized(res, 'Invalid email or password.');
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    return ok(
      res,
      {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      'Login successful.'
    );
  } catch (error) {
    return serverError(res, error);
  }
};

const getCustomers = async (req, res) => {
  try {
    const db = await getDB();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = { role: 'customer' };
    if (req.query.search) {
      const s = String(req.query.search).trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      db.collection('users')
        .find(filter, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('users').countDocuments(filter),
    ]);

    return ok(res, { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    return serverError(res, error);
  }
};

const getMe = async (req, res) => {
  try {
    const db = await getDB();
    if (!req.user || !req.user.userId) return unauthorized(res, 'Not authenticated.');
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );
    if (!user) return notFound(res, 'User not found.');
    return ok(res, user);
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = { registerUser, loginUser, getCustomers, getMe };
