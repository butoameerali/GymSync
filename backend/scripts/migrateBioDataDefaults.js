/**
 * Migration Script: Clean and Verify Legacy User BioData Defaults
 *
 * Scans users whose bioData contains legacy hardcoded defaults (height: 170, weight: 70)
 * without having completed onboarding or without having specified gender/dob.
 * Flags them with bioUnverified: true so the app can prompt them to confirm/complete their bio.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

export async function migrateBioDataDefaults() {
  console.log('🔄 Starting BioData legacy defaults migration...');
  
  // Find users who have default 170 / 70 and missing gender or missing dob or incomplete onboarding
  const candidateUsers = await User.find({
    $or: [
      { 'bioData.height': 170, 'bioData.weight': 70, $or: [{ 'bioData.gender': { $in: ['', null] } }, { 'bioData.dob': { $in: ['', null] } }] },
      { 'bioData.bioUnverified': { $exists: false } }
    ]
  });

  let updatedCount = 0;
  for (const user of candidateUsers) {
    let modified = false;

    // Detect if default values were never explicitly confirmed
    const hasDefaultValues = user.bioData?.height === 170 && user.bioData?.weight === 70;
    const hasMissingGenderOrDob = !user.bioData?.gender || !user.bioData?.dob;

    if (hasDefaultValues && hasMissingGenderOrDob && !user.isOnboardingCompleted) {
      if (!user.bioData) user.bioData = {};
      user.bioData.bioUnverified = true;
      user.bioData.height = null;
      user.bioData.weight = null;
      modified = true;
    } else if (user.bioData && user.bioData.bioUnverified === undefined) {
      user.bioData.bioUnverified = false;
      modified = true;
    }

    if (modified) {
      user.markModified('bioData');
      await user.save();
      updatedCount++;
    }
  }

  console.log(`✅ BioData migration completed. Evaluated ${candidateUsers.length} users, updated ${updatedCount}.`);
  return { evaluated: candidateUsers.length, updated: updatedCount };
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].endsWith('migrateBioDataDefaults.js')) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gymsync_dev';
  mongoose.connect(MONGO_URI)
    .then(async () => {
      await migrateBioDataDefaults();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export default migrateBioDataDefaults;
