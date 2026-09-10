import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { supabase, isSupabaseConfigured } = await import('../config/supabase.js');

const Exercise = mongoose.model('Exercise', new mongoose.Schema({}, { strict: false, collection: 'exercises' }));

async function syncAllToSupabase() {
  console.log('🔄 Starting Full Exercise Sync to Supabase...');

  if (!isSupabaseConfigured() || !supabase) {
    console.log('⚠️ Supabase is not configured. Skipping Supabase sync.');
    return;
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  const exercises = await Exercise.find({}).lean();
  console.log(`📦 Found ${exercises.length} exercises to sync to Supabase.`);

  const batchSize = 100;
  let totalSynced = 0;

  for (let i = 0; i < exercises.length; i += batchSize) {
    const chunk = exercises.slice(i, i + batchSize);
    const rows = chunk.map(ex => ({
      exercise_id: ex.exerciseId || (`EX-${String(ex._id).substring(18).toUpperCase()}`),
      name: ex.name,
      target_muscles: Array.isArray(ex.targetMuscles) ? ex.targetMuscles : [],
      equipment_required: ex.equipmentRequired || 'Bodyweight',
      difficulty: ex.difficulty || 'Beginner',
      fitness_paths: Array.isArray(ex.fitnessPaths) ? ex.fitnessPaths : [],
      medical_avoid_if: Array.isArray(ex.medicalAvoidIf) ? ex.medicalAvoidIf : [],
      joint_pain_avoid_if: Array.isArray(ex.jointPainAvoidIf) ? ex.jointPainAvoidIf : [],
      media_url: ex.mediaUrl || '',
      description: ex.description || '',
      is_ai_trackable: Boolean(ex.isAiTrackable),
      ai_detection: ex.aiDetection || { enabled: false }
    }));

    const { error } = await supabase
      .from('exercises')
      .upsert(rows, { onConflict: 'exercise_id' });

    if (error) {
      console.error(`❌ Batch ${i} - ${i + chunk.length} error:`, error.message);
    } else {
      totalSynced += chunk.length;
      console.log(`✅ Synced batch ${i + 1} - ${i + chunk.length} (${totalSynced}/${exercises.length})`);
    }
  }

  console.log(`🎉 Supabase Exercise Sync Complete! Successfully synced ${totalSynced} exercises with GIF media.`);
  await mongoose.disconnect();
}

syncAllToSupabase().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
