import User from '../models/User.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { protect } from '../middleware/authMiddleware.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

// Lazy Google OAuth client — instantiated only on first use, not at server startup
// This prevents the google-auth-library from making network calls during MongoDB init
let _googleClient = null;
const getGoogleClient = () => {
  if (!_googleClient) _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return _googleClient;
};

// In-memory OTP store (resets on server restart; use Redis in production)
export const otpStore = {};

// Email transporter
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate JWT
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};


const checkDBConnection = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is not connected. Please ensure internet access and check MongoDB Atlas status.');
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    checkDBConnection();
    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'User',
      recoveryEmail: normalizedEmail
    });

    if (user) {
      // Send Gmail verification notification
      try {
        await Notification.create({
          userId: user.name,
          type: 'gmail_verification',
          message: `Verify ${user.email} from your Profile settings to enable email recovery.`,
          link: '/profile'
        });
      } catch (nErr) { console.error('Notif error:', nErr.message); }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isGoogleApproved: user.isGoogleApproved,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    checkDBConnection();
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password for current user
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Send OTP to email for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: 'No account found with this email address.' });

    const otp = crypto.randomInt(100000, 999999).toString();

    try {
      const transporter = createTransporter();
      await transporter.verify();
      const delivery = await transporter.sendMail({
        from: `"GymSync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'GymSync — Password Reset OTP',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#f8fafc;padding:40px;border-radius:16px;border:1px solid #1e293b;">
            <h2 style="color:#3b82f6;margin-bottom:8px;">GymSync Password Reset</h2>
            <p style="color:#94a3b8;margin-bottom:24px;">You requested a password reset for your GymSync account.</p>
            <div style="background:#1e293b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
              <span style="font-size:2.5rem;font-weight:bold;color:#10b981;letter-spacing:8px;">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:0.85rem;">This OTP expires in <strong style="color:#f59e0b;">10 minutes</strong>. Do not share it with anyone.</p>
            <p style="color:#64748b;font-size:0.75rem;margin-top:16px;">If you did not request a reset, you can safely ignore this email.</p>
          </div>
        `
      });
      if (!delivery.messageId) throw new Error('The email provider did not accept the message.');
    } catch (eErr) {
      console.error('Password-reset email delivery failed:', eErr.message);
      return res.status(503).json({ message: 'We could not send the reset email. Please check the mail configuration and try again.' });
    }

    otpStore[normalizedEmail] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
    res.json({ message: 'OTP sent to your email address.' });
  } catch (error) {
    console.error('Email send error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  const record = otpStore[normalizedEmail];
  if (!record) return res.status(400).json({ message: 'No OTP requested for this email.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[normalizedEmail];
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== otp) return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });

  // Mark as verified (allow reset step)
  otpStore[normalizedEmail].verified = true;
  res.json({ message: 'OTP verified successfully.' });
};

// @desc    Reset password after OTP verification
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  const record = otpStore[normalizedEmail];
  if (!record || !record.verified) {
    return res.status(400).json({ message: 'OTP not verified. Please complete verification first.' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.password = newPassword;
    await user.save();
    delete otpStore[normalizedEmail];

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Google OAuth — login existing user OR signal new user needs registration
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'No Google credential provided.' });

  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { email, name, picture, sub: googleId } = ticket.getPayload();

    // --- Existing user: log them in directly ---
    const existing = await User.findOne({ email });
    if (existing) {
      // Sync profile picture
      if (picture && existing.profilePic !== picture) {
        existing.profilePic = picture;
        await existing.save();
      }
      return res.json({
        _id: existing._id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        token: generateToken(existing._id),
      });
    }

    // --- New user: return their Google info so frontend can ask for role ---
    return res.status(200).json({
      needsRegistration: true,
      googleData: {
        email,
        suggestedName: name || email.split('@')[0],
        picture
      }
    });
  } catch (error) {
    console.error('Google auth error:', error.message);
    // Return 401 only for actual token verification failures
    if (error.message?.includes('Token used too') || error.message?.includes('Invalid token')) {
      return res.status(401).json({ message: 'Google session expired. Please sign in again.' });
    }
    res.status(500).json({ message: 'Server error during Google sign-in. Please try again.' });
  }
};

// @desc    Complete Google registration with chosen role + display name
// @route   POST /api/auth/google/register
// @access  Public
export const googleRegister = async (req, res) => {
  const { email, displayName, role, picture } = req.body;

  if (!email || !displayName || !role) {
    return res.status(400).json({ message: 'Email, display name, and role are required.' });
  }

  try {
    // Double-check email isn't registered (race condition guard)
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'An account with this email already exists. Please log in instead.' });
    }

    // Map frontend role values to backend enum
    const roleMap = {
      user: 'User', gym_owner: 'GymOwner',
      fitness_instructor: 'FitnessInstructor', gym_trainer: 'GymTrainer'
    };
    const backendRole = roleMap[role] || 'User';

    const randomPwd = crypto.randomBytes(20).toString('hex');
    const user = await User.create({
      name: displayName,
      email,
      password: randomPwd,
      role: backendRole,
      profilePic: picture || ''
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: field === 'email' ? 'An account with this email already exists. Please log in instead.' : 'Unable to create this account.' });
    }
    res.status(500).json({ message: error.message });
  }
};
