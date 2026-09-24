/**
 * Admin controller for the Maintenance Page's dynamic content.
 *
 * Manages two independent MongoDB documents:
 *   maintenance_page_content  — banner image, hero heading/subheading, contact info
 *
 * Single-document pattern: we upsert a doc with key='maintenance_page'.
 */

'use strict';

const { getDB } = require('../../config/db');
const { ok, serverError } = require('../../utils/response');

const PAGE_CONTENT_KEY = 'maintenance_page';
const COLLECTION = 'maintenance_page_content';

const DEFAULT_CONTENT = {
  key: PAGE_CONTENT_KEY,
  bannerImageUrl: '',
  heading: 'Professional Drone Maintenance & Repair',
  subheading:
    'Keep your drone performing at its peak with our certified technicians. From firmware updates to full overhauls — we have you covered.',
  contactPhone: '+880 1317-768213',
  contactEmail: 'dronebangladesh567@gmail.com',
  contactAddress:
    'Level-1, Block-B, Shop-43, Bashundhara City Shopping Complex, Dhaka-1215',
  updatedAt: new Date(),
};

// ── GET public page content ──────────────────────────────────────────────────
const getPageContent = async (req, res) => {
  try {
    const db = getDB();
    const doc = await db.collection(COLLECTION).findOne({ key: PAGE_CONTENT_KEY });
    return ok(res, doc || DEFAULT_CONTENT, 'Page content fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

// ── PUT update page content (admin only) ────────────────────────────────────
const updatePageContent = async (req, res) => {
  try {
    const db = getDB();
    const body = req.body || {};

    const allowedFields = [
      'bannerImageUrl',
      'heading',
      'subheading',
      'contactPhone',
      'contactEmail',
      'contactAddress',
    ];

    const $set = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) $set[field] = String(body[field]).trim();
    }

    await db
      .collection(COLLECTION)
      .updateOne(
        { key: PAGE_CONTENT_KEY },
        { $set, $setOnInsert: { key: PAGE_CONTENT_KEY, createdAt: new Date() } },
        { upsert: true }
      );

    const updated = await db.collection(COLLECTION).findOne({ key: PAGE_CONTENT_KEY });
    return ok(res, updated, 'Page content updated successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = { getPageContent, updatePageContent };
