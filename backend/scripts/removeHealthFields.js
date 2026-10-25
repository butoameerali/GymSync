/**
 * Migration Script: Remove User Health / Medical Data Fields
 *
 * Removes medicalConditions, injuries, jointPain, and limitations from user bioData.
 * Exercise-level metadata (e.g. jointPainAvoidIf) is completely untouched.
 *
 * Usage:
 *   node backend/scripts/removeHealthFields.js           # Dry-run (default, does not modify DB)
 *   node backend/scripts/removeHealthFields.js --dry-run # Explicit dry-run
 *   node backend/scripts/removeHealthFields.js --apply   # Apply changes ($unset fields)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const isApply = process.argv.includes('--apply');

async function runMigration() {
  console.log('===============================================================');
  console.log(`🧹 MIGRATION: REMOVE USER HEALTH / MEDICAL FIELDS (${isApply ? 'APPLY MODE' : 'DRY-RUN MODE'})`);
  console.log('===============================================================\n');

  try {
    await connectDB();
    const usersCollection = mongoose.connection.collection('users');

    const healthQuery = {
      $or: [
        { 'bioData.medicalConditions': { $exists: true } },
        { 'bioData.injuries': { $exists: true } },
        { 'bioData.jointPain': { $exists: true } },
        { 'bioData.limitations': { $exists: true } }
      ]
    };

    // Detailed counts before migration
    const totalUsers = await usersCollection.countDocuments({});
    const totalMatching = await usersCollection.countDocuments(healthQuery);
    const countMedicalConditions = await usersCollection.countDocuments({ 'bioData.medicalConditions': { $exists: true } });
    const countInjuries = await usersCollection.countDocuments({ 'bioData.injuries': { $exists: true } });
    const countJointPain = await usersCollection.countDocuments({ 'bioData.jointPain': { $exists: true } });
    const countLimitations = await usersCollection.countDocuments({ 'bioData.limitations': { $exists: true } });

    console.log(`Total users in database: ${totalUsers}`);
    console.log(`Users with legacy health fields: ${totalMatching}`);
    console.log(`  - bioData.medicalConditions: ${countMedicalConditions}`);
    console.log(`  - bioData.injuries:          ${countInjuries}`);
    console.log(`  - bioData.jointPain:         ${countJointPain}`);
    console.log(`  - bioData.limitations:       ${countLimitations}\n`);

    if (!isApply) {
      console.log('---------------------------------------------------------------');
      console.log('ℹ️  DRY-RUN ONLY: No changes were applied to MongoDB.');
      console.log('To execute this migration and unset these fields, run:');
      console.log('    node backend/scripts/removeHealthFields.js --apply');
      console.log('---------------------------------------------------------------');
    } else {
      console.log('Applying $unset on bioData.medicalConditions, bioData.injuries, bioData.jointPain, bioData.limitations...');
      const updateResult = await usersCollection.updateMany(
        healthQuery,
        {
          $unset: {
            'bioData.medicalConditions': '',
            'bioData.injuries': '',
            'bioData.jointPain': '',
            'bioData.limitations': ''
          }
        }
      );

      console.log(`\nUpdate completed successfully!`);
      console.log(`  - Matched documents:  ${updateResult.matchedCount}`);
      console.log(`  - Modified documents: ${updateResult.modifiedCount}`);

      // Verification count after migration
      const remainingCount = await usersCollection.countDocuments(healthQuery);
      console.log(`  - Remaining users with legacy health fields: ${remainingCount}`);

      if (remainingCount === 0) {
        console.log('\n✅ All legacy health fields were successfully removed!');
      } else {
        console.warn(`\n⚠️ Warning: ${remainingCount} documents still match health query.`);
      }
    }
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

runMigration();
