import crypto from 'crypto';

/**
 * Get or derive a 32-byte key for AES-256-GCM.
 * Outside sources: process.env.DOCUMENT_ENCRYPTION_KEY (hex or base64 or utf-8 string).
 * If missing, derives safely from JWT_SECRET using HKDF or SHA-256 so dev environments work out-of-the-box.
 */
export const getDocumentEncryptionKey = () => {
  const envKey = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }
  const fallbackSecret = process.env.JWT_SECRET || 'gymsync_default_secure_fallback_secret_32b';
  return crypto.createHash('sha256').update(fallbackSecret).digest();
};

/**
 * Encrypt a file buffer using AES-256-GCM.
 * Returns: { encryptedData: Buffer, iv: string (hex), authTag: string (hex) }
 */
export const encryptBuffer = (buffer) => {
  const key = getDocumentEncryptionKey();
  const iv = crypto.randomBytes(12); // Recommended 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

/**
 * Decrypt a file buffer using AES-256-GCM.
 * Validates integrity via the authTag; throws if tampered.
 */
export const decryptBuffer = (encryptedData, ivHex, authTagHex) => {
  const key = getDocumentEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted;
};

/**
 * Generate a cryptographically secure 6-digit numeric or alphanumeric OTP.
 */
export const generateSecureOtp = (length = 6) => {
  // Numeric 6-digit OTP
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return crypto.randomInt(min, max + 1).toString();
};

/**
 * SHA-256 hash helper for OTPs and tokens.
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
};
