const { getDB } = require('../config/db');
const { ok, created, fail, serverError } = require('../utils/response');
const { ObjectId } = require('mongodb');

const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};

    if (!name || !email || !message) {
      return fail(res, 'Name, email, and message are required.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(res, 'Please provide a valid email address.', 400);
    }

    const db = await getDB();
    const submission = {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : '',
      subject: subject ? String(subject).trim() : 'General Inquiry',
      message: String(message).trim(),
      status: 'New',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('contact_submissions').insertOne(submission);

    return created(res, {
      _id: result.insertedId,
      name: submission.name,
      subject: submission.subject,
      status: submission.status,
      createdAt: submission.createdAt,
    }, 'Your message has been sent successfully! We will get back to you soon.');
  } catch (error) {
    return serverError(res, error);
  }
};

const normalizeSubmission = (doc = {}) => ({
  ...doc,
  _id: doc._id,
  name: doc.name || 'Unknown',
  email: doc.email || '',
  phone: doc.phone || '',
  subject: doc.subject || 'General Inquiry',
  message: doc.message || '',
  status: doc.status || 'New',
  createdAt: doc.createdAt || doc.created_at || new Date().toISOString(),
  updatedAt: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || new Date().toISOString(),
});

const getContactSubmissions = async (req, res) => {
  try {
    const db = await getDB();
    const { status, search, page = 1, limit = 20 } = req.query || {};
    const validCollections = ['contact_submissions', 'messages'];

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      const s = new RegExp(String(search), 'i');
      filter.$or = [{ name: s }, { email: s }, { subject: s }, { message: s }];
    }

    let selectedCollectionName = null;
    let selectedCollection = null;
    for (const collectionName of validCollections) {
      const candidate = db.collection(collectionName);
      const count = await candidate.countDocuments(filter);
      if (count > 0 || collectionName === 'contact_submissions') {
        selectedCollectionName = collectionName;
        selectedCollection = candidate;
        break;
      }
    }

    if (!selectedCollection) {
      selectedCollection = db.collection('contact_submissions');
      selectedCollectionName = 'contact_submissions';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const limitNumber = Number(limit) || 20;

    const [rawSubmissions, total] = await Promise.all([
      selectedCollection
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNumber)
        .toArray(),
      selectedCollection.countDocuments(filter),
    ]);

    const submissions = rawSubmissions.map(normalizeSubmission);

    return ok(res, {
      submissions,
      pagination: {
        page: Number(page),
        limit: limitNumber,
        total,
        pages: Math.max(1, Math.ceil(total / limitNumber)) || 0,
      },
      collection: selectedCollectionName,
    }, 'Contact submissions fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const validStatuses = ['New', 'Read', 'Replied', 'Resolved', 'Archived'];

    if (!validStatuses.includes(status)) {
      return fail(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}.`, 400);
    }

    const db = await getDB();

    const result = await db.collection('contact_submissions').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return fail(res, 'Contact submission not found.', 404);
    }

    return ok(res, { status, updatedAt: new Date() }, 'Submission status updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

const getSubmissionStats = async (req, res) => {
  try {
    const db = await getDB();
    const [
      total,
      newCount,
      readCount,
      repliedCount,
      resolvedCount,
    ] = await Promise.all([
      db.collection('contact_submissions').countDocuments(),
      db.collection('contact_submissions').countDocuments({ status: 'New' }),
      db.collection('contact_submissions').countDocuments({ status: 'Read' }),
      db.collection('contact_submissions').countDocuments({ status: 'Replied' }),
      db.collection('contact_submissions').countDocuments({ status: 'Resolved' }),
    ]);

    return ok(res, {
      total,
      byStatus: {
        New: newCount,
        Read: readCount,
        Replied: repliedCount,
        Resolved: resolvedCount,
      },
    }, 'Submission stats fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  submitContactForm,
  getContactSubmissions,
  updateSubmissionStatus,
  getSubmissionStats,
};
