import express from 'express';
import {
  getPreMadePlans,
  createPreMadePlan,
  deletePreMadePlan
} from '../controllers/preMadePlanController.js';

const router = express.Router();

router.get('/premade', getPreMadePlans);
router.post('/premade', createPreMadePlan);
router.delete('/premade/:id', deletePreMadePlan);

export default router;
