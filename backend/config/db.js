import mongoose from 'mongoose';
import User from '../models/User.js';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const removeLegacyUniqueNameIndex = async () => {
  try {
    const indexes = await User.collection.indexes();
    const nameIndex = indexes.find(index => index.name === 'name_1');
    if (nameIndex?.unique) {
      await User.collection.dropIndex('name_1');
      console.log('Removed legacy unique display-name index.');
    }
  } catch (err) {
    // Ignore index error if collection doesn't exist yet
  }
};

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState >= 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState >= 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI / MONGODB_URI environment variable is missing!');
    throw new Error('MONGO_URI or MONGODB_URI environment variable is not defined.');
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 5,            // Critical for serverless: limits connection pool size per lambda (prevents Atlas M0 50-conn cap overflow)
      minPoolSize: 1,
      maxIdleTimeMS: 10000,      // Closes idle sockets quickly (10s)
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    };

    cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      removeLegacyUniqueNameIndex().catch(() => {});
      return mongooseInstance.connection;
    }).catch((error) => {
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

export default connectDB;
