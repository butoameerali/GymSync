import User from '../models/User.js';
import Notification from '../models/Notification.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

// Email transporter
const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate JWT
const generateToken = (id, expiresIn = '30d') => {
  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is missing.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn,
  });
};


import connectDB from '../config/db.js';

const checkDBConnection = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
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
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    await checkDBConnection();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Reserved identities used by the chat system for virtual contacts (no User document
    // backs these names). Letting a real account claim one would let it impersonate,
    // or be confused with, the AI Trainer / Gym Support conversation threads.
    const RESERVED_NAMES = ['ai trainer', 'gym support'];
    if (RESERVED_NAMES.includes(trimmedName.toLowerCase())) {
      return res.status(400).json({ message: 'This name is reserved. Please choose a different name.' });
    }

    // Case-insensitive uniqueness check via collation, matching the unique index on
    // User.name — avoids building a RegExp out of raw user input (regex-injection/ReDoS risk).
    const nameExists = await User.findOne({ name: trimmedName })
      .collation({ locale: 'en', strength: 2 });
    if (nameExists) {
      return res.status(400).json({ message: 'Username is already taken. Please choose a different name.' });
    }

    const ALLOWED_SELF_ROLES = ['User', 'GymOwner'];
    const PRIVILEGED_ROLES = ['Admin', 'SuperAdmin', 'ComplaintModerator', 'FitnessInstructor', 'GymTrainer', 'StoreManager'];

    let targetRole = role || 'User';
    if (PRIVILEGED_ROLES.map(r => r.toLowerCase()).includes(targetRole.toLowerCase())) {
      return res.status(403).json({ message: 'Privileged staff and administrative roles cannot be self-registered.' });
    }

    if (!ALLOWED_SELF_ROLES.map(r => r.toLowerCase()).includes(targetRole.toLowerCase())) {
      targetRole = 'User';
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: targetRole,
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
    console.error('Registration error:', error);
    res.status(500).json({ message: 'An internal error occurred during registration. Please try again later.' });
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
    await checkDBConnection();
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is suspended / banned (with automatic timed ban expiration)
    if (user.isBanned) {
      if (user.bannedUntil && new Date(user.bannedUntil).getTime() <= Date.now()) {
        // Ban expired! Automatically lift the ban
        user.isBanned = false;
        user.bannedUntil = null;
        user.banReason = '';
        user.accountStatus = user.isDeleted ? 'Deleted' : (user.isDeactivated ? 'Deactivated' : 'Active');
        await user.save();
      } else {
        const expiryStr = user.bannedUntil
          ? `until ${new Date(user.bannedUntil).toLocaleDateString()} ${new Date(user.bannedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'permanently';
        const reasonStr = user.banReason ? ` Reason: ${user.banReason}` : '';
        return res.status(403).json({
          message: `Your account has been suspended ${expiryStr}.${reasonStr}`
        });
      }
    }

    // Check if account is currently locked due to previous failed attempts
    if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
      const remainingMs = new Date(user.lockUntil).getTime() - Date.now();
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
      return res.status(423).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(423).json({
          message: 'Account has been temporarily locked for 15 minutes due to 5 consecutive failed login attempts.'
        });
      }
      await user.save();
      const remaining = 5 - user.failedLoginAttempts;
      return res.status(401).json({
        message: `Invalid email or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before account lockout.`
      });
    }

    // Reset failed login attempts and clear lockout on successful password match
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    // Check if account is in 15-day Recycle Bin grace period
    if (user.isDeleted) {
      if (user.deletionScheduledPermanentAt && new Date(user.deletionScheduledPermanentAt).getTime() > Date.now()) {
        const daysRemaining = Math.max(1, Math.ceil((new Date(user.deletionScheduledPermanentAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        return res.status(200).json({
          requiresRestore: true,
          email: user.email,
          daysRemaining,
          message: `Your account is scheduled for permanent deletion in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Would you like to restore it?`
        });
      } else {
        return res.status(403).json({ message: 'This account was permanently deleted.' });
      }
    }

    // Auto-reactivate deactivated account upon successful login
    if (user.isDeactivated || user.accountStatus === 'Deactivated') {
      user.isDeactivated = false;
      user.deactivatedAt = null;
      user.accountStatus = 'Active';
    }

    const requires2FA = ['Admin', 'SuperAdmin', 'GymOwner', 'StoreManager'].includes(user.role) || user.twoFactorEnabled;
    
    if (requires2FA) {
      const otp = crypto.randomInt(100000, 999999).toString();
      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from: `"GymSync" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'GymSync — 2FA Login Code',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#f8fafc;padding:40px;border-radius:16px;border:1px solid #1e293b;">
              <h2 style="color:#3b82f6;margin-bottom:8px;">GymSync Login</h2>
              <p style="color:#94a3b8;margin-bottom:24px;">Your secure two-factor authentication code is below.</p>
              <div style="background:#1e293b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
                <span style="font-size:2.5rem;font-weight:bold;color:#10b981;letter-spacing:8px;">${otp}</span>
              </div>
              <p style="color:#94a3b8;font-size:0.85rem;">This code expires in <strong style="color:#f59e0b;">5 minutes</strong>.</p>
            </div>
          `
        });
      } catch (e) {
        console.error('2FA email delivery failed:', e.message);
      }

      const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
      user.otpCode = hashedOtp;
      user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      user.otpVerified = false;
      user.otpAttempts = 0;
      user.lastOtpSentAt = new Date();
      await user.save();

      return res.json({ requiresOtp: true, email: user.email, tempToken: generateToken(user._id, '5m') });
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An internal error occurred during login. Please try again later.' });
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
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
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
    console.error('Password change error:', error);
    return res.status(500).json({ message: 'An internal error occurred while changing password.' });
  }
};

// @desc    Send OTP to email for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    // Anti-enumeration: return identical generic message if user does not exist
    if (!user) {
      return res.json({ message: 'If an account exists with this email address, a password reset code has been sent.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    try {
      const transporter = createTransporter();
      await transporter.verify();
      await transporter.sendMail({
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
    } catch (eErr) {
      // Non-blocking log to ensure timing/status enumeration protection
      console.error('Password-reset email delivery failed:', eErr.message);
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    user.otpCode = hashedOtp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.otpVerified = false;
    user.otpAttempts = 0;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: 'If an account exists with this email address, a password reset code has been sent.' });
  } catch (error) {
    console.error('Email send error:', error.message);
    return res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  const inputHash = crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
  const now = new Date();

  // Prepare cryptographically secure single-use reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

  // ATOMIC MATCH & CLAIM: Exactly ONE concurrent request can match and consume the active OTP
  const matchedUser = await User.findOneAndUpdate(
    {
      email: normalizedEmail,
      otpCode: inputHash,
      otpExpiresAt: { $gt: now },
      otpAttempts: { $lt: 5 }
    },
    {
      $set: {
        otpCode: null,
        otpExpiresAt: null,
        otpVerified: false,
        otpAttempts: 0,
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: resetPasswordExpires
      }
    },
    { returnDocument: 'after' }
  );

  if (!matchedUser) {
    const existing = await User.findOne({ email: normalizedEmail });
    if (!existing || !existing.otpCode) {
      return res.status(400).json({ message: 'No active OTP request found.' });
    }

    if (existing.otpExpiresAt && new Date(existing.otpExpiresAt).getTime() <= Date.now()) {
      await User.updateOne(
        { _id: existing._id },
        { $set: { otpCode: null, otpExpiresAt: null, otpAttempts: 0, otpVerified: false } }
      );
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Atomically increment failed attempts
    const failedUser = await User.findOneAndUpdate(
      { _id: existing._id, otpCode: { $ne: null } },
      { $inc: { otpAttempts: 1 } },
      { returnDocument: 'after' }
    );

    const attempts = failedUser ? failedUser.otpAttempts : 5;
    if (attempts >= 5) {
      await User.updateOne(
        { _id: existing._id },
        { $set: { otpCode: null, otpExpiresAt: null, otpAttempts: 0, otpVerified: false, resetPasswordToken: null, resetPasswordExpires: null } }
      );
      return res.status(429).json({ message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new one.' });
    }

    return res.status(400).json({ message: `Incorrect OTP. ${5 - attempts} attempts remaining.` });
  }

  return res.json({ message: 'OTP verified successfully.', resetToken });
};

// @desc    Reset password after OTP verification
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  const { email, newPassword, resetToken } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  // Anti-enumeration: uniform invalid message for missing/malformed parameters
  if (!normalizedEmail || !resetToken || typeof resetToken !== 'string') {
    return res.status(400).json({ message: 'Invalid or expired password reset request.' });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
  }

  const tokenHash = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');
  const now = new Date();

  // Hash new password using bcrypt before atomic update
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // ATOMIC SINGLE-USE TOKEN CONSUMPTION:
  // Exactly ONE concurrent request can match resetPasswordToken and overwrite it to null.
  // Any concurrent replay will find 0 matching records and fail safely.
  const updatedUser = await User.findOneAndUpdate(
    {
      email: normalizedEmail,
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: now }
    },
    {
      $set: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpVerified: false
      }
    },
    { returnDocument: 'after' }
  );

  if (!updatedUser) {
    return res.status(400).json({ message: 'Invalid or expired password reset request.' });
  }

  return res.json({ message: 'Password reset successful. You may now log in.' });
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

    // Map frontend role values to backend enum (strictly non-privileged roles)
    const roleMap = {
      user: 'User', gym_owner: 'GymOwner'
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
    console.error('Google registration error:', error);
    res.status(500).json({ message: 'An internal error occurred during Google registration.' });
  }
};

// @desc    Get current logged in user session (authoritative profile validation)
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      isEmailVerified: user.isEmailVerified,
      isGoogleApproved: user.isGoogleApproved,
      isBanned: user.isBanned
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ message: 'An internal error occurred while fetching user profile.' });
  }
};
// To be concatenated with authController.js

// @desc    Verify 2FA OTP and issue final JWT
// @route   POST /api/auth/verify-login-otp
// @access  Public
export const verifyLoginOtp = async (req, res) => {
  const { email, otp, tempToken } = req.body;
  if (!email?.trim() || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.otpCode) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please log in again.' });
    }

    if (user.otpExpiresAt && new Date(user.otpExpiresAt).getTime() <= Date.now()) {
      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one or log in again.' });
    }

    const inputHash = crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
    
    if (user.otpCode !== inputHash) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= 3) {
        user.otpCode = null;
        user.otpExpiresAt = null;
        user.otpAttempts = 0;
        await user.save();
        return res.status(429).json({ message: 'Too many incorrect OTP attempts. This code has been invalidated. Please log in again.' });
      }
      await user.save();
      const remaining = 3 - user.otpAttempts;
      return res.status(400).json({
        message: `Invalid OTP code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
        attemptsRemaining: remaining
      });
    }

    // Success - consume OTP immediately
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpVerified = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });

  } catch (error) {
    console.error('verifyLoginOtp error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

// @desc    Resend 2FA OTP with 60-second cooldown
// @route   POST /api/auth/resend-login-otp
// @access  Public
export const resendLoginOtp = async (req, res) => {
  const { email, tempToken } = req.body;
  if (!email?.trim()) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    if (tempToken) {
      try {
        jwt.verify(tempToken, process.env.JWT_SECRET);
      } catch (tokErr) {
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
      }
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check 60-second cooldown
    const COOLDOWN_MS = 60 * 1000;
    if (user.lastOtpSentAt) {
      const elapsed = Date.now() - new Date(user.lastOtpSentAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        const waitSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSeconds} second${waitSeconds > 1 ? 's' : ''} before requesting a new OTP.`,
          secondsRemaining: waitSeconds
        });
      }
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"GymSync" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'GymSync — 2FA Login Code',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#f8fafc;padding:40px;border-radius:16px;border:1px solid #1e293b;">
            <h2 style="color:#3b82f6;margin-bottom:8px;">GymSync Login Code</h2>
            <p style="color:#94a3b8;margin-bottom:24px;">Your new two-factor authentication code is below.</p>
            <div style="background:#1e293b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
              <span style="font-size:2.5rem;font-weight:bold;color:#10b981;letter-spacing:8px;">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:0.85rem;">This code expires in <strong style="color:#f59e0b;">5 minutes</strong>.</p>
          </div>
        `
      });
    } catch (e) {
      console.error('2FA resend email delivery failed:', e.message);
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    user.otpCode = hashedOtp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.otpVerified = false;
    user.otpAttempts = 0;
    user.lastOtpSentAt = new Date();
    await user.save();

    return res.json({
      message: 'A new security code has been sent to your email.',
      tempToken: generateToken(user._id, '5m')
    });
  } catch (error) {
    console.error('resendLoginOtp error:', error);
    return res.status(500).json({ message: 'Failed to resend OTP. Please try again.' });
  }
};

// @desc    Self-restore account from 15-day Recycle Bin grace period
// @route   POST /api/auth/restore-self
// @access  Public
export const restoreSelfAccount = async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isDeleted) {
      return res.status(400).json({ message: 'Account is already active' });
    }

    if (user.deletionScheduledPermanentAt && new Date(user.deletionScheduledPermanentAt).getTime() <= Date.now()) {
      return res.status(403).json({ message: 'The 15-day recovery window has expired. This account was permanently deleted.' });
    }

    user.isDeleted = false;
    user.deletedAt = null;
    user.deletionScheduledPermanentAt = null;
    user.deletedBy = null;
    user.accountStatus = user.isBanned ? 'Banned' : 'Active';
    await user.save();

    res.json({
      message: 'Welcome back! Your account has been restored successfully.',
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('restoreSelfAccount error:', error);
    res.status(500).json({ message: 'Failed to restore account. Please try again later.' });
  }
};

