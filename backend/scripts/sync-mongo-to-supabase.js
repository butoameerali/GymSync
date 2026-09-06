import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import Exercise from '../models/Exercise.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

dotenv.config();

const syncMongoToSupabase = async () => {
  console.log('🔄 Starting MongoDB to Supabase Synchronization...');

  if (!isSupabaseConfigured() || !supabase) {
    console.error('❌ Supabase is not configured! Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  await connectDB();

  try {
    // 1. SYNC EXERCISES
    console.log('\n--- Syncing Exercises ---');
    const mongoExercises = await Exercise.find({}).lean();
    console.log(`Found ${mongoExercises.length} exercises in MongoDB.`);

    let exercisesSynced = 0;
    for (const ex of mongoExercises) {
      const row = {
        exercise_id: ex.exerciseId || `EX-${String(ex._id).substring(18).toUpperCase()}`,
        name: ex.name,
        target_muscles: ex.targetMuscles || [],
        equipment_required: ex.equipmentRequired || 'Bodyweight',
        difficulty: ex.difficulty || 'Beginner',
        fitness_paths: ex.fitnessPaths || [],
        medical_avoid_if: ex.medicalAvoidIf || [],
        joint_pain_avoid_if: ex.jointPainAvoidIf || [],
        media_url: ex.mediaUrl || '',
        description: ex.description || '',
        is_ai_trackable: Boolean(ex.aiDetection?.enabled),
        ai_detection: ex.aiDetection || { enabled: false }
      };

      const { error } = await supabase
        .from('exercises')
        .upsert(row, { onConflict: 'exercise_id' });

      if (!error) exercisesSynced++;
      else console.warn(`Error syncing exercise ${ex.name}:`, error.message);
    }
    console.log(`✅ ${exercisesSynced}/${mongoExercises.length} Exercises synced to Supabase.`);

    // 2. SYNC POSTS
    console.log('\n--- Syncing Posts ---');
    const mongoPosts = await Post.find({}).lean();
    console.log(`Found ${mongoPosts.length} posts in MongoDB.`);

    let postsSynced = 0;
    for (const p of mongoPosts) {
      const row = {
        mongo_id: String(p._id),
        author_id: String(p.author || p._id),
        author_name: p.authorName || 'User',
        author_role: p.authorRole || 'User',
        content: p.content || '',
        media_url: p.mediaUrl || '',
        likes: p.likes || [],
        comments: p.comments || [],
        report_count: p.reportCount || 0,
        approval_status: p.approvalStatus || 'published',
        comment_restriction: p.commentRestriction || 'SubscribersOnly',
        created_at: p.createdAt || new Date().toISOString()
      };

      const { error } = await supabase
        .from('posts')
        .upsert(row, { onConflict: 'mongo_id' });

      if (!error) postsSynced++;
      else console.warn(`Error syncing post ${p._id}:`, error.message);
    }
    console.log(`✅ ${postsSynced}/${mongoPosts.length} Posts synced to Supabase.`);

    // 3. SYNC USER PROFILES (EXCLUDING PASSWORDS!)
    console.log('\n--- Syncing User Profiles (Excluding Passwords) ---');
    const mongoUsers = await User.find({}).select('-password').lean();
    console.log(`Found ${mongoUsers.length} user profiles in MongoDB.`);

    let profilesSynced = 0;
    for (const u of mongoUsers) {
      const row = {
        user_id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role || 'User',
        profile_pic: u.profilePic || '',
        friends: u.friends || [],
        followers: u.followers || [],
        following: u.following || []
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(row, { onConflict: 'user_id' });

      if (!error) profilesSynced++;
      else console.warn(`Error syncing user profile ${u.name}:`, error.message);
    }
    console.log(`✅ ${profilesSynced}/${mongoUsers.length} User Profiles synced to Supabase.`);

    console.log('\n🎉 Synchronization complete! High-volume data now mirrored in Supabase.');
    process.exit(0);
  } catch (err) {
    console.error('Fatal sync error:', err);
    process.exit(1);
  }
};

syncMongoToSupabase();
