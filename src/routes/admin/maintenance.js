/**
 * Admin routes for the Maintenance section:
 *   - Page content (banner, hero text, contact info)
 *   - Service requests (booking leads from customers)
 *
 * Maintenance packages are on a separate route: /api/v1/admin/packages
 */

'use strict';

const express = require('express');
const router  = express.Router();

const { getPageContent, updatePageContent }        = require('../../controllers/admin/maintenancePageController');
const {
  listServiceRequests,
  updateServiceRequest,
  deleteServiceRequest,
}                                                   = require('../../controllers/serviceRequestController');
const { verifyToken, verifyAdmin }                  = require('../../middleware/authMiddleware');

// ── Page content ─────────────────────────────────────────────────────────────
router.get( '/page-content', verifyToken, verifyAdmin, getPageContent);
router.put( '/page-content', verifyToken, verifyAdmin, updatePageContent);

// ── Service requests ─────────────────────────────────────────────────────────
router.get(    '/service-requests',     verifyToken, verifyAdmin, listServiceRequests);
router.patch(  '/service-requests/:id', verifyToken, verifyAdmin, updateServiceRequest);
router.delete( '/service-requests/:id', verifyToken, verifyAdmin, deleteServiceRequest);

module.exports = router;
