import express from 'express';
import { 
  registerUser, 
  loginUser, 
  changePassword,
  forgotPassword,
  verifyOTP,
  resetPassword,
  googleAuth,
  googleRegister
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/google', googleAuth);
router.post('/google/register', googleRegister);

export default router;
