import mongoose from 'mongoose';

/**
 * Escapes special regex characters in a user-supplied string
 * to prevent ReDoS and regex syntax injection errors.
 *
 * @param {string} str - Raw user input
 * @returns {string} Regex-escaped string
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Safely constructs a substring RegExp from user input after escaping.
 * Returns null if input is empty or invalid.
 *
 * @param {string} str - Raw user input
 * @param {string} flags - RegExp flags (default 'i')
 * @returns {RegExp|null}
 */
export const safeRegex = (str, flags = 'i') => {
  if (!str || typeof str !== 'string' || !str.trim()) return null;
  return new RegExp(escapeRegex(str.trim()), flags);
};

/**
 * Safely constructs an exact-match anchored RegExp (^...$) from user input after escaping.
 * Returns null if input is empty or invalid.
 *
 * @param {string} str - Raw user input
 * @param {string} flags - RegExp flags (default 'i')
 * @returns {RegExp|null}
 */
export const safeExactRegex = (str, flags = 'i') => {
  if (!str || typeof str !== 'string' || !str.trim()) return null;
  return new RegExp(`^${escapeRegex(str.trim())}$`, flags);
};

/**
 * Validates if an input string is a valid 24-character hexadecimal ObjectId
 *
 * @param {string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id) && mongoose.Types.ObjectId.isValid(id);
};

export default {
  escapeRegex,
  safeRegex,
  safeExactRegex,
  isValidObjectId
};
