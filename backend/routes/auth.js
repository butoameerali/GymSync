import express from 'express';
import { 
  registerUser, 
  loginUser, 
  changePassword,
  forgotPassword,
  verifyOTP,
  resetPassword,
  googleAuth,
  googleRegister,
  getMe,
  verifyLoginOtp,
  resendLoginOtp,
  restoreSelfAccount,
  verifySignupOtp,
  resendSignupOtp,
  getMySessions,
  revokeSession,
  revokeOtherSessions,
  updateTwoFactor
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();

// Strict endpoint rate limiters (protecting against IP-based brute-force & OTP flooding)
const loginLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 15, scope: 'login' });
const otpLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: 15, scope: 'otp' });

router.get('/me', protect, getMe);
router.post('/register', registerUser);
router.post('/verify-signup-otp', otpLimiter, verifySignupOtp);
router.post('/resend-signup-otp', otpLimiter, resendSignupOtp);
router.post('/login', loginLimiter, loginUser);
router.post('/restore-self', loginLimiter, restoreSelfAccount);
router.post('/verify-login-otp', otpLimiter, verifyLoginOtp);
router.post('/resend-login-otp', otpLimiter, resendLoginOtp);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/google', googleAuth);
router.post('/google/register', googleRegister);

// Session Security & 2FA Management
router.get('/sessions', protect, getMySessions);
router.delete('/sessions/:id', protect, revokeSession);
router.post('/sessions/revoke-others', protect, revokeOtherSessions);
router.put('/two-factor', protect, updateTwoFactor);

export default router;
