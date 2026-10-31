import express from 'express';
import {
  getSuggestions,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion
} from '../controllers/suggestionController.js';
import { protect, optionalProtect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(optionalProtect, getSuggestions)
  .post(protect, authorizeRoles('Admin', 'SuperAdmin'), createSuggestion);

router.route('/:id')
  .put(protect, authorizeRoles('Admin', 'SuperAdmin'), updateSuggestion)
  .delete(protect, authorizeRoles('Admin', 'SuperAdmin'), deleteSuggestion);

export default router;
