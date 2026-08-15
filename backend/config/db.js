import mongoose from 'mongoose';
import User from '../models/User.js';

const removeLegacyUniqueNameIndex = async () => {
  const nameIndex = (await User.collection.indexes()).find(index => index.name === 'name_1');
  if (nameIndex?.unique) {
    await User.collection.dropIndex('name_1');
    console.log('Removed legacy unique display-name index.');
  }
};

const connectDB = async (retryCount = 0) => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gymsync';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,  // 15s (was 5s)
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    await removeLegacyUniqueNameIndex();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database is not connected. Please ensure internet access and check MongoDB Atlas status. (${error.message})`);
    
    // Retry up to 5 times automatically
    if (retryCount < 4) {
      console.log(`Retrying database connection in 5 seconds... (Attempt ${retryCount + 2})`);
      setTimeout(() => connectDB(retryCount + 1), 5000);
    } else {
      console.error('❌ Failed to connect to MongoDB after 5 attempts. Server will continue without DB.');
    }
  }
};

export default connectDB;
