import express from 'express';
import { getMyGym, getGymById, getGymsList, getMyGymData } from '../controllers/gymController.js';

const router = express.Router();

router.route('/my-gym/:userId').get(getMyGym);
router.route('/my-gym-data/:userName').get(getMyGymData);
router.route('/:id').get(getGymById);
// Public list of approved gyms
router.route('/').get(getGymsList);

export default router;
