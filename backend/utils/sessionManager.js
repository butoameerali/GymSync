import Session from '../models/Session.js';
import { hashToken } from './cryptoUtils.js';

export const parseDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

  let browser = 'Browser';
  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/edg/i.test(userAgent)) browser = 'Edge';

  let os = 'OS';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';

  const deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? 'Mobile' : 'Desktop';

  return { browser, os, ip, userAgent, deviceType };
};

export const createSession = async (userId, token, req, expiresInMs = 30 * 24 * 60 * 60 * 1000) => {
  try {
    const tokenHash = hashToken(token);
    const deviceInfo = parseDeviceInfo(req);
    const expiresAt = new Date(Date.now() + expiresInMs);

    const session = await Session.create({
      user: userId,
      tokenHash,
      deviceInfo,
      expiresAt
    });
    return session;
  } catch (err) {
    console.error('Session creation error:', err.message);
    return null;
  }
};

export const isSessionRevoked = async (userId, token) => {
  try {
    const tokenHash = hashToken(token);
    const session = await Session.findOne({ user: userId, tokenHash });
    if (!session) {
      // If no session tracked yet (legacy session), allow through
      return false;
    }
    if (session.isRevoked) {
      return true;
    }
    // Update lastActive asynchronously
    Session.updateOne({ _id: session._id }, { $set: { lastActive: new Date() } }).exec().catch(() => {});
    return false;
  } catch (err) {
    console.error('Session check error:', err.message);
    return false;
  }
};

export const revokeSessionById = async (sessionId, userId) => {
  return await Session.findOneAndUpdate(
    { _id: sessionId, user: userId },
    { $set: { isRevoked: true, revokedAt: new Date() } },
    { returnDocument: 'after' }
  );
};

export const revokeAllOtherSessions = async (userId, currentToken) => {
  const currentHash = hashToken(currentToken);
  return await Session.updateMany(
    { user: userId, tokenHash: { $ne: currentHash }, isRevoked: false },
    { $set: { isRevoked: true, revokedAt: new Date() } }
  );
};

export const getUserSessions = async (userId, currentToken) => {
  const currentHash = hashToken(currentToken);
  const now = new Date();
  const sessions = await Session.find({
    user: userId,
    isRevoked: false,
    expiresAt: { $gt: now }
  }).sort({ lastActive: -1 });

  return sessions.map(s => ({
    _id: s._id,
    id: s._id,
    deviceInfo: s.deviceInfo,
    lastActive: s.lastActive,
    createdAt: s.createdAt,
    isCurrent: s.tokenHash === currentHash
  }));
};
