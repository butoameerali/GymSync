import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model('UserWipe', new mongoose.Schema({}, { collection: 'users', strict: false }));
const Notification = mongoose.model('NotificationWipe', new mongoose.Schema({}, { collection: 'notifications', strict: false }));
const Post = mongoose.model('PostWipe', new mongoose.Schema({}, { collection: 'posts', strict: false }));

async function run() {
  console.log("Wiping database for fresh FYP demo...");
  await User.deleteMany({});
  await Notification.deleteMany({});
  await Post.deleteMany({});
  console.log("Database successfully wiped!");
  mongoose.disconnect();
}
run();
