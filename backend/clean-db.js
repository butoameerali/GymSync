import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({ name: String, friends: [String], sentRequests: [String], receivedRequests: [String] }, { collection: 'users' });
const User = mongoose.model('UserCleanup', userSchema);
const Notification = mongoose.model('NotificationCleanup', new mongoose.Schema({ userId: String, message: String }, { collection: 'notifications', strict: false }));

async function run() {
  console.log("Cleaning up whitespace...");
  const users = await User.find({});
  for (const u of users) {
    const originalName = u.name;
    const cleanName = u.name.trim();
    
    // If there's another user with the clean name, we merge or delete? Let's just update if possible
    u.name = cleanName;
    u.friends = u.friends.map(n => n.trim());
    u.sentRequests = u.sentRequests.map(n => n.trim());
    u.receivedRequests = u.receivedRequests.map(n => n.trim());
    
    await u.save();
    console.log(`Updated user: '${originalName}' -> '${cleanName}'`);
  }
  
  // Clean up notifications
  const notifs = await Notification.find({});
  for (const n of notifs) {
    if (n.userId) {
      n.userId = n.userId.trim();
      await n.save();
    }
  }

  console.log("Cleanup complete!");
  mongoose.disconnect();
}
run();
