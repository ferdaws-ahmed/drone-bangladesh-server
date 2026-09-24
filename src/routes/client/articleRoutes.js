const express = require('express');
const { listPublishedArticles, getPublishedArticle } = require('../../controllers/client/articleController');

const router = express.Router();

router.get('/', listPublishedArticles);
router.get('/:slug', getPublishedArticle);

module.exports = router;