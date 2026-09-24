'use strict';

/**
 * Public banner controller — no auth required.
 *
 * GET /api/client/banners?section=products|maintenance|contact
 *
 * Returns only the banner(s) that have isActive=true for the requested section.
 * "section" maps to the `section` field stored on the banner document.
 *
 * If ?section= is omitted, all isActive banners are returned (useful for debugging).
 */

const { getDB } = require('../../config/db');
const { ok, serverError } = require('../../utils/response');

const getPublicBanners = async (req, res) => {
  try {
    const db = await getDB();

    const filter = { isActive: true };
    if (req.query.section) {
      filter.section = String(req.query.section).trim().toLowerCase();
    }

    const items = await db
      .collection('banners')
      .find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .toArray();

    return ok(res, { items }, 'Banners fetched successfully.');
  } catch (error) {
    return serverError(res, error);
  }
};

module.exports = { getPublicBanners };
