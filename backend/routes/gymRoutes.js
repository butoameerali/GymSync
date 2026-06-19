import express from 'express';
import { getMyGym } from '../controllers/gymController.js';

const router = express.Router();

router.route('/my-gym/:userId').get(getMyGym);

export default router;
