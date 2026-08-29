const express = require('express');
const router = express.Router();
const {
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  setLiveBanner,
} = require('../../controllers/admin/cmsController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.get('/articles', verifyToken, verifyAdmin, listArticles);
router.post('/articles', verifyToken, verifyAdmin, createArticle);
router.put('/articles/:id', verifyToken, verifyAdmin, updateArticle);
router.delete('/articles/:id', verifyToken, verifyAdmin, deleteArticle);

router.get('/banners', verifyToken, verifyAdmin, listBanners);
router.post('/banners', verifyToken, verifyAdmin, createBanner);
router.put('/banners/:id', verifyToken, verifyAdmin, updateBanner);
router.delete('/banners/:id', verifyToken, verifyAdmin, deleteBanner);
router.patch('/banners/:id/live', verifyToken, verifyAdmin, setLiveBanner);

module.exports = router;
