import mongoose from 'mongoose';
import User from '../models/User.js';

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
  // Reuse existing connection if already connected (important for Vercel serverless)
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI / MONGODB_URI environment variable is missing!');
    throw new Error('MONGO_URI or MONGODB_URI environment variable is not defined.');
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    removeLegacyUniqueNameIndex().catch(() => {});
  } catch (error) {
    console.error(`Database is not connected. (${error.message})`);
    throw error;
  }
};

export default connectDB;
