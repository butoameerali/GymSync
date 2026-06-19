import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './models/Post.js';

dotenv.config();

const cleanDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected.');
    
    const result = await Post.deleteMany({ authorName: 'Unknown User' });
    console.log(`Deleted ${result.deletedCount} unknown user posts.`);
    
    // Also delete any posts where authorName doesn't exist (from before the schema update)
    const result2 = await Post.deleteMany({ authorName: { $exists: false } });
    console.log(`Deleted ${result2.deletedCount} legacy posts.`);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

cleanDb();
