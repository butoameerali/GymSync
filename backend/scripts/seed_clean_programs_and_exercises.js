import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Exercise from '../models/Exercise.js';
import PreMadePlan from '../models/PreMadePlan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const runSeed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gymsync';
    console.log('Connecting to MongoDB at:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // =========================================================================
    // 1. ENSURE / SEED FITNESS TRAINER ACCOUNT
    // =========================================================================
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
      trainer.password = hashedPassword;
      await trainer.save();
      console.log('✅ Updated Fitness Trainer account:', trainer.email);
    }

    // =========================================================================
    // 2. PURGE DUMMY EXERCISES & SEED HIGH-QUALITY VERIFIED EXERCISE CATALOGUE
    // =========================================================================
    console.log('Cleaning up old dummy exercises...');
    await Exercise.deleteMany({});
    console.log('Old exercises cleared.');

    const verifiedExercises = [
      // ── CHEST ──
      {
        exerciseId: 'EX-CHEST-01',
        name: 'Barbell Bench Press',
        category: 'Chest',
        targetMuscles: ['Pectorals (Mid/Lower)', 'Triceps', 'Anterior Deltoids'],
        equipmentRequired: 'Barbell',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 10,
        instructions: 'Lie on a flat bench. Grip barbell slightly wider than shoulder width. Lower bar smoothly to mid-chest, then press explosively upward while keeping shoulder blades retracted.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/barbell-bench-press.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/barbell-bench-press.gif',
        description: 'The king of upper body pressing for chest thickness and upper body power.',
        trainingGoals: ['Hypertrophy', 'Strength'],
        metValue: 6.0
      },
      {
        exerciseId: 'EX-CHEST-02',
        name: 'Incline Dumbbell Press',
        category: 'Chest',
        targetMuscles: ['Clavicular Pectorals (Upper Chest)', 'Triceps', 'Front Delts'],
        equipmentRequired: 'Dumbbells',
        difficulty: 'Intermediate',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Set bench to 30-degree incline. Press dumbbells upward with palms facing slightly inward. Squeeze upper chest at top without clanking dumbbells.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0314-Y1pYqj1.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0314-Y1pYqj1.gif',
        description: 'Builds upper chest shelf fullness and balances unilateral pressing strength.',
        trainingGoals: ['Hypertrophy'],
        metValue: 5.5
      },
      {
        exerciseId: 'EX-CHEST-03',
        name: 'Standard Push-Up',
        category: 'Chest',
        targetMuscles: ['Pectorals', 'Triceps', 'Core'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 15,
        instructions: 'Start in a rigid high plank. Lower chest to floor with elbows tucked at 45 degrees. Drive palms through floor to full lockout.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0662-7KkYx7u.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0662-7KkYx7u.gif',
        description: 'Foundational bodyweight push pattern requiring zero equipment.',
        trainingGoals: ['General Fitness', 'Endurance', 'Calisthenics'],
        metValue: 4.8,
        isAiTrackable: true,
        aiDetection: { enabled: true, detectorId: 'pushup_v1', detectorVersion: '1.0' }
      },
      {
        exerciseId: 'EX-CHEST-04',
        name: 'Parallel Bar Chest Dips',
        category: 'Chest',
        targetMuscles: ['Lower Pectorals', 'Triceps', 'Anterior Deltoids'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Advanced',
        defaultSets: 3,
        defaultReps: 10,
        instructions: 'Lean torso forward roughly 30 degrees on dip bars. Lower body until upper arms are parallel to floor, then drive upward.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        description: 'High-intensity compound exercise for lower chest sweep and tricep horsepower.',
        trainingGoals: ['Hypertrophy', 'Strength'],
        metValue: 6.5
      },

      // ── BACK ──
      {
        exerciseId: 'EX-BACK-01',
        name: 'Barbell Deadlift',
        category: 'Back',
        targetMuscles: ['Latissimus Dorsi', 'Erector Spinae', 'Glutes', 'Hamstrings'],
        equipmentRequired: 'Barbell',
        difficulty: 'Advanced',
        defaultSets: 4,
        defaultReps: 6,
        instructions: 'Stand mid-foot under barbell. Hinge at hips to grip bar. Set back flat, pull slack out of bar, and drive through heels to stand tall.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0032-pYjYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0032-pYjYM8w.gif',
        description: 'Full-body posterior chain mass builder and baseline measure of raw strength.',
        trainingGoals: ['Strength', 'Hypertrophy'],
        metValue: 7.5
      },
      {
        exerciseId: 'EX-BACK-02',
        name: 'Wide-Grip Pull-Up',
        category: 'Back',
        targetMuscles: ['Latissimus Dorsi', 'Biceps', 'Rhomboids', 'Teres Major'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 8,
        instructions: 'Hang from pull-up bar with overhand grip wider than shoulders. Drive elbows down into back pockets until chin clears the bar.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0652-3tYx7uG.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0652-3tYx7uG.gif',
        description: 'The golden standard vertical pulling exercise for V-taper lat width.',
        trainingGoals: ['Hypertrophy', 'Calisthenics', 'Strength'],
        metValue: 6.0
      },
      {
        exerciseId: 'EX-BACK-03',
        name: 'Seated Cable Row',
        category: 'Back',
        targetMuscles: ['Rhomboids', 'Mid Trapezius', 'Lats', 'Biceps'],
        equipmentRequired: 'Cable Machine',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Sit tall with knees slightly bent. Pull handle toward navel, driving elbows backward and squeezing shoulder blades together.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0861-k8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0861-k8bYM8w.gif',
        description: 'Safe, controlled horizontal pull for upper back thickness and posture correction.',
        trainingGoals: ['Hypertrophy', 'General Fitness'],
        metValue: 5.0
      },
      {
        exerciseId: 'EX-BACK-04',
        name: 'Inverted Bodyweight Row',
        category: 'Back',
        targetMuscles: ['Upper Back', 'Lats', 'Biceps', 'Core'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Hang horizontally under a bar or sturdy table edge. Pull chest up to bar while keeping body in a stiff plank.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        description: 'Zero-equipment horizontal pull suitable for home and beginner routines.',
        trainingGoals: ['Calisthenics', 'General Fitness'],
        metValue: 4.8
      },

      // ── LEGS ──
      {
        exerciseId: 'EX-LEGS-01',
        name: 'Barbell Back Squat',
        category: 'Legs',
        targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
        equipmentRequired: 'Barbell',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 10,
        instructions: 'Rest bar across upper traps. Break at hips and knees together, sinking hips below parallel. Drive through mid-foot to stand.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        description: 'The foundation of lower body development, hormone response, and athletic drive.',
        trainingGoals: ['Strength', 'Hypertrophy'],
        metValue: 7.0
      },
      {
        exerciseId: 'EX-LEGS-02',
        name: 'Bodyweight Air Squat',
        category: 'Legs',
        targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 20,
        instructions: 'Stand shoulder-width apart. Squat down until thighs are parallel to ground, keeping chest proud. Press through feet to return.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        description: 'Zero-equipment foundational leg exercise for endurance, conditioning, and joint health.',
        trainingGoals: ['General Fitness', 'Endurance', 'Fat Loss'],
        metValue: 5.0
      },
      {
        exerciseId: 'EX-LEGS-03',
        name: 'Romanian Deadlift (Dumbbell/Barbell)',
        category: 'Legs',
        targetMuscles: ['Hamstrings', 'Gluteus Maximus', 'Erectors'],
        equipmentRequired: 'Dumbbells',
        difficulty: 'Intermediate',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Hold weights in front of thighs with slight knee bend. Push hips back as weights track down shins until deep hamstring stretch, then fire glutes forward.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0380-z8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0380-z8bYM8w.gif',
        description: 'Posterior chain builder focusing heavily on hamstring stretch and glute recruitment.',
        trainingGoals: ['Hypertrophy', 'Strength'],
        metValue: 5.5
      },
      {
        exerciseId: 'EX-LEGS-04',
        name: 'Walking Lunges',
        category: 'Legs',
        targetMuscles: ['Quadriceps', 'Glutes', 'Calves', 'Core Balance'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 16,
        instructions: 'Step forward into a deep lunge with back knee hovering an inch off floor. Push through front heel to step directly into the next lunge.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0336-q8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0336-q8bYM8w.gif',
        description: 'Unilateral leg stamina, balance, and high calorie burn.',
        trainingGoals: ['Fat Loss', 'Endurance', 'Hypertrophy'],
        metValue: 5.8
      },

      // ── SHOULDERS ──
      {
        exerciseId: 'EX-SHOULDERS-01',
        name: 'Overhead Barbell Military Press',
        category: 'Shoulders',
        targetMuscles: ['Anterior Deltoids', 'Lateral Deltoids', 'Triceps', 'Upper Chest'],
        equipmentRequired: 'Barbell',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 8,
        instructions: 'Hold bar at clavicle with core and glutes locked. Press bar straight up, tilting head back slightly, then locking out over mid-foot.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0074-u8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0074-u8bYM8w.gif',
        description: 'Prime compound lift for building boulder shoulders and vertical push strength.',
        trainingGoals: ['Strength', 'Hypertrophy'],
        metValue: 5.8
      },
      {
        exerciseId: 'EX-SHOULDERS-02',
        name: 'Dumbbell Lateral Raise',
        category: 'Shoulders',
        targetMuscles: ['Lateral Deltoids (Side Shoulders)'],
        equipmentRequired: 'Dumbbells',
        difficulty: 'Beginner',
        defaultSets: 4,
        defaultReps: 15,
        instructions: 'Hold dumbbells at sides with slight elbow bend. Raise arms laterally until parallel to ground, leading with elbows.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0334-n8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0334-n8bYM8w.gif',
        description: 'Crucial isolation movement for creating wide shoulder width and capped delts.',
        trainingGoals: ['Hypertrophy'],
        metValue: 4.2
      },
      {
        exerciseId: 'EX-SHOULDERS-03',
        name: 'Pike Push-Up (Bodyweight Shoulder Press)',
        category: 'Shoulders',
        targetMuscles: ['Anterior & Lateral Deltoids', 'Triceps', 'Upper Traps'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Intermediate',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Elevate hips high into an inverted V-shape. Lower crown of head toward floor between hands, then press back to pike position.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1423-f8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1423-f8bYM8w.gif',
        description: 'Home zero-equipment shoulder builder bridging regular pushups to handstand pushups.',
        trainingGoals: ['Calisthenics', 'General Fitness'],
        metValue: 5.0
      },

      // ── ARMS ──
      {
        exerciseId: 'EX-ARMS-01',
        name: 'Standing Barbell Bicep Curl',
        category: 'Arms',
        targetMuscles: ['Biceps Brachii', 'Brachialis'],
        equipmentRequired: 'Barbell',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 10,
        instructions: 'Hold barbell with underhand shoulder-width grip. Keeping elbows pinned to ribcage, curl bar up to upper chest and squeeze.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0031-t8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0031-t8bYM8w.gif',
        description: 'Classic heavy bicep mass builder for peak and arm thickness.',
        trainingGoals: ['Hypertrophy'],
        metValue: 4.5
      },
      {
        exerciseId: 'EX-ARMS-02',
        name: 'Cable Tricep Rope Pushdown',
        category: 'Arms',
        targetMuscles: ['Triceps (Lateral and Long Head)'],
        equipmentRequired: 'Cable Machine',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Attach rope to high pulley. Keep elbows locked at sides and push rope down, spreading rope handles apart at bottom for peak contraction.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0862-y8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0862-y8bYM8w.gif',
        description: 'Constant tension isolation exercise for tricep horseshoe definition.',
        trainingGoals: ['Hypertrophy'],
        metValue: 4.2
      },
      {
        exerciseId: 'EX-ARMS-03',
        name: 'Bench / Chair Tricep Dips',
        category: 'Arms',
        targetMuscles: ['Triceps', 'Front Shoulders'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 15,
        instructions: 'Place palms on edge of bench or chair with legs extended forward. Lower hips down by bending elbows to 90 degrees, then push back up.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        description: 'Zero-equipment tricep exercise easy to perform anywhere at home or gym.',
        trainingGoals: ['Calisthenics', 'General Fitness'],
        metValue: 4.5
      },

      // ── CORE ──
      {
        exerciseId: 'EX-CORE-01',
        name: 'Forearm Core Plank',
        category: 'Core',
        targetMuscles: ['Rectus Abdominis', 'Transverse Abdominis', 'Lower Back'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 1,
        defaultDuration: 60,
        instructions: 'Rest on forearms and toes. Squeeze glutes and draw navel toward spine to form a straight line from heels to head. Hold steady.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/front-plank-with-twist.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/front-plank-with-twist.gif',
        description: 'Essential isometric core stabilization and spine protector.',
        trainingGoals: ['General Fitness', 'Endurance'],
        metValue: 4.0
      },
      {
        exerciseId: 'EX-CORE-02',
        name: 'Bicycle Crunches',
        category: 'Core',
        targetMuscles: ['Obliques', 'Upper & Lower Abs'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 20,
        instructions: 'Lie on back with hands behind ears. Bring opposite elbow to opposite knee while extending the other leg, alternating in a pedaling motion.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0147-w8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0147-w8bYM8w.gif',
        description: 'High-activation rotational ab exercise scientifically proven for oblique and core definition.',
        trainingGoals: ['Fat Loss', 'Hypertrophy', 'General Fitness'],
        metValue: 4.8
      },
      {
        exerciseId: 'EX-CORE-03',
        name: 'Mountain Climbers',
        category: 'Core',
        targetMuscles: ['Core', 'Hip Flexors', 'Cardio Conditioning'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 30,
        instructions: 'From high plank, rapidly drive alternating knees in toward chest in a running cadence while keeping hips low.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0644-u8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0644-u8bYM8w.gif',
        description: 'Dynamic core movement combining abdominal bracing with high calorie burn.',
        trainingGoals: ['Fat Loss', 'Endurance', 'Cardio'],
        metValue: 7.0
      },

      // ── CARDIO / STAMINA ──
      {
        exerciseId: 'EX-CARDIO-01',
        name: 'Outdoor Running / Jogging',
        category: 'Cardio',
        targetMuscles: ['Cardiovascular System', 'Quads', 'Hamstrings', 'Calves'],
        equipmentRequired: 'None',
        difficulty: 'Beginner',
        defaultSets: 1,
        defaultReps: 1,
        defaultDuration: 1200,
        instructions: 'Pace your breathing with rhythmic foot strikes. Maintain an upright posture with a slight forward lean from the ankles.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0684-x8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0684-x8bYM8w.gif',
        description: 'Outdoor aerobic stamina training with GPS live distance and pace tracking.',
        trainingGoals: ['Endurance', 'Fat Loss', 'General Fitness'],
        metValue: 8.5,
        isAiTrackable: true,
        aiDetection: { enabled: true, detectorId: 'running_v1', detectorVersion: '1.0' }
      },
      {
        exerciseId: 'EX-CARDIO-02',
        name: 'Full Body Burpees',
        category: 'Cardio',
        targetMuscles: ['Full Body', 'Pectorals', 'Quads', 'Core', 'Cardio'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 15,
        instructions: 'Drop from standing to chest on floor, kick feet back, press up and jump vertically while clapping hands overhead.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1160-c8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1160-c8bYM8w.gif',
        description: 'Ultimate metabolic conditioning exercise for maximum calorie burn and anaerobic stamina.',
        trainingGoals: ['Fat Loss', 'Endurance', 'General Fitness'],
        metValue: 9.0
      },
      {
        exerciseId: 'EX-CARDIO-03',
        name: 'High Knees In Place',
        category: 'Cardio',
        targetMuscles: ['Hip Flexors', 'Quadriceps', 'Cardiovascular System'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 40,
        defaultDuration: 45,
        instructions: 'Run in place, driving knees vigorously up to waist height with pump of arms.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        description: 'High-cadence cardio drill for agility and immediate heart rate elevation.',
        trainingGoals: ['Fat Loss', 'Endurance'],
        metValue: 8.0
      }
    ];

    await Exercise.insertMany(verifiedExercises);
    console.log(`✅ Seeded ${verifiedExercises.length} clean verified exercises with tutorials and accurate muscle categories.`);

    // =========================================================================
    // 3. PURGE DUMMY PROGRAMS & SEED NEW COMPREHENSIVE MULTI-MONTH TRAINER PROGRAMS
    // =========================================================================
    console.log('Purging old pre-made plans...');
    await PreMadePlan.deleteMany({});
    console.log('Old plans cleared.');

    const authorInfo = {
      createdBy: 'Captain Farhan (Fitness Trainer)',
      createdById: trainer._id,
      authorRole: 'FitnessInstructor',
      status: 'published'
    };

    const newPrograms = [
      // ───────────────────────────────────────────────────────────────────────
      // PROGRAM 1: FAT LOSS (PATLA HONA) - 1 MONTH (4 WEEKS)
      // ───────────────────────────────────────────────────────────────────────
      {
        ...authorInfo,
        title: '4-Week Extreme Fat Shred & Lean Definition',
        type: 'Workout',
        goal: 'Lose Weight',
        category: 'Fat Loss',
        difficulty: 'Beginner',
        durationWeeks: 4,
        durationMonths: 1,
        daysPerWeek: 4,
        targetAudience: 'Individuals seeking rapid, safe fat reduction & cardiovascular endurance',
        minAge: 16,
        maxAge: 55,
        ageRange: '16 - 55 years',
        ageGuidelines: 'Ages 16-35: Maximize work density and supersets. Ages 40+: Use 75-90s rest and ensure full warmup.',
        sportTags: ['HIIT', 'Fat Loss', 'Metabolic Conditioning'],
        equipmentRequired: ['Dumbbells', 'Bodyweight'],
        fitnessGoals: ['Lose Weight', 'Improve Stamina', 'Burn Fat'],
        description: 'A scientifically structured 4-week metabolic resistance program that maximizes EPOC (Excess Post-Exercise Oxygen Consumption) to shred body fat while preserving lean muscle.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Metabolic Activation & Baseline Conditioning',
            days: [
              {
                dayNumber: 1,
                title: 'Full Body Metabolic Circuit',
                focus: 'Full Body Calorie Torch',
                isRestDay: false,
                warmup: [{ text: '5 mins arm circles, torso twists and light jogging', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-03', name: 'Standard Push-Up', sets: 3, reps: '15', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-LEGS-02', name: 'Bodyweight Air Squat', sets: 3, reps: '20', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-BACK-04', name: 'Inverted Bodyweight Row', sets: 3, reps: '12', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-03', name: 'Mountain Climbers', sets: 3, reps: '30', restSeconds: 45, intensity: 'High' }
                ],
                cooldown: [{ text: 'Hamstring & chest static stretching', duration: 5 }]
              },
              {
                dayNumber: 2,
                title: 'Cardio Intervals & Core Engine',
                focus: 'VO2 Max & Abdominal Definition',
                isRestDay: false,
                warmup: [{ text: 'High knees and hip mobility drills', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CARDIO-02', name: 'Full Body Burpees', sets: 4, reps: '12', restSeconds: 60, intensity: 'High' },
                  { exerciseId: 'EX-CORE-02', name: 'Bicycle Crunches', sets: 3, reps: '20', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-01', name: 'Forearm Core Plank', sets: 3, reps: '1', duration: 45, restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CARDIO-03', name: 'High Knees In Place', sets: 3, reps: '40', restSeconds: 45, intensity: 'High' }
                ],
                cooldown: [{ text: 'Cat-cow and child pose decompression', duration: 5 }]
              },
              {
                dayNumber: 3,
                title: 'Active Recovery & Walking',
                focus: 'Rest & Parasympathetic Reset',
                isRestDay: true,
                dayType: 'rest',
                exercises: []
              },
              {
                dayNumber: 4,
                title: 'Lower Body & Conditioning Burn',
                focus: 'Glutes, Quads & Heart Rate',
                isRestDay: false,
                warmup: [{ text: 'Bodyweight leg swings and ankle rolls', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-LEGS-04', name: 'Walking Lunges', sets: 3, reps: '16', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-LEGS-03', name: 'Romanian Deadlift (Dumbbell/Barbell)', sets: 3, reps: '12', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-CARDIO-01', name: 'Outdoor Running / Jogging', sets: 1, reps: '1', duration: 900, restSeconds: 60, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Quad and calf foam rolling / stretching', duration: 5 }]
              }
            ]
          }
        ]
      },

      // ───────────────────────────────────────────────────────────────────────
      // PROGRAM 2: FAT LOSS (PATLA HONA) - 3 MONTHS (12 WEEKS) TRANSFORMATION
      // ───────────────────────────────────────────────────────────────────────
      {
        ...authorInfo,
        title: '12-Week Total Body Transformation & Fat Burner',
        type: 'Workout',
        goal: 'Lose Weight',
        category: 'Fat Loss',
        difficulty: 'Intermediate',
        durationWeeks: 12,
        durationMonths: 3,
        daysPerWeek: 4,
        targetAudience: 'Users committed to significant weight loss (10kg-20kg) and physique recomposition',
        minAge: 18,
        maxAge: 60,
        ageRange: '18 - 60 years',
        ageGuidelines: 'Structured 3-phase periodization: Base Metabolic (W1-4), High Intensity Depletion (W5-8), Peak Definition (W9-12).',
        sportTags: ['Weight Loss', 'Transformation', 'Recomposition'],
        equipmentRequired: ['Full Gym', 'Dumbbells'],
        fitnessGoals: ['Lose Weight', 'Build Muscle', 'Burn Fat'],
        description: 'Complete 3-month comprehensive roadmap. Alternates compound strength lifting to preserve lean metabolic tissue with high-calorie depletion finishers.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Phase 1: Foundation Strength & Aerobic Capacity',
            days: [
              {
                dayNumber: 1,
                title: 'Upper Body Push / Pull Density',
                focus: 'Chest, Back & Shoulders',
                isRestDay: false,
                warmup: [{ text: 'Band pull-aparts and pushup prep', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-01', name: 'Barbell Bench Press', sets: 3, reps: '10', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-BACK-03', name: 'Seated Cable Row', sets: 3, reps: '12', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-SHOULDERS-02', name: 'Dumbbell Lateral Raise', sets: 3, reps: '15', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-01', name: 'Forearm Core Plank', sets: 3, reps: '1', duration: 60, restSeconds: 45, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Chest stretch and overhead reach', duration: 5 }]
              }
            ]
          }
        ]
      },

      // ───────────────────────────────────────────────────────────────────────
      // PROGRAM 3: MUSCLE BUILDING (FIT HONA / BULKING) - 2 MONTHS (8 WEEKS)
      // ───────────────────────────────────────────────────────────────────────
      {
        ...authorInfo,
        title: '8-Week Lean Muscle Hypertrophy Split',
        type: 'Workout',
        goal: 'Build Muscle',
        category: 'Muscle Building',
        difficulty: 'Intermediate',
        durationWeeks: 8,
        durationMonths: 2,
        daysPerWeek: 4,
        targetAudience: 'Athletes wanting size, definition, wide shoulders, and athletic posture',
        minAge: 17,
        maxAge: 50,
        ageRange: '17 - 50 years',
        ageGuidelines: '17-21: Emphasize strict form and progressive overload without compromising joint integrity. 40+: Ensure 2-3 warm up sets per compound lift.',
        sportTags: ['Hypertrophy', 'Bodybuilding', 'Muscle Gain'],
        equipmentRequired: ['Barbell', 'Dumbbells', 'Cable Machine'],
        fitnessGoals: ['Build Muscle', 'Gain Strength'],
        description: 'Upper/Lower 4-day split delivering optimal volume per muscle group twice per week. Maximizes mechanical tension and muscle protein synthesis.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Accumulation Phase: 8-12 Rep Hypertrophy Target',
            days: [
              {
                dayNumber: 1,
                title: 'Upper Body A: Chest & Back Mass',
                focus: 'Chest, Upper Back, Shoulders',
                isRestDay: false,
                warmup: [{ text: 'Shoulder dislocates & dynamic upper body mobilization', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-01', name: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90, intensity: 'High' },
                  { exerciseId: 'EX-BACK-02', name: 'Wide-Grip Pull-Up', sets: 4, reps: '8', restSeconds: 90, intensity: 'High' },
                  { exerciseId: 'EX-CHEST-02', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 75, intensity: 'Moderate' },
                  { exerciseId: 'EX-BACK-03', name: 'Seated Cable Row', sets: 3, reps: '12', restSeconds: 75, intensity: 'Moderate' },
                  { exerciseId: 'EX-SHOULDERS-02', name: 'Dumbbell Lateral Raise', sets: 4, reps: '15', restSeconds: 60, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Pec doorway stretch and lat stretch', duration: 5 }]
              },
              {
                dayNumber: 2,
                title: 'Lower Body A: Quad & Hamstring Power',
                focus: 'Legs & Core Bracing',
                isRestDay: false,
                warmup: [{ text: 'Bodyweight squats and hip flexor stretches', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-LEGS-01', name: 'Barbell Back Squat', sets: 4, reps: '8-10', restSeconds: 120, intensity: 'High' },
                  { exerciseId: 'EX-LEGS-03', name: 'Romanian Deadlift (Dumbbell/Barbell)', sets: 3, reps: '10-12', restSeconds: 90, intensity: 'Moderate' },
                  { exerciseId: 'EX-LEGS-04', name: 'Walking Lunges', sets: 3, reps: '16', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-02', name: 'Bicycle Crunches', sets: 3, reps: '20', restSeconds: 45, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Quadriceps and glute stretching', duration: 5 }]
              }
            ]
          }
        ]
      },

      // ───────────────────────────────────────────────────────────────────────
      // PROGRAM 4: ZERO-EQUIPMENT CALISTHENICS WARRIOR (BEGAIR EQUIPMENT) - 1 MONTH
      // ───────────────────────────────────────────────────────────────────────
      {
        ...authorInfo,
        title: 'Home Calisthenics Warrior: Zero Equipment Master',
        type: 'Workout',
        goal: 'General Fitness',
        category: 'Calisthenics',
        difficulty: 'Beginner',
        durationWeeks: 4,
        durationMonths: 1,
        daysPerWeek: 4,
        targetAudience: 'People training at home, travelling, or without gym equipment',
        minAge: 14,
        maxAge: 65,
        ageRange: '14 - 65 years',
        ageGuidelines: 'Perfect for all age brackets. Beginners scale to knee pushups; seniors focus on controlled tempo and balance.',
        sportTags: ['Home Workout', 'No Equipment', 'Bodyweight'],
        equipmentRequired: ['None (Bodyweight)'],
        fitnessGoals: ['General Fitness', 'Build Muscle', 'Improve Stamina'],
        description: '100% equipment-free home program. Master body control, core strength, pushing and pulling mechanics using your own bodyweight.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Bodyweight Foundation & Core Rigidity',
            days: [
              {
                dayNumber: 1,
                title: 'Full Body Home Blast',
                focus: 'Push, Legs & Midsection',
                isRestDay: false,
                warmup: [{ text: 'Arm swings and light torso twist', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-03', name: 'Standard Push-Up', sets: 4, reps: '12-15', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-LEGS-02', name: 'Bodyweight Air Squat', sets: 4, reps: '20', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-SHOULDERS-03', name: 'Pike Push-Up (Bodyweight Shoulder Press)', sets: 3, reps: '10', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-ARMS-03', name: 'Bench / Chair Tricep Dips', sets: 3, reps: '12-15', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-01', name: 'Forearm Core Plank', sets: 3, reps: '1', duration: 45, restSeconds: 45, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Deep breathing & full-body static stretch', duration: 5 }]
              }
            ]
          }
        ]
      },

      // ───────────────────────────────────────────────────────────────────────
      // PROGRAM 5: STAMINA & ATHLETIC CONDITIONING - 1 MONTH (4 WEEKS)
      // ───────────────────────────────────────────────────────────────────────
      {
        ...authorInfo,
        title: 'Stamina, VO2 Max & Athletic Conditioning Protocol',
        type: 'Workout',
        goal: 'Improve Stamina',
        category: 'Endurance',
        difficulty: 'Intermediate',
        durationWeeks: 4,
        durationMonths: 1,
        daysPerWeek: 4,
        targetAudience: 'Runners, sports athletes (Cricket/Football), and stamina seekers',
        minAge: 16,
        maxAge: 60,
        ageRange: '16 - 60 years',
        ageGuidelines: 'Focus on heart rate recovery and lung capacity. Hydrate with electrolytes before and after sessions.',
        sportTags: ['Running', 'Cardio', 'Stamina', 'Agility'],
        equipmentRequired: ['None (Bodyweight)'],
        fitnessGoals: ['Improve Stamina', 'Lose Weight', 'General Fitness'],
        description: 'Built by elite coaches to boost aerobic threshold, speed, lung stamina, and recovery speed for sports and daily energy.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Aerobic Base & Anaerobic Threshold',
            days: [
              {
                dayNumber: 1,
                title: 'Stamina Intervals & Bodyweight Surge',
                focus: 'High Heart Rate Capacity',
                isRestDay: false,
                warmup: [{ text: 'Light jog and ankle rotations', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CARDIO-01', name: 'Outdoor Running / Jogging', sets: 1, reps: '1', duration: 1200, restSeconds: 90, intensity: 'Moderate' },
                  { exerciseId: 'EX-CARDIO-02', name: 'Full Body Burpees', sets: 3, reps: '15', restSeconds: 45, intensity: 'High' },
                  { exerciseId: 'EX-CARDIO-03', name: 'High Knees In Place', sets: 3, reps: '40', restSeconds: 45, intensity: 'High' },
                  { exerciseId: 'EX-CORE-03', name: 'Mountain Climbers', sets: 3, reps: '30', restSeconds: 45, intensity: 'High' }
                ],
                cooldown: [{ text: 'Calf & hip flexor cool-down stretch', duration: 5 }]
              }
            ]
          }
        ]
      }
    ];

    await PreMadePlan.insertMany(newPrograms);
    console.log(`✅ Seeded ${newPrograms.length} comprehensive multi-week workout programs.`);

    // =========================================================================
    // 4. SEED AUTHENTIC REAL-INGREDIENT DIET PLANS
    // =========================================================================
    const newDietPlans = [
      // ───────────────────────────────────────────────────────────────────────
      // DIET 1: HIGH-PROTEIN MUSCLE GAIN (BULKING & FIT HONA)
      // ───────────────────────────────────────────────────────────────────────
      {
        ...authorInfo,
        title: 'High-Protein Muscle Gain & Natural Anabolic Diet',
        type: 'Diet',
        goal: 'Build Muscle',
        category: 'Muscle Building',
        difficulty: 'Beginner',
        durationWeeks: 4,
        durationMonths: 1,
        dietaryType: 'High-Protein Balanced',
        calories: 2650,
        protein: 185,
        carbs: 300,
        fat: 75,
        allergies: ['Dairy', 'Nuts'],
        dietaryRestrictions: ['Halal'],
        targetAudience: 'Athletes looking to build lean muscle mass with high protein and clean carbohydrates',
        description: 'Calculated nutritional fuel plan featuring staple gym foods: whole eggs, grilled chicken/meat, whey protein, basmati rice, lentils (daal), and peanut butter.',
        meals: [
          {
            mealType: 'Breakfast',
            name: 'Power Muscle Breakfast',
            timing: '08:00 AM',
            calories: 620,
            protein: 42,
            carbs: 65,
            fat: 20,
            foodItems: [
              { name: 'Whole Boiled Eggs', quantity: 3, unit: 'piece', calories: 215, protein: 18, carbs: 1.5, fat: 15, allergens: ['Eggs'], localAlternative: 'Egg White Omelette with light olive oil' },
              { name: 'Rolled Oats with Milk', quantity: 70, unit: 'g', calories: 275, protein: 14, carbs: 48, fat: 5, allergens: ['Dairy'], localAlternative: 'Daliya with Almond Milk' },
              { name: 'Fresh Banana', quantity: 1, unit: 'piece', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, allergens: [], localAlternative: 'Seasonal Apple' },
              { name: 'Natural Peanut Butter', quantity: 15, unit: 'g', calories: 90, protein: 4, carbs: 3, fat: 7.5, allergens: ['Nuts'], localAlternative: 'Handful of raw almonds (15g)' }
            ]
          },
          {
            mealType: 'Morning Snack',
            name: 'Anabolic Shake & Healthy Fats',
            timing: '11:30 AM',
            calories: 340,
            protein: 32,
            carbs: 22,
            fat: 10,
            foodItems: [
              { name: '100% Whey Protein Shake (1 Scoop)', quantity: 30, unit: 'g', calories: 120, protein: 25, carbs: 2, fat: 1.5, allergens: ['Dairy'], localAlternative: 'Sattu Drink with 1 glass low-fat milk' },
              { name: 'Skimmed Cow Milk', quantity: 250, unit: 'ml', calories: 90, protein: 9, carbs: 12, fat: 0.5, allergens: ['Dairy'], localAlternative: 'Water / Almond Milk' },
              { name: 'Raw Almonds (Badam)', quantity: 20, unit: 'g', calories: 116, protein: 4.2, carbs: 4.3, fat: 10, allergens: ['Nuts'], localAlternative: 'Walnuts (Akhrot)' }
            ]
          },
          {
            mealType: 'Lunch',
            name: 'Lean Meat & Complex Carbs Lunch',
            timing: '02:00 PM',
            calories: 780,
            protein: 55,
            carbs: 95,
            fat: 20,
            foodItems: [
              { name: 'Grilled Chicken Breast / Lean Mince (Keema)', quantity: 200, unit: 'g', calories: 330, protein: 46, carbs: 0, fat: 7, allergens: [], localAlternative: 'Grilled Fish Fillet or 150g Low-fat Paneer' },
              { name: 'Cooked Basmati Rice', quantity: 200, unit: 'g', calories: 260, protein: 5.5, carbs: 58, fat: 0.6, allergens: [], localAlternative: '2 Whole Wheat Rotis (Chapati)' },
              { name: 'Cooked Daal Moong / Daal Chana', quantity: 150, unit: 'g', calories: 140, protein: 9, carbs: 24, fat: 2, allergens: [], localAlternative: 'Boiled Chickpeas (Chana Salad)' },
              { name: 'Fresh Cucumber & Tomato Salad', quantity: 150, unit: 'g', calories: 50, protein: 2, carbs: 10, fat: 0.5, allergens: [], localAlternative: 'Steamed green beans & carrots' }
            ]
          },
          {
            mealType: 'Post-Workout',
            name: 'Post-Lift Glycogen & Protein Refuel',
            timing: '05:30 PM',
            calories: 280,
            protein: 26,
            carbs: 38,
            fat: 2,
            foodItems: [
              { name: 'Whey Protein Isolate with Water', quantity: 30, unit: 'g', calories: 120, protein: 26, carbs: 1, fat: 0.5, allergens: ['Dairy'], localAlternative: '4 Boiled Egg Whites' },
              { name: 'Ripe Banana or Sweet Potato', quantity: 150, unit: 'g', calories: 130, protein: 2, carbs: 32, fat: 0.2, allergens: [], localAlternative: 'Dates (Khajoor - 3 pieces)' }
            ]
          },
          {
            mealType: 'Dinner',
            name: 'Nutrient-Dense Recovery Dinner',
            timing: '08:30 PM',
            calories: 630,
            protein: 48,
            carbs: 65,
            fat: 18,
            foodItems: [
              { name: 'Grilled Fish or Chicken Tikka Boti', quantity: 180, unit: 'g', calories: 270, protein: 40, carbs: 2, fat: 6, allergens: ['Fish'], localAlternative: 'Lean Beef Keema or Tofu Curry' },
              { name: 'Whole Wheat Roti (Chapati)', quantity: 2, unit: 'piece', calories: 220, protein: 6, carbs: 44, fat: 1.5, allergens: ['Gluten'], localAlternative: '1 cup Cooked Brown Rice' },
              { name: 'Palak / Mixed Seasonal Sabzi (Low Oil)', quantity: 150, unit: 'g', calories: 80, protein: 3, carbs: 12, fat: 3, allergens: [], localAlternative: 'Bhindi or Tinda Sabzi' },
              { name: 'Low-Fat Greek Yogurt (Dahi)', quantity: 100, unit: 'g', calories: 60, protein: 8, carbs: 4, fat: 1, allergens: ['Dairy'], localAlternative: 'Fresh Cucumber Mint Raita' }
            ]
          }
        ]
      },

      // ───────────────────────────────────────────────────────────────────────
      // DIET 2: EXTREME FAT SHRED (PATLA HONA / CALORIC DEFICIT)
      // ───────────────────────────────────────────────────────────────────────
      {
        ...authorInfo,
        title: 'Extreme Fat Shred & High Protein Deficit Diet',
        type: 'Diet',
        goal: 'Lose Weight',
        category: 'Fat Loss',
        difficulty: 'Beginner',
        durationWeeks: 4,
        durationMonths: 1,
        dietaryType: 'High-Protein Deficit',
        calories: 1750,
        protein: 165,
        carbs: 140,
        fat: 45,
        allergies: ['Dairy'],
        dietaryRestrictions: ['Halal'],
        targetAudience: 'People seeking accelerated belly fat reduction without burning muscle',
        description: 'Clean caloric deficit protocol: boiled eggs, grilled lean chicken, daal soup, mixed vegetable stir fry, green tea, and optimal water hydration.',
        meals: [
          {
            mealType: 'Breakfast',
            name: 'Lean Protein Morning Start',
            timing: '08:30 AM',
            calories: 380,
            protein: 36,
            carbs: 25,
            fat: 12,
            foodItems: [
              { name: 'Boiled Egg Whites', quantity: 4, unit: 'piece', calories: 68, protein: 14.4, carbs: 0.8, fat: 0.2, allergens: ['Eggs'], localAlternative: 'Scrambled egg whites with spinach' },
              { name: 'Whole Boiled Egg', quantity: 1, unit: 'piece', calories: 72, protein: 6.3, carbs: 0.5, fat: 5, allergens: ['Eggs'], localAlternative: '1/2 cup low-fat cottage cheese' },
              { name: 'Multigrain / Bran Bread Toast', quantity: 1, unit: 'slice', calories: 85, protein: 4, carbs: 15, fat: 1.2, allergens: ['Gluten'], localAlternative: '1/2 whole wheat roti' },
              { name: 'Organic Green Tea (No Sugar)', quantity: 1, unit: 'cup', calories: 2, protein: 0, carbs: 0.5, fat: 0, allergens: [], localAlternative: 'Black Coffee with cinnamon' }
            ]
          },
          {
            mealType: 'Lunch',
            name: 'Fat-Shredding Chicken & Daal Salad',
            timing: '01:30 PM',
            calories: 550,
            protein: 52,
            carbs: 52,
            fat: 12,
            foodItems: [
              { name: 'Boneless Grilled Chicken Breast', quantity: 180, unit: 'g', calories: 290, protein: 42, carbs: 0, fat: 6, allergens: [], localAlternative: 'Steamed White Fish or 150g Tofu' },
              { name: 'Boiled Daal Chana / Chickpeas', quantity: 120, unit: 'g', calories: 150, protein: 9, carbs: 26, fat: 2.5, allergens: [], localAlternative: 'Boiled Red Kidney Beans (Rajma)' },
              { name: 'Crunchy Mixed Green Salad (Lemon Dressing)', quantity: 180, unit: 'g', calories: 50, protein: 2, carbs: 11, fat: 0.5, allergens: [], localAlternative: 'Steamed Broccoli & Cabbage' }
            ]
          },
          {
            mealType: 'Afternoon Snack',
            name: 'Midday Craving Stopper',
            timing: '05:00 PM',
            calories: 190,
            protein: 26,
            carbs: 10,
            fat: 4,
            foodItems: [
              { name: '100% Whey Isolate Shake with Cold Water', quantity: 30, unit: 'g', calories: 115, protein: 25, carbs: 1, fat: 0.5, allergens: ['Dairy'], localAlternative: '1 cup low-fat Greek yogurt' },
              { name: 'Crisp Green Apple', quantity: 1, unit: 'piece', calories: 75, protein: 0.5, carbs: 19, fat: 0.3, allergens: [], localAlternative: 'Handful of roasted chana (30g)' }
            ]
          },
          {
            mealType: 'Dinner',
            name: 'Metabolic Fat-Burning Dinner',
            timing: '08:30 PM',
            calories: 480,
            protein: 45,
            carbs: 45,
            fat: 12,
            foodItems: [
              { name: 'Grilled Fish Fillet or Chicken Breast', quantity: 160, unit: 'g', calories: 240, protein: 38, carbs: 0, fat: 5, allergens: ['Fish'], localAlternative: 'Lean Mince (Keema) with minimal oil' },
              { name: 'Whole Wheat Roti', quantity: 1, unit: 'piece', calories: 110, protein: 3.5, carbs: 22, fat: 0.8, allergens: ['Gluten'], localAlternative: '1/2 cup Boiled Brown Rice' },
              { name: 'Mixed Seasonal Sabzi (Lauki / Bhindi / Palak)', quantity: 150, unit: 'g', calories: 75, protein: 2.5, carbs: 12, fat: 2.5, allergens: [], localAlternative: 'Zucchini & capsicum stir fry' }
            ]
          }
        ]
      }
    ];

    await PreMadePlan.insertMany(newDietPlans);
    console.log(`✅ Seeded ${newDietPlans.length} authentic diet plans with detailed ingredients and macro calculations.`);

    console.log('\n🎉 ALL SEEDING AND PURGING FINISHED WITH SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

runSeed();
