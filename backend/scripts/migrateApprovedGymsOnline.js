import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Gym from '../models/Gym.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Update all approved gyms that are not explicitly offline
  const result = await Gym.updateMany(
    { approvalStatus: 'Approved', isOnline: { $ne: false } },
    {
      $set: {
        isOnline: true,
        subscriptionPaid: true,
        listingStatus: 'Online',
        subscriptionPaidAt: new Date(),
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    }
  );

  console.log(`Migrated ${result.modifiedCount} approved gyms to isOnline: true`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
