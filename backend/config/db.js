import mongoose from 'mongoose';

const connectDB = async (retryCount = 0) => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gymsync';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database is not connected. Please ensure internet access and check MongoDB Atlas status. (${error.message})`);
    
    // Retry up to 3 times automatically
    if (retryCount < 2) {
      console.log(`Retrying database connection in 3 seconds... (Attempt ${retryCount + 2})`);
      setTimeout(() => connectDB(retryCount + 1), 3000);
    }
  }
};

export default connectDB;
