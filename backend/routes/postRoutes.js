import express from 'express';
import { 
  getPosts, 
  getPostById,
  createPost, 
  toggleLike, 
  addComment, 
  addReply, 
  deletePost, 
  deleteReply, 
  editReply,
  reportPost,
  submitPostAppeal,
  getMyModeratedPosts
} from '../controllers/postController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getPosts)
  .post(protect, upload.single('media'), createPost);

router.get('/my-moderated', protect, getMyModeratedPosts);

router.route('/:id/appeal')
  .put(protect, submitPostAppeal);

router.route('/:id')
  .get(getPostById)
  .delete(protect, deletePost);

router.route('/:id/like')
  .put(protect, toggleLike)
  .post(protect, toggleLike);

router.route('/:id/report')
  .post(protect, reportPost);

router.route('/:id/comment')
  .post(protect, addComment);
router.route('/:id/comments')
  .post(protect, addComment);

router.route('/:id/comment/:commentId/reply')
  .post(protect, addReply);
router.route('/:id/comments/:commentId/reply')
  .post(protect, addReply);
router.route('/:id/comments/:commentId/replies')
  .post(protect, addReply);

router.route('/:id/comment/:commentId/reply/:replyId')
  .put(protect, editReply)
  .delete(protect, deleteReply);
router.route('/:id/comments/:commentId/reply/:replyId')
  .put(protect, editReply)
  .delete(protect, deleteReply);
router.route('/:id/comments/:commentId/replies/:replyId')
  .put(protect, editReply)
  .delete(protect, deleteReply);

export default router;
