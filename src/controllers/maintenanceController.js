const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { ok, created, notFound, fail, forbidden, serverError } = require('../utils/response');

const STATUSES = ['Pending', 'In Progress', 'Awaiting Parts', 'Ready', 'Delivered', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const SERVICES = [
  'Firmware Update',
  'Gimbal Calibration',
  'ESC Calibration',
  'IMU Calibration',
  'Battery Check',
  'Drone Repair',
  'Camera Repair',
  'Motor Replacement',
  'Propeller Replacement',
  'Shell/Frame Repair',
  'Water Damage Service',
  'General Maintenance',
];

const generateJobId = () => `#MNT-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;

const createMaintenance = async (req, res) => {
  try {
    const db = await getDB();
    const {
      customerName, customerEmail, customerPhone, droneModel, serialNumber,
      serviceType, description, priority, estimatedCost,
    } = req.body;

    if (!customerName || !customerPhone || !droneModel || !serviceType) {
      return fail(res, 'Customer name, phone, drone model and service type are required.');
    }
    if (priority && !PRIORITIES.includes(priority)) {
      return fail(res, `Invalid priority. Allowed: ${PRIORITIES.join(', ')}`);
    }
    if (serviceType && !SERVICES.includes(serviceType) && !req.body.customServiceType) {
      // allow free-form via customServiceType flag
    }

    const job = {
      jobId: generateJobId(),
      customer: {
        name: customerName,
        email: customerEmail || null,
        phone: customerPhone,
        address: req.body.address || null,
      },
      drone: {
        model: droneModel,
        serialNumber: serialNumber || null,
        purchaseDate: req.body.purchaseDate || null,
        underWarranty: Boolean(req.body.underWarranty),
      },
      service: {
        type: serviceType,
        description: description || '',
        priority: priority || 'Medium',
      },
      status: STATUSES.includes(req.body.status) ? req.body.status : 'Pending',
      pricing: {
        estimated: Number(estimatedCost) || null,
        parts: 0,
        labor: 0,
        total: Number(estimatedCost) || null,
        paid: 0,
      },
      timeline: {
        receivedAt: new Date(),
        estimatedDelivery: req.body.estimatedDelivery ? new Date(req.body.estimatedDelivery) : null,
      },
      technicianAssigned: req.body.technicianAssigned || null,
      internalNotes: req.body.internalNotes || '',
      userId: req.user ? req.user.userId : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('maintenance').insertOne(job);
    return created(
      res,
      { insertedId: result.insertedId, jobId: job.jobId },
      'Maintenance request submitted successfully.'
    );
  } catch (error) {
    return serverError(res, error);
  }
};

const getAllMaintenance = async (req, res) => {
  try {
    const db = await getDB();
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter['service.priority'] = req.query.priority;
    if (req.query.search) {
      const s = String(req.query.search).trim();
      filter.$or = [
        { jobId: { $regex: s, $options: 'i' } },
        { 'customer.name': { $regex: s, $options: 'i' } },
        { 'customer.phone': { $regex: s, $options: 'i' } },
        { 'drone.model': { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.collection('maintenance').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('maintenance').countDocuments(filter),
    ]);

    return ok(res, { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    return serverError(res, error);
  }
};

const getMaintenanceById = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return fail(res, 'Invalid maintenance ID format.');
    const job = await db.collection('maintenance').findOne({ _id: new ObjectId(id) });
    if (!job) return notFound(res, 'Maintenance job not found.');

    const isAdmin = req.user && req.user.role === 'admin';
    const isOwner = req.user && (
      req.user.userId === job.userId ||
      (job.customer && job.customer.email && req.user.email === job.customer.email)
    );
    if (!isAdmin && !isOwner) {
      return forbidden(res, 'Access denied. You do not own this maintenance job.');
    }

    return ok(res, job);
  } catch (error) {
    return serverError(res, error);
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return fail(res, 'Invalid maintenance ID format.');

    const { status, priority, estimatedCost, parts, labor, technicianAssigned, notes } = req.body;

    if (status && !STATUSES.includes(status)) {
      return fail(res, `Invalid status. Allowed: ${STATUSES.join(', ')}`);
    }

    const $set = { updatedAt: new Date() };
    if (status) {
      $set.status = status;
      if (status === 'Delivered') $set['timeline.deliveredAt'] = new Date();
      if (status === 'In Progress') $set['timeline.startedAt'] = new Date();
    }
    if (priority) $set['service.priority'] = priority;
    if (technicianAssigned) $set.technicianAssigned = technicianAssigned;
    if (notes) $set.internalNotes = notes;

    const pricingUpdates = {};
    if (estimatedCost !== undefined) pricingUpdates.estimated = Number(estimatedCost);
    if (parts !== undefined) pricingUpdates.parts = Number(parts);
    if (labor !== undefined) pricingUpdates.labor = Number(labor);
    if (Object.keys(pricingUpdates).length) {
      for (const k of Object.keys(pricingUpdates)) $set[`pricing.${k}`] = pricingUpdates[k];
      const currentTotal =
        (pricingUpdates.parts !== undefined ? pricingUpdates.parts : Number(req.body.existingParts || 0)) +
        (pricingUpdates.labor !== undefined ? pricingUpdates.labor : Number(req.body.existingLabor || 0));
      $set['pricing.total'] = currentTotal || pricingUpdates.estimated || $set['pricing.total'];
    }

    const result = await db.collection('maintenance').updateOne(
      { _id: new ObjectId(id) },
      { $set }
    );
    if (result.matchedCount === 0) return notFound(res, 'Maintenance job not found.');

    const updated = await db.collection('maintenance').findOne({ _id: new ObjectId(id) });
    return ok(res, updated, 'Maintenance job updated.');
  } catch (error) {
    return serverError(res, error);
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const db = await getDB();
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return fail(res, 'Invalid maintenance ID format.');
    const result = await db.collection('maintenance').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound(res, 'Maintenance job not found.');
    return ok(res, { deletedId: id }, 'Maintenance job deleted successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
  STATUSES,
  PRIORITIES,
  SERVICES,
};
