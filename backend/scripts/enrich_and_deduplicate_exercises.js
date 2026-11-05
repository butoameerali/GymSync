import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
import Exercise from '../models/Exercise.js';
import PreMadePlan from '../models/PreMadePlan.js';
import { createClient } from '@supabase/supabase-js';

async function run() {
  console.log('🚀 Starting Exercise Enrichment, Deduplication & Home/Female Workout Enhancement...');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'gymsync' });
  console.log('✅ Connected to MongoDB');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

  // 1. DEDUPLICATION
  console.log('🔍 Checking for duplicate exercises...');
  const allExercises = await Exercise.find({}).sort({ createdAt: 1 });
  const seenNames = new Map();
  const toDeleteIds = [];
  const toDeleteExerciseIds = [];

  for (const ex of allExercises) {
    const key = ex.name.toLowerCase().trim();
    if (seenNames.has(key)) {
      // Prioritize keeping EX-CHEST / EX-BACK (our authoritative) over EX-H-
      const existing = seenNames.get(key);
      if (existing.exerciseId.startsWith('EX-H-') && !ex.exerciseId.startsWith('EX-H-')) {
        // Delete the previous EX-H- and keep this clean one
        toDeleteIds.push(existing._id);
        toDeleteExerciseIds.push(existing.exerciseId);
        seenNames.set(key, ex);
      } else {
        // Delete the duplicate
        toDeleteIds.push(ex._id);
        toDeleteExerciseIds.push(ex.exerciseId);
      }
    } else {
      seenNames.set(key, ex);
    }
  }

  if (toDeleteIds.length > 0) {
    console.log(`🗑️ Deleting ${toDeleteIds.length} duplicate exercises...`);
    await Exercise.deleteMany({ _id: { $in: toDeleteIds } });
    if (supabase) {
      await supabase.from('exercises').delete().in('exercise_id', toDeleteExerciseIds);
    }
    console.log('✅ Duplicates removed successfully!');
  } else {
    console.log('✅ No duplicate exercises found.');
  }

  // 2. ADD MISSING HOME & FEMALE-SPECIFIC EXERCISES WITHOUT EQUIPMENT
  console.log('🌸 Adding Essential Home & Female-Focused Bodyweight Exercises...');
  const specialHomeExercises = [
    {
      exerciseId: 'EX-HOME-GLUTE-01',
      name: 'Bodyweight Glute Kickback (Donkey Kicks)',
      category: 'Legs',
      targetMuscles: ['Glutes', 'Hamstrings', 'Core'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      defaultSets: 3,
      defaultReps: 15,
      isHomeWorkout: true,
      targetGender: 'Female',
      primaryBenefits: ['Glute Toning & Lift', 'Hip Strength', 'Zero Equipment Home Friendly', 'Posture Improvement'],
      calorieEstimation: {
        metValue: 4.5,
        intensity: 'moderate',
        estimatedKcalPerMinute: 5.5
      },
      instructions: 'Hands aur knees par quadrup stance lein. Spine neutral rakhte hue ek leg ko 90 degree par peeche aur upar kick karein, glutes ko squeeze karein, aur control ke sath wapas layein.',
      description: 'Ghar par baghair kisi equipment ke glutes aur hips ko tone aur lift karne ke liye best exercise. 1 minute me taqreeban 5-6 kcal burn hoti hain.',
      mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0860-HEJ6DIX.gif',
      gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0860-HEJ6DIX.gif'
    },
    {
      exerciseId: 'EX-HOME-GLUTE-02',
      name: 'Fire Hydrants (Hip Abduction On All Fours)',
      category: 'Legs',
      targetMuscles: ['Gluteus Medius', 'Outer Hips', 'Core'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      defaultSets: 3,
      defaultReps: 15,
      isHomeWorkout: true,
      targetGender: 'Female',
      primaryBenefits: ['Hip Dip Reduction', 'Outer Glute Toning', 'Pelvic Stability', 'Knee Pain Relief'],
      calorieEstimation: {
        metValue: 4.5,
        intensity: 'moderate',
        estimatedKcalPerMinute: 5.2
      },
      instructions: 'Hands aur knees par aakar ek leg ko 90 degree bent rakhte hue side ki taraf uthayein. Hip muscles ko contract karein aur slowly wapas layein.',
      description: 'Women ke liye outer hips aur gluteus medius ko shape karne aur hip dip tone karne ki number 1 home exercise.',
      mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abductors/side-hip-abduction.gif',
      gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abductors/side-hip-abduction.gif'
    },
    {
      exerciseId: 'EX-HOME-GLUTE-03',
      name: 'Clamshells (Side-Lying Hip Abduction)',
      category: 'Legs',
      targetMuscles: ['Gluteus Medius', 'Hip Stabilizers'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      defaultSets: 3,
      defaultReps: 20,
      isHomeWorkout: true,
      targetGender: 'Female',
      primaryBenefits: ['Pelvic Floor Stability', 'Hip Toning', 'Lower Back Decompression'],
      calorieEstimation: {
        metValue: 4.0,
        intensity: 'moderate',
        estimatedKcalPerMinute: 4.8
      },
      instructions: 'Karwat lekar laye karein, knees 45 degree par bend hon. Feet ko touch rakhte hue upar wale knee ko clam ki tarah open karein aur slow wapas layein.',
      description: 'Ghar par sofa ya bed par bhi ki ja sakti hai, pelvic muscles aur hip shape ke liye nihayat mufeed hai.',
      mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abductors/straight-leg-outer-hip-abductor.gif',
      gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abductors/straight-leg-outer-hip-abductor.gif'
    },
    {
      exerciseId: 'EX-HOME-CARDIO-01',
      name: 'Jumping Jacks (Full Body Fat Burner)',
      category: 'Cardio',
      targetMuscles: ['Full Body', 'Calves', 'Shoulders', 'Cardiovascular'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      defaultSets: 4,
      defaultReps: 30,
      isHomeWorkout: true,
      targetGender: 'All',
      primaryBenefits: ['Fast Fat Loss', 'High Calorie Burn', 'Stamina & Heart Health', 'Zero Space Home Cardio'],
      calorieEstimation: {
        metValue: 8.5,
        intensity: 'high',
        estimatedKcalPerMinute: 9.5
      },
      instructions: 'Seedha khade hon, ek jump ke sath legs ko bahar phailayein aur haathon ko sar ke upar taali ki tarah milayein, phir jump ke sath wapas starting position par aayein.',
      description: 'Ghar me tezi se charbi pighlane aur stamina barhane ke liye top tier cardio exercise. 1 minute me taqreeban 9-10 calories burn karta hai.',
      mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/jack-jump-male.gif',
      gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/jack-jump-male.gif'
    },
    {
      exerciseId: 'EX-HOME-LEGS-01',
      name: 'Wall Sit (Static Quad & Core Hold)',
      category: 'Legs',
      targetMuscles: ['Quadriceps', 'Glutes', 'Core', 'Hamstrings'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      defaultSets: 3,
      defaultDuration: 45,
      isHomeWorkout: true,
      targetGender: 'All',
      primaryBenefits: ['Leg Strength & Stamina', 'Knee Joint Strengthening', 'Core Isometric Control'],
      calorieEstimation: {
        metValue: 5.5,
        intensity: 'moderate',
        estimatedKcalPerMinute: 6.5
      },
      instructions: 'Deewar se peeth laga kar kursi ki tarah 90 degree par baith jayein. Haath aage ya thigh par hon. 30 se 60 seconds tak position hold karein.',
      description: 'Baghair kisi machine ya dumbbell ke taango ko pathar ki tarah mazboot karne aur knee joints ko protect karne wali home hold exercise.',
      mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/march-sit-wall.gif',
      gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/march-sit-wall.gif'
    },
    {
      exerciseId: 'EX-HOME-CORE-01',
      name: 'Bird Dog (Core & Back Stability)',
      category: 'Core',
      targetMuscles: ['Erector Spinae', 'Glutes', 'Rectus Abdominis', 'Shoulders'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      defaultSets: 3,
      defaultReps: 12,
      isHomeWorkout: true,
      targetGender: 'All',
      primaryBenefits: ['Lower Back Pain Relief', 'Deep Core Stability', 'Safe Postpartum & Beginner Core'],
      calorieEstimation: {
        metValue: 4.2,
        intensity: 'moderate',
        estimatedKcalPerMinute: 5.0
      },
      instructions: 'Hands aur knees par aakar daayan haath seedha aage aur baayan paon seedha peeche stretch karein. 2 second hold kar ke switch karein.',
      description: 'Kamar dard se nijaat aur flat tummy ke liye safe aur nihayat mufeed home stability exercise.',
      mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0276-iny3m5y.gif',
      gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0276-iny3m5y.gif'
    },
    {
      exerciseId: 'EX-HOME-CHEST-01',
      name: 'Knee Push-Ups (Female & Beginner Friendly)',
      category: 'Chest',
      targetMuscles: ['Chest', 'Triceps', 'Front Delts', 'Core'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Beginner',
      defaultSets: 3,
      defaultReps: 12,
      isHomeWorkout: true,
      targetGender: 'Female',
      primaryBenefits: ['Upper Body Toning', 'Firm Chest & Arms', 'Beginner Calisthenics'],
      calorieEstimation: {
        metValue: 5.5,
        intensity: 'moderate',
        estimatedKcalPerMinute: 6.2
      },
      instructions: 'Ghutno par support lete hue push-up position banayein. Chest ko zameen ke qareeb layein aur haathon se push kar ke wapas uthein.',
      description: 'Women aur beginners ke liye regular push-up ki modified aur asan form, jo arms aur upper body ko tone karti hai.',
      mediaUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-7KkYx7u.gif',
      gifUrl: 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0662-7KkYx7u.gif'
    },
    {
      exerciseId: 'EX-HOME-LEGS-02',
      name: 'Curtsy Lunges (Lower Body & Glute Shaper)',
      category: 'Legs',
      targetMuscles: ['Glutes', 'Quads', 'Inner Thighs', 'Calves'],
      equipmentRequired: 'Bodyweight',
      difficulty: 'Intermediate',
      defaultSets: 3,
      defaultReps: 12,
      isHomeWorkout: true,
      targetGender: 'Female',
      primaryBenefits: ['Thigh Slimming & Glute Lift', 'Balance & Coordination', 'Lean Legs'],
      calorieEstimation: {
        metValue: 6.5,
        intensity: 'high',
        estimatedKcalPerMinute: 7.5
      },
      instructions: 'Khade hon, ek paon ko doosre ke peeche cross kar ke curtsy bow ki tarah lunge karein. Agla ghutna 90 degree par bend ho. Dono sides repeat karein.',
      description: 'Hips aur rano (thighs) ko tone karne aur curvy aesthetic shape dene ke liye ideal bodyweight exercise.',
      mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/walking-lunge.gif',
      gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/walking-lunge.gif'
    }
  ];

  for (const exData of specialHomeExercises) {
    await Exercise.updateOne(
      { exerciseId: exData.exerciseId },
      { $set: exData },
      { upsert: true }
    );
    if (supabase) {
      await supabase.from('exercises').upsert({
        exercise_id: exData.exerciseId,
        name: exData.name,
        target_muscles: exData.targetMuscles,
        equipment_required: exData.equipmentRequired,
        difficulty: exData.difficulty,
        fitness_paths: ['Home Calisthenics', 'Fat Loss & Tone', 'Female Fitness'],
        medical_avoid_if: [],
        joint_pain_avoid_if: [],
        media_url: exData.mediaUrl,
        description: exData.description,
        is_ai_trackable: false,
        ai_detection: { enabled: false }
      }, { onConflict: 'exercise_id' });
    }
    console.log(`  + Seeded home exercise: ${exData.name}`);
  }

  // 3. ENRICH ALL REMAINING EXERCISES WITH CALORIES, HOME TAGS, AND GENDER TARGETING
  console.log('⚡ Enriching all exercises with Calorie burn rates, Gender tags, and Home workout flags...');
  const exercisesToUpdate = await Exercise.find({});
  let updatedCount = 0;

  const femaleKeywords = [
    'glute', 'hip', 'clamshell', 'hydrant', 'kickback', 'butt', 'thigh', 'pelvic', 
    'abductor', 'adductor', 'curtsy', 'sumo squat', 'bridge'
  ];

  for (const ex of exercisesToUpdate) {
    let changed = false;
    const nameLower = ex.name.toLowerCase();
    const equipLower = (ex.equipmentRequired || '').toLowerCase();

    // Determine isHomeWorkout
    const isHome = equipLower.includes('bodyweight') || equipLower.includes('body weight') || equipLower.includes('none');
    if (ex.isHomeWorkout !== isHome) {
      ex.isHomeWorkout = isHome;
      changed = true;
    }

    // Determine targetGender
    let gender = 'All';
    if (femaleKeywords.some(kw => nameLower.includes(kw))) {
      gender = 'Female'; // Tailored especially for female lower body / toning goals
    }
    if (ex.targetGender !== gender) {
      ex.targetGender = gender;
      changed = true;
    }

    // Compute realistic Calorie and Energy Estimation
    let met = 5.0;
    let kcalMin = 6.0;
    let intensity = 'moderate';

    if (ex.category === 'Cardio' || nameLower.includes('burpee') || nameLower.includes('jack') || nameLower.includes('jump')) {
      met = 8.5;
      kcalMin = 9.5;
      intensity = 'vigorous';
    } else if (ex.category === 'Legs' || nameLower.includes('squat') || nameLower.includes('deadlift') || nameLower.includes('lunge')) {
      met = 6.5;
      kcalMin = 7.5;
      intensity = 'high';
    } else if (ex.category === 'Chest' || ex.category === 'Back') {
      met = 5.5;
      kcalMin = 6.5;
      intensity = 'moderate';
    } else if (ex.category === 'Core' || nameLower.includes('plank') || nameLower.includes('crunch')) {
      met = 4.5;
      kcalMin = 5.2;
      intensity = 'moderate';
    } else if (nameLower.includes('stretch') || nameLower.includes('yoga') || nameLower.includes('roller')) {
      met = 3.0;
      kcalMin = 3.5;
      intensity = 'low';
    }

    if (!ex.calorieEstimation || ex.calorieEstimation.metValue !== met) {
      ex.calorieEstimation = {
        metValue: met,
        intensity: intensity,
        estimatedKcalPerMinute: kcalMin
      };
      changed = true;
    }

    // Populate primaryBenefits if empty
    if (!ex.primaryBenefits || ex.primaryBenefits.length === 0) {
      if (ex.category === 'Cardio') {
        ex.primaryBenefits = ['High Calorie Burn & Fat Loss', 'Cardiovascular Stamina', 'Endurance Boost'];
      } else if (gender === 'Female') {
        ex.primaryBenefits = ['Glute & Hip Toning', 'Waist & Thigh Shaping', 'Pelvic Stability'];
      } else if (ex.category === 'Chest') {
        ex.primaryBenefits = ['Upper Body Pushing Power', 'Chest Hypertrophy', 'Shoulder & Tricep Definition'];
      } else if (ex.category === 'Back') {
        ex.primaryBenefits = ['V-Taper & Back Width', 'Spinal Posture Health', 'Pulling Strength'];
      } else if (ex.category === 'Legs') {
        ex.primaryBenefits = ['Lower Body Explosive Power', 'Quad & Hamstring Mass', 'Athletic Strength'];
      } else if (ex.category === 'Core') {
        ex.primaryBenefits = ['Flat Tummy & Core Compression', 'Spine Support', 'Six-Pack Definition'];
      } else {
        ex.primaryBenefits = ['Muscle Hypertrophy', 'Functional Strength', 'Physical Fitness'];
      }
      changed = true;
    }

    if (changed) {
      await ex.save();
      updatedCount++;
    }
  }

  console.log(`✅ Successfully enriched and updated ${updatedCount} exercises in database!`);

  // Count totals for summary
  const totalInDb = await Exercise.countDocuments();
  const homeCount = await Exercise.countDocuments({ isHomeWorkout: true });
  const femaleCount = await Exercise.countDocuments({ targetGender: 'Female' });
  console.log(`📊 Current DB Status:`);
  console.log(`   - Total Unique Exercises: ${totalInDb}`);
  console.log(`   - Home / Without Equipment Exercises: ${homeCount}`);
  console.log(`   - Female-Focused / Tailored Exercises: ${femaleCount}`);

  await mongoose.disconnect();
  console.log('🏁 Finished!');
}

run().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
