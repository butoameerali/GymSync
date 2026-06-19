import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({ name: String, friends: [String], sentRequests: [String], receivedRequests: [String] }, { collection: 'users' });
const User = mongoose.model('UserScript', userSchema);
const Notification = mongoose.model('NotificationScript', new mongoose.Schema({}, { collection: 'notifications', strict: false }));

async function run() {
  const users = await User.find({});
  console.log("=== USERS ===");
  users.forEach(u => console.log(`Name: '${u.name}', Friends: [${u.friends}], Sent: [${u.sentRequests}], Received: [${u.receivedRequests}]`));
  
  const notifs = await Notification.find({ type: 'friend_request' });
  console.log("\n=== NOTIFICATIONS ===");
  notifs.forEach(n => console.log(`ID: ${n._id}, Type: ${n.type}, Message: '${n.get('message')}', isRead: ${n.get('isRead')}`));
  
  mongoose.disconnect();
}
run();
