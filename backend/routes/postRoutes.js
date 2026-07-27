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

const router = express.Router();

router.route('/')
  .get(getPosts)
  .post(upload.single('media'), createPost);

router.route('/:id')
  .delete(deletePost);

router.route('/:id/like')
  .put(toggleLike);

router.route('/:id/report')
  .post(reportPost);

router.route('/:id/comment')
  .post(addComment);

router.route('/:id/comment/:commentId/reply')
  .post(addReply);

router.route('/:id/comment/:commentId/reply/:replyId')
  .put(editReply)
  .delete(deleteReply);

export default router;
