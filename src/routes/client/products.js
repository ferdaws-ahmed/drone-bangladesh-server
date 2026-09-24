const express = require('express');
const { getAllProducts } = require('../../controllers/client/allProductsController');

const router = express.Router();

router.get('/', getAllProducts);

module.exports = router;
