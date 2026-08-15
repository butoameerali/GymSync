import express from 'express';
import { 
  getPosts, 
  createPost, 
  toggleLike, 
  addComment, 
  addReply, 
  deletePost, 
  deleteReply, 
  editReply,
  reportPost
} from '../controllers/postController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getPosts)
  .post(protect, upload.single('media'), createPost);

router.route('/:id')
  .delete(protect, deletePost);

router.route('/:id/like')
  .put(protect, toggleLike);

router.route('/:id/report')
  .post(protect, reportPost);

router.route('/:id/comment')
  .post(protect, addComment);

router.route('/:id/comment/:commentId/reply')
  .post(addReply);

router.route('/:id/comment/:commentId/reply/:replyId')
  .put(editReply)
  .delete(deleteReply);

export default router;
