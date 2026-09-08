import mongoose from 'mongoose';

export class InvalidCursorError extends Error {
  constructor(message = 'Invalid pagination cursor provided') {
    super(message);
    this.name = 'InvalidCursorError';
    this.statusCode = 400;
  }
}

/**
 * Universal Cursor & Offset Pagination Utility
 *
 * Supports efficient cursor-based pagination for large collections
 * with fallback to page/limit pagination for backward compatibility.
 * Strictly validates cursor inputs and throws InvalidCursorError (HTTP 400)
 * rather than silently falling back to page 1.
 *
 * @param {mongoose.Model} model - Mongoose model to query
 * @param {Object} query - Base MongoDB query filter
 * @param {Object} options - Pagination options
 * @param {string|null} options.cursor - ObjectId or Date cursor for next page
 * @param {number} options.limit - Number of items to fetch per page (default 20)
 * @param {string} options.cursorField - Field used for cursor sorting (default '_id')
 * @param {number} options.direction - Sort direction: -1 (desc) or 1 (asc), default -1
 * @param {string|Object} options.select - Projection fields to return (lightweight DTO)
 * @param {Array|Object} options.populate - Mongoose populate options if any
 * @param {number|null} options.page - Optional page number for offset pagination
 * @returns {Promise<Object>} { items, nextCursor, hasMore, totalCount, limit }
 */
export const paginateQuery = async (model, query = {}, {
  cursor = null,
  limit = 20,
  cursorField = '_id',
  direction = -1,
  select = null,
  populate = null,
  page = null
} = {}) => {
  const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const filter = { ...query };

  // 1. Page-based offset pagination (if explicitly requested)
  if (page && Number(page) > 0) {
    const pageNum = Number(page);
    const skip = (pageNum - 1) * parsedLimit;

    let mongoQuery = model.find(filter)
      .sort({ [cursorField]: direction })
      .skip(skip)
      .limit(parsedLimit + 1);

    if (select) mongoQuery = mongoQuery.select(select);
    if (populate) mongoQuery = mongoQuery.populate(populate);

    const items = await mongoQuery.lean();
    const hasMore = items.length > parsedLimit;
    if (hasMore) items.pop();

    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem[cursorField] : null;

    return {
      items,
      nextCursor: nextCursor ? String(nextCursor) : null,
      hasMore,
      page: pageNum,
      limit: parsedLimit
    };
  }

  // 2. High-performance Cursor-based pagination with strict validation
  const cleanCursor = (cursor && cursor !== 'null' && cursor !== 'undefined') ? String(cursor).trim() : null;
  if (cleanCursor) {
    let cursorVal = cleanCursor;

    if (cursorField === '_id') {
      const isValidHex = /^[0-9a-fA-F]{24}$/.test(cleanCursor);
      if (!isValidHex || !mongoose.Types.ObjectId.isValid(cleanCursor)) {
        throw new InvalidCursorError(`Invalid cursor format: '${cleanCursor}' is not a valid 24-character ObjectId.`);
      }
      cursorVal = new mongoose.Types.ObjectId(cleanCursor);
    } else if (cursorField.toLowerCase().includes('date') || cursorField.toLowerCase().includes('at')) {
      const parsedDate = new Date(cleanCursor);
      if (isNaN(parsedDate.getTime())) {
        throw new InvalidCursorError(`Invalid cursor format: '${cleanCursor}' is not a valid date string.`);
      }
      cursorVal = parsedDate;
    }

    if (direction === -1) {
      filter[cursorField] = { $lt: cursorVal };
    } else {
      filter[cursorField] = { $gt: cursorVal };
    }
  }

  let mongoQuery = model.find(filter)
    .sort({ [cursorField]: direction })
    .limit(parsedLimit + 1);

  if (select) mongoQuery = mongoQuery.select(select);
  if (populate) mongoQuery = mongoQuery.populate(populate);

  const items = await mongoQuery.lean();
  const hasMore = items.length > parsedLimit;
  if (hasMore) items.pop();

  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem[cursorField]) : null;

  return {
    items,
    nextCursor,
    hasMore,
    limit: parsedLimit
  };
};

export default paginateQuery;
