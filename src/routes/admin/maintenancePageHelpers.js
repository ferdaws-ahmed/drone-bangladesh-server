/**
 * Thin re-export so maintenanceRoutes.js (public router) can access
 * getPageContent without creating a circular require.
 */
'use strict';

const { getPageContent, updatePageContent } = require('../../controllers/admin/maintenancePageController');

module.exports = { getPageContent, updatePageContent };
