import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Normalizes MongoDB connection URI to ensure credentials with special
 * characters are properly URL-encoded.
 */
const normalizeMongoUri = (rawUri) => {
  if (!rawUri) return rawUri;
  const match = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (!match) return rawUri;
  const [, proto, user, pass, rest] = match;
  const safeUser = encodeURIComponent(decodeURIComponent(user));
  const safePass = encodeURIComponent(decodeURIComponent(pass));
  return `${proto}${safeUser}:${safePass}@${rest}`;
};

/**
 * Derives connection options ensuring Atlas authentication source is 'admin'
 * and the database defaults to 'gymsync' if not explicit.
 */
const getDbOptions = (mongoUri) => {
  const opts = {
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  };

  // If URI contains credentials and doesn't specify authSource, default to 'admin' (standard for Atlas)
  if (mongoUri.includes('@') && !mongoUri.includes('authSource=')) {
    opts.authSource = 'admin';
  }

  // Ensure default database is gymsync if path is empty or defaulted to 'test'
  try {
    const parsed = new URL(mongoUri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    const pathDb = parsed.pathname.replace(/^\//, '');
    if (!pathDb || pathDb === 'test') {
      opts.dbName = process.env.MONGO_DB_NAME || 'gymsync';
    }
  } catch {
    if (!opts.dbName) {
      opts.dbName = process.env.MONGO_DB_NAME || 'gymsync';
    }
  }

  return opts;
};

// Reset cache if connection drops
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected.');
  if (cached) {
    cached.conn = null;
    cached.promise = null;
  }
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  if (cached) {
    cached.conn = null;
    cached.promise = null;
  }
});

const connectDB = async () => {
  // readyState 1 means CONNECTED. Do NOT check >= 1 as 2 is 'connecting' and 3 is 'disconnecting'.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  let rawMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (process.env.NODE_ENV === 'test') {
    const testUri = process.env.MONGO_URI_TEST;
    if (!testUri) {
      console.error('❌ Test execution refused: MONGO_URI_TEST environment variable is not defined.');
      throw new Error('MONGO_URI_TEST environment variable is not defined for test environment.');
    }
    if (testUri === rawMongoUri) {
      console.error('❌ Test execution refused: MONGO_URI_TEST equals production MONGO_URI.');
      throw new Error('Refusing to run tests against primary database: MONGO_URI_TEST must not equal MONGO_URI.');
    }
    rawMongoUri = testUri;
  } else if (!rawMongoUri) {
    console.error('❌ MONGO_URI / MONGODB_URI environment variable is missing!');
    throw new Error('MONGO_URI or MONGODB_URI environment variable is not defined.');
  }

  const mongoUri = normalizeMongoUri(rawMongoUri);
  const opts = getDbOptions(mongoUri);

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      console.log(`✅ MongoDB Connected: ${mongooseInstance.connection.host} (DB: ${mongooseInstance.connection.name})`);
      return mongooseInstance.connection;
    }).catch((error) => {
      cached.promise = null;
      cached.conn = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
};

export default connectDB;
