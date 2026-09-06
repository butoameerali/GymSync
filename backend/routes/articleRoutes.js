import express from 'express';
import { 
  getArticles, 
  createArticle, 
  updateArticle, 
  deleteArticle 
} from '../controllers/articleController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getArticles);
router.post('/', protect, authorizeRoles('FitnessInstructor', 'Admin', 'SuperAdmin'), createArticle);
router.put('/:id', protect, authorizeRoles('FitnessInstructor', 'Admin', 'SuperAdmin'), updateArticle);
router.delete('/:id', protect, authorizeRoles('FitnessInstructor', 'Admin', 'SuperAdmin'), deleteArticle);

export default router;
