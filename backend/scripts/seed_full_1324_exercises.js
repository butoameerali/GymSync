import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Exercise from '../models/Exercise.js';
import User from '../models/User.js';
import PreMadePlan from '../models/PreMadePlan.js';
import connectDB from '../config/db.js';

const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
};

const mapCategory = (bodyPart) => {
  switch ((bodyPart || '').toLowerCase()) {
    case 'chest':
      return 'Chest';
    case 'back':
      return 'Back';
    case 'upper legs':
    case 'lower legs':
      return 'Legs';
    case 'shoulders':
    case 'neck':
      return 'Shoulders';
    case 'upper arms':
    case 'lower arms':
      return 'Arms';
    case 'waist':
      return 'Core';
    case 'cardio':
      return 'Cardio';
    default:
      return 'Full Body';
  }
};

const mapEquipment = (eq) => {
  if (!eq) return 'Bodyweight';
  const l = eq.toLowerCase();
  if (l === 'body weight') return 'Bodyweight';
  if (l === 'band' || l === 'resistance band') return 'Resistance Band';
  if (l === 'barbell' || l === 'olympic barbell') return 'Barbell';
  if (l === 'dumbbell') return 'Dumbbell';
  if (l === 'cable') return 'Cable Machine';
  if (l === 'kettlebell') return 'Kettlebell';
  if (l === 'smith machine') return 'Smith Machine';
  if (l === 'leverage machine' || l === 'sled machine') return 'Machine';
  if (l === 'stability ball' || l === 'bosu ball') return 'Exercise Ball';
  if (l === 'medicine ball') return 'Medicine Ball';
  return toTitleCase(eq);
};

async function seedFullExercises() {
  console.log('🚀 Starting Full 1,324 Exercise Database & Supabase Seeding...');

  await connectDB();
  console.log('✅ Connected to MongoDB (gymsync database)');

  // 1. Verify or create Fitness Trainer account
  const trainerEmail = 'trainer@gymsync.com';
  let trainer = await User.findOne({ email: trainerEmail });
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('trainer123', salt);

  if (!trainer) {
    trainer = await User.create({
      name: 'Captain Farhan (Fitness Trainer)',
      email: trainerEmail,
      password: hashedPassword,
      role: 'FitnessInstructor',
      accountStatus: 'Active',
      isEmailVerified: true,
      isGoogleApproved: true,
      bio: 'Certified CSCS & Elite Fitness Instructor specializing in Hypertrophy, Fat Loss, and Biomechanics.',
      fitnessGoal: 'Build Muscle',
      city: 'Karachi',
      country: 'Pakistan',
      profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'
    });
    console.log('✅ Created Fitness Trainer account:', trainer.email);
  } else {
    trainer.role = 'FitnessInstructor';
    trainer.accountStatus = 'Active';
    trainer.isEmailVerified = true;
    await trainer.save();
    console.log('✅ Fitness Trainer verified:', trainer.name, `(${trainer._id})`);
  }

  // 2. Read hasan_exercises.json
  const hasanPath = path.join(__dirname, '../data/hasan_exercises.json');
  if (!fs.existsSync(hasanPath)) {
    throw new Error('hasan_exercises.json not found in backend/data!');
  }
  const hasanData = JSON.parse(fs.readFileSync(hasanPath, 'utf8'));
  console.log(`📦 Loaded ${hasanData.length} exercises from hasan_exercises.json`);

  // 3. Prepare exercises docs
  const cdnBase = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';
  const mongoBulkOps = [];
  const supabaseRows = [];
  const nameToMediaMap = new Map();

  for (let i = 0; i < hasanData.length; i++) {
    const item = hasanData[i];
    const cleanName = toTitleCase(item.name);
    const exerciseId = `EX-H-${String(i + 1).padStart(4, '0')}`;
    const category = mapCategory(item.body_part);
    const equipment = mapEquipment(item.equipment);
    const gifUrl = `${cdnBase}/${item.gif_url}`;
    const thumbnailUrl = `${cdnBase}/${item.image}`;

    let instructions = '';
    if (item.instruction_steps && Array.isArray(item.instruction_steps.en)) {
      instructions = item.instruction_steps.en.join(' ');
    } else if (item.instructions && typeof item.instructions.en === 'string') {
      instructions = item.instructions.en;
    }

    const targetMuscles = [
      toTitleCase(item.target || ''),
      ...(Array.isArray(item.secondary_muscles) ? item.secondary_muscles.map(toTitleCase) : [])
    ].filter(Boolean);

    const isPushup = cleanName.toLowerCase().includes('push-up') || cleanName.toLowerCase().includes('pushup');
    const isRunning = cleanName.toLowerCase().includes('running') || cleanName.toLowerCase().includes('jogging');

    const exDoc = {
      exerciseId,
      name: cleanName,
      category,
      targetMuscles,
      equipmentRequired: equipment,
      difficulty: equipment === 'Barbell' || equipment === 'Cable Machine' ? 'Intermediate' : 'Beginner',
      defaultSets: 3,
      defaultReps: 10,
      defaultDuration: 0,
      instructions: instructions || `Perform ${cleanName} with controlled form through full range of motion.`,
      mediaUrl: gifUrl,
      gifUrl: gifUrl,
      thumbnailUrl,
      videoUrl: gifUrl,
      description: `Studio-quality demonstration for ${cleanName}. Target muscles: ${targetMuscles.join(', ')}.`,
      status: 'active',
      instructorApproved: true,
      reviewStatus: 'approved',
      createdBy: String(trainer._id),
      updatedBy: trainer.name,
      isAiTrackable: isPushup || isRunning,
      aiDetection: isPushup
        ? { enabled: true, detectorId: 'pushup_v1', detectorVersion: '1.0' }
        : isRunning
        ? { enabled: true, detectorId: 'running_v1', detectorVersion: '1.0' }
        : { enabled: false }
    };

    nameToMediaMap.set(cleanName.toLowerCase(), gifUrl);
    // Also set normalized variations (e.g. without "barbell", "dumbbell", etc.)
    const stripped = cleanName.toLowerCase()
      .replace(/\b(barbell|dumbbell|cable|smith machine|band|bodyweight)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped && !nameToMediaMap.has(stripped)) {
      nameToMediaMap.set(stripped, gifUrl);
    }

    mongoBulkOps.push({
      updateOne: {
        filter: { exerciseId },
        update: { $set: exDoc },
        upsert: true
      }
    });

    supabaseRows.push({
      exercise_id: exerciseId,
      name: cleanName,
      target_muscles: targetMuscles,
      equipment_required: equipment,
      difficulty: exDoc.difficulty,
      fitness_paths: [category, 'Strength & Hypertrophy'],
      medical_avoid_if: [],
      joint_pain_avoid_if: [],
      media_url: gifUrl,
      description: exDoc.description,
      is_ai_trackable: exDoc.isAiTrackable,
      ai_detection: exDoc.aiDetection
    });
  }

  // Also map common short names like "bench press" -> our Google Flow video
  const benchPressGif = '/exercises/barbell-bench-press.mp4';
  nameToMediaMap.set('barbell bench press', benchPressGif);
  nameToMediaMap.set('bench press', benchPressGif);
  nameToMediaMap.set('standard bench press', benchPressGif);

  // 4. Bulk Write to MongoDB
  console.log(`💾 Upserting ${mongoBulkOps.length} exercises into MongoDB...`);
  const mongoRes = await Exercise.bulkWrite(mongoBulkOps);
  console.log(`✅ MongoDB bulk write complete: Upserted=${mongoRes.upsertedCount}, Modified=${mongoRes.modifiedCount}`);

  // 5. Sync to Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`🌐 Syncing ${supabaseRows.length} exercises to Supabase in batches...`);
    const batchSize = 100;
    let supaSynced = 0;
    for (let i = 0; i < supabaseRows.length; i += batchSize) {
      const chunk = supabaseRows.slice(i, i + batchSize);
      const { error } = await supabase.from('exercises').upsert(chunk, { onConflict: 'exercise_id' });
      if (error) {
        console.error(`⚠️ Supabase batch ${i} error:`, error.message);
      } else {
        supaSynced += chunk.length;
      }
    }
    console.log(`🎉 Supabase Sync Complete: ${supaSynced}/${supabaseRows.length} exercises synced!`);
  } else {
    console.warn('⚠️ Supabase credentials not found in env, skipped Supabase upload.');
  }

  // 6. Update PreMadePlan exercises with GIFs
  console.log('🔄 Updating PreMadePlan exercises with demonstration media URLs...');
  const plans = await PreMadePlan.find({});
  let updatedPlansCount = 0;
  for (const plan of plans) {
    let changed = false;
    if (Array.isArray(plan.weeks)) {
      for (const week of plan.weeks) {
        if (Array.isArray(week.days)) {
          for (const day of week.days) {
            if (Array.isArray(day.exercises)) {
              for (const ex of day.exercises) {
                const exName = (ex.name || '').toLowerCase().trim();
                const matchedGif = nameToMediaMap.get(exName) ||
                  nameToMediaMap.get(exName.replace(/\b(barbell|dumbbell|cable)\b/g, '').trim());
                if (matchedGif) {
                  ex.gifUrl = matchedGif;
                  ex.mediaUrl = matchedGif;
                  ex.videoUrl = matchedGif;
                  changed = true;
                }
              }
            }
          }
        }
      }
    }
    if (changed) {
      plan.markModified('weeks');
      await plan.save();
      updatedPlansCount++;
    }
  }
  console.log(`✅ Updated ${updatedPlansCount} PreMadePlans with direct exercise GIFs!`);

  console.log('🏁 All exercises seeded and media links updated successfully.');
  await mongoose.disconnect();
}

seedFullExercises().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
