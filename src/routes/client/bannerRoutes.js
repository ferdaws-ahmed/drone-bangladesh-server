/**
 * Public (client-facing) banner route.
 * No auth required — used by the Next.js frontend via ISR fetch.
 *
 * GET /api/client/banners?section=products|maintenance|contact
 *   Returns the single isActive=true banner for the given section.
 *   If no section param is given, returns all active banners.
 */

const express = require('express');
const router  = express.Router();
const { getPublicBanners } = require('../../controllers/client/bannerController');

router.get('/', getPublicBanners);

module.exports = router;
