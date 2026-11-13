import express from 'express';
import {
  getCategories,
  searchFoods,
  getFoodById
} from '../controllers/foodLogController.js';

const router = express.Router();

router.get('/categories', getCategories);
router.get('/search', searchFoods);
router.get('/:id', getFoodById);

export default router;
