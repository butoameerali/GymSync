import express from 'express';
import { getSuggestions } from '../controllers/suggestionController.js';

const router = express.Router();

router.route('/').get(getSuggestions);

export default router;
