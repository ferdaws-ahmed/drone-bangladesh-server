/**
 * Service Request controller — handles booking submissions from the public
 * frontend Maintenance page ("Schedule Service" form).
 *
 * Collection: service_requests
 *
 * Unlike the internal `maintenance` collection (used by admins to track repair
 * jobs in detail), service_requests are inbound leads from customers who want
 * to schedule a service appointment.
 */

'use strict';

const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { ok, created, notFound, fail, serverError } = require('../utils/response');

const ALLOWED_STATUSES = ['New', 'Contacted', 'Scheduled', 'Completed', 'Cancelled'];

const generateRequestId = () =>
  `#SR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

// ── POST /api/maintenance/service-requests  (public — no auth) ───────────────
const submitServiceRequest = async (req, res) => {
  try {
    const db = getDB();
    const {
      name,
      email,
      phone,
      droneModel,
      packageName,
      packageId,
      subject,
      serviceDetails,
      preferredDate,
      message,
    } = req.body || {};

    if (!name || !phone || !droneModel) {
      return fail(res, 'Name, phone number, and drone model are required.');
    }
    if (!packageName) {
      return fail(res, 'Please select a maintenance package.');
    }

    const doc = {
      requestId: generateRequestId(),
      customer: {
        name:  String(name).trim(),
        email: email ? String(email).trim() : null,
        phone: String(phone).trim(),
      },
      drone: { model: String(droneModel).trim() },
      package: {
        id:   packageId || null,
        name: String(packageName).trim(),
      },
      subject:        subject        ? String(subject).trim()        : '',
      serviceDetails: serviceDetails ? String(serviceDetails).trim() : '',
      preferredDate:  preferredDate  ? String(preferredDate).trim()  : '',
      message:        message        ? String(message).trim()        : '',
      status:    'New',
      adminNote: '',
      source:    'website',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('service_requests').insertOne(doc);
    return created(
      res,
      { insertedId: result.insertedId, requestId: doc.requestId },
      'Your service request has been submitted successfully. We will contact you shortly.'
    );
  } catch (error) {
    return serverError(res, error);
  }
};

// ── GET /api/v1/admin/maintenance/service-requests  (admin) ──────────────────
const listServiceRequests = async (req, res) => {
  try {
    const db = getDB();

    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    if (req.query.search) {
      const s = String(req.query.search).trim();
      filter.$or = [
        { requestId:          { $regex: s, $options: 'i' } },
        { 'customer.name':    { $regex: s, $options: 'i' } },
        { 'customer.phone':   { $regex: s, $options: 'i' } },
        { 'customer.email':   { $regex: s, $options: 'i' } },
        { 'drone.model':      { $regex: s, $options: 'i' } },
        { 'package.name':     { $regex: s, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      db.collection('service_requests')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('service_requests').countDocuments(filter),
    ]);

    // Counts per status for the stats bar
    const statusCounts = await db
      .collection('service_requests')
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .toArray();

    const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));

    return ok(res, {
      items,
      byStatus,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return serverError(res, error);
  }
};

// ── PATCH /api/v1/admin/maintenance/service-requests/:id  (admin) ────────────
const updateServiceRequest = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return fail(res, 'Invalid request ID.');

    const { status, adminNote } = req.body || {};
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return fail(res, `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`);
    }

    const $set = { updatedAt: new Date() };
    if (status)    $set.status    = status;
    if (adminNote !== undefined) $set.adminNote = String(adminNote).trim();

    const result = await db
      .collection('service_requests')
      .updateOne({ _id: new ObjectId(id) }, { $set });

    if (result.matchedCount === 0) return notFound(res, 'Service request not found.');

    const updated = await db.collection('service_requests').findOne({ _id: new ObjectId(id) });
    return ok(res, updated, 'Service request updated.');
  } catch (error) {
    return serverError(res, error);
  }
};

// ── DELETE /api/v1/admin/maintenance/service-requests/:id  (admin) ───────────
const deleteServiceRequest = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return fail(res, 'Invalid request ID.');

    const result = await db
      .collection('service_requests')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return notFound(res, 'Service request not found.');
    return ok(res, { deletedId: id }, 'Service request deleted.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  submitServiceRequest,
  listServiceRequests,
  updateServiceRequest,
  deleteServiceRequest,
  ALLOWED_STATUSES,
};
