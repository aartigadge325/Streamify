const express = require('express');
const {
  createVideo, listPublicVideos, listMyVideos, getVideo, updateVideo, deleteVideo
} = require('../controllers/video.controller');
const { authenticate } = require('../middleware/authenticate');
const { receiveVideo } = require('../middleware/videoUpload');
const { requireCloudinary } = require('../config/cloudinary');
const router = express.Router();

router.get('/', listPublicVideos);
router.get('/mine', authenticate, listMyVideos);
router.post('/', authenticate, requireCloudinary, receiveVideo, createVideo);
router.get('/:videoId', getVideo);
router.patch('/:videoId', authenticate, updateVideo);
router.delete('/:videoId', authenticate, deleteVideo);

module.exports = router;
