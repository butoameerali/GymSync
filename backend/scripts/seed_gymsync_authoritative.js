import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Exercise from '../models/Exercise.js';
import PreMadePlan from '../models/PreMadePlan.js';

const seedGymsync = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to authoritative database for seeding.');

    // 1. Trainer account
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
      console.log('✅ Created Fitness Trainer:', trainer.email);
    } else {
      trainer.role = 'FitnessInstructor';
      trainer.accountStatus = 'Active';
      trainer.isEmailVerified = true;
      trainer.password = hashedPassword;
      await trainer.save();
      console.log('✅ Updated Fitness Trainer:', trainer.email);
    }

    // 2. Exercises - Clean & Verified
    await Exercise.deleteMany({});
    console.log('Purged all existing exercises.');

    const verifiedExercises = [
      {
        exerciseId: 'EX-CHEST-01',
        name: 'Barbell Bench Press',
        category: 'Chest',
        targetMuscles: ['Pectorals (Mid/Lower)', 'Triceps', 'Anterior Deltoids'],
        equipmentRequired: 'Barbell',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 10,
        instructions: 'Flat bench par layen. Barbell ko shoulder se thora wide pakrein. Bar ko chest ke darmiyan tak smoothly layen, phir controlled tareeqe se press karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/barbell-bench-press.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/barbell-bench-press.gif',
        description: 'Chest ki overall thickness aur upper body power ke liye best compound exercise.',
        trainingGoals: ['Hypertrophy', 'Strength'],
        metValue: 6.0
      },
      {
        exerciseId: 'EX-CHEST-02',
        name: 'Incline Dumbbell Press',
        category: 'Chest',
        targetMuscles: ['Upper Chest (Clavicular)', 'Front Delts', 'Triceps'],
        equipmentRequired: 'Dumbbells',
        difficulty: 'Intermediate',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Bench ko 30 degree incline par set karein. Dumbbells ko upper chest level se press karein aur upper chest ko squeeze karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0314-Y1pYqj1.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0314-Y1pYqj1.gif',
        description: 'Upper chest shelf ko bharnay aur shape bananay ke liye ideal.',
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
        instructions: 'High plank position banayein. Chest ko zameen tak layen aur elbows ko 45 degree par rakhein. Palms se floor ko push karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0662-7KkYx7u.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0662-7KkYx7u.gif',
        description: 'Ghar par begair kisi equipment ke chest aur triceps ki sab se behtareen exercise.',
        trainingGoals: ['General Fitness', 'Endurance', 'Calisthenics'],
        metValue: 4.8,
        isAiTrackable: true,
        aiDetection: { enabled: true, detectorId: 'pushup_v1', detectorVersion: '1.0' }
      },
      {
        exerciseId: 'EX-CHEST-04',
        name: 'Parallel Bar Chest Dips',
        category: 'Chest',
        targetMuscles: ['Lower Chest', 'Triceps'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Advanced',
        defaultSets: 3,
        defaultReps: 10,
        instructions: 'Dips bars par thora sa aagay jhukein taake lower chest par load aaye. 90 degree elbow bend tak neechay jayen aur wapis push karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        description: 'Lower chest line aur triceps horsepower build karne ke liye.',
        trainingGoals: ['Hypertrophy', 'Strength'],
        metValue: 6.5
      },
      {
        exerciseId: 'EX-BACK-01',
        name: 'Barbell Deadlift',
        category: 'Back',
        targetMuscles: ['Lower Back', 'Lats', 'Glutes', 'Hamstrings'],
        equipmentRequired: 'Barbell',
        difficulty: 'Advanced',
        defaultSets: 4,
        defaultReps: 6,
        instructions: 'Barbell ke paas khare hon, hips ko peechay dhakelein aur bar ko grip karein. Back bilkul seedhi rakhein aur heels se push karke khare hon.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0032-pYjYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0032-pYjYM8w.gif',
        description: 'Puri body ki taqat aur moti back banane ke liye king of exercises.',
        trainingGoals: ['Strength', 'Hypertrophy'],
        metValue: 7.5
      },
      {
        exerciseId: 'EX-BACK-02',
        name: 'Wide-Grip Pull-Up',
        category: 'Back',
        targetMuscles: ['Latissimus Dorsi (Lats)', 'Biceps', 'Upper Back'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 8,
        instructions: 'Pull-up bar ko shoulder se wide overhand grip karein. Elbows ko peechay ki taraf kheench kar chin ko bar ke upar le jayen.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0652-3tYx7uG.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0652-3tYx7uG.gif',
        description: 'V-Taper broad back aur chaudi kamar banane ke liye.',
        trainingGoals: ['Hypertrophy', 'Calisthenics'],
        metValue: 6.0
      },
      {
        exerciseId: 'EX-BACK-03',
        name: 'Seated Cable Row',
        category: 'Back',
        targetMuscles: ['Rhomboids', 'Mid Back', 'Lats'],
        equipmentRequired: 'Cable Machine',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Seedhe baith kar handle ko pet (navel) ki taraf kheenchein aur shoulder blades ko aapas mein squeeze karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0861-k8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0861-k8bYM8w.gif',
        description: 'Puri back ki thickness aur posture theek karne ke liye controlled movement.',
        trainingGoals: ['Hypertrophy'],
        metValue: 5.0
      },
      {
        exerciseId: 'EX-BACK-04',
        name: 'Inverted Bodyweight Row',
        category: 'Back',
        targetMuscles: ['Upper Back', 'Lats', 'Biceps'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Kisi mazboot table ya bar ke neechay let kar chest ko bar ki taraf kheenchein, body ko plank jaisa stiff rakhein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        description: 'Ghar par begair equipment ke back ki horizontal pulling.',
        trainingGoals: ['Calisthenics', 'General Fitness'],
        metValue: 4.8
      },
      {
        exerciseId: 'EX-LEGS-01',
        name: 'Barbell Back Squat',
        category: 'Legs',
        targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
        equipmentRequired: 'Barbell',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 10,
        instructions: 'Barbell ko upper back par rakhein. Knees aur hips ko bend karke parallel tak squat karein, chest ko upar rakhein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        description: 'Legs ki strength, muscle mass aur natural testosterone booster exercise.',
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
        instructions: 'Shoulder width stance mein khare hon. Controlled speed se neechay squat karein aur heels se wapis stand hon.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0043-s6bYM8w.gif',
        description: 'Zero equipment leg toning aur calorie burn ke liye basic foundation.',
        trainingGoals: ['General Fitness', 'Fat Loss'],
        metValue: 5.0
      },
      {
        exerciseId: 'EX-LEGS-03',
        name: 'Romanian Deadlift (Dumbbell/Barbell)',
        category: 'Legs',
        targetMuscles: ['Hamstrings', 'Glutes', 'Lower Back'],
        equipmentRequired: 'Dumbbells',
        difficulty: 'Intermediate',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Knees mein halka sa bend rakhein aur hips ko peeche dhakelein jab tak hamstrings mein accha stretch mehsoos na ho.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0380-z8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0380-z8bYM8w.gif',
        description: 'Hamstrings aur hips ki shape aur strength ke liye targeted exercise.',
        trainingGoals: ['Hypertrophy'],
        metValue: 5.5
      },
      {
        exerciseId: 'EX-LEGS-04',
        name: 'Walking Lunges',
        category: 'Legs',
        targetMuscles: ['Quads', 'Glutes', 'Calves', 'Balance'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 16,
        instructions: 'Aagay lamba step lein taake peeche wala knee zameen se 1 inch upar ho. Phir aglay pair par zor dekar agla step lein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0336-q8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0336-q8bYM8w.gif',
        description: 'Thighs aur hips ki conditioning aur high calorie burning movement.',
        trainingGoals: ['Fat Loss', 'Endurance'],
        metValue: 5.8
      },
      {
        exerciseId: 'EX-SHOULDERS-01',
        name: 'Overhead Barbell Military Press',
        category: 'Shoulders',
        targetMuscles: ['Front Deltoids', 'Side Shoulders', 'Triceps'],
        equipmentRequired: 'Barbell',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 8,
        instructions: 'Bar ko clavicle par rakhein aur seedha sir ke upar press karein, core aur glutes ko tight rakhein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0074-u8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0074-u8bYM8w.gif',
        description: 'Chaude aur mazboot kandhay banane ke liye primary overhead lift.',
        trainingGoals: ['Strength', 'Hypertrophy'],
        metValue: 5.8
      },
      {
        exerciseId: 'EX-SHOULDERS-02',
        name: 'Dumbbell Lateral Raise',
        category: 'Shoulders',
        targetMuscles: ['Side Deltoids (Lateral Head)'],
        equipmentRequired: 'Dumbbells',
        difficulty: 'Beginner',
        defaultSets: 4,
        defaultReps: 15,
        instructions: 'Dumbbells ko side se upar uthayein elbows ko lead karte hue shoulder level tak, controlled descent.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0334-n8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0334-n8bYM8w.gif',
        description: 'Kandhon ko gol aur wide V-shape dene ke liye best isolation.',
        trainingGoals: ['Hypertrophy'],
        metValue: 4.2
      },
      {
        exerciseId: 'EX-SHOULDERS-03',
        name: 'Pike Push-Up (Bodyweight Shoulder Press)',
        category: 'Shoulders',
        targetMuscles: ['Shoulders', 'Triceps', 'Upper Back'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Intermediate',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Hips ko inverted V shape mein upar uthayein aur sir ko dono haathon ke darmiyan neechay le ja kar wapis press karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1423-f8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1423-f8bYM8w.gif',
        description: 'Ghar par shoulders ko train karne ke liye zero equipment bodyweight exercise.',
        trainingGoals: ['Calisthenics', 'General Fitness'],
        metValue: 5.0
      },
      {
        exerciseId: 'EX-ARMS-01',
        name: 'Standing Barbell Bicep Curl',
        category: 'Arms',
        targetMuscles: ['Biceps Brachii'],
        equipmentRequired: 'Barbell',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 10,
        instructions: 'Elbows ko side par lock rakhein aur bar ko upper chest ki taraf curl karein, top par 1 second squeeze karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0031-t8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0031-t8bYM8w.gif',
        description: 'Doley (Biceps) ka size aur peak barhane ke liye classic movement.',
        trainingGoals: ['Hypertrophy'],
        metValue: 4.5
      },
      {
        exerciseId: 'EX-ARMS-02',
        name: 'Cable Tricep Rope Pushdown',
        category: 'Arms',
        targetMuscles: ['Triceps (Horseshoe)'],
        equipmentRequired: 'Cable Machine',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 12,
        instructions: 'Rope ko neechay push karein aur bottom par handles ko baahar ki taraf spread karein taake tricep poora squeeze ho.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0862-y8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0862-y8bYM8w.gif',
        description: 'Arm ka 65% hissa tricep hota hai, uski definition ke liye cable pushdown.',
        trainingGoals: ['Hypertrophy'],
        metValue: 4.2
      },
      {
        exerciseId: 'EX-ARMS-03',
        name: 'Bench / Chair Tricep Dips',
        category: 'Arms',
        targetMuscles: ['Triceps'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 15,
        instructions: 'Bench ya chair ke edge par haath rakh kar neechay 90 degree tak bend karein aur triceps se wapis push karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0251-z6bYxQe.gif',
        description: 'Ghar par ya office mein kahin bhi triceps pump karne ki exercise.',
        trainingGoals: ['Calisthenics', 'General Fitness'],
        metValue: 4.5
      },
      {
        exerciseId: 'EX-CORE-01',
        name: 'Forearm Core Plank',
        category: 'Core',
        targetMuscles: ['Abdominals', 'Deep Core', 'Lower Back'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 1,
        defaultDuration: 60,
        instructions: 'Forearms aur toes par body ko seedha ek dande ki tarah tight rakhein. Pet ko andar kheench kar hold karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/front-plank-with-twist.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/front-plank-with-twist.gif',
        description: 'Kamar ke dard se bachao aur flat tight belly ke liye isometric core hold.',
        trainingGoals: ['General Fitness', 'Endurance'],
        metValue: 4.0
      },
      {
        exerciseId: 'EX-CORE-02',
        name: 'Bicycle Crunches',
        category: 'Core',
        targetMuscles: ['Side Abs (Obliques)', 'Upper & Lower Belly'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 20,
        instructions: 'Peeth ke bal let kar cycle chalane ki tarah opposite elbow ko opposite knee se touch karein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0147-w8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0147-w8bYM8w.gif',
        description: 'Pet ki charbi kam karne aur sides (love handles) ko cut karne ke liye.',
        trainingGoals: ['Fat Loss', 'Hypertrophy'],
        metValue: 4.8
      },
      {
        exerciseId: 'EX-CORE-03',
        name: 'Mountain Climbers',
        category: 'Core',
        targetMuscles: ['Abs', 'Cardio', 'Shoulders'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 30,
        instructions: 'Plank position mein rehte hue tez raftar se ghutnon ko chest ki taraf alternate daurayein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0644-u8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0644-u8bYM8w.gif',
        description: 'Cardio aur six-pack training ka zabardast combination.',
        trainingGoals: ['Fat Loss', 'Cardio'],
        metValue: 7.0
      },
      {
        exerciseId: 'EX-CARDIO-01',
        name: 'Outdoor Running / Jogging',
        category: 'Cardio',
        targetMuscles: ['Cardiovascular System', 'Full Body Stamina'],
        equipmentRequired: 'None',
        difficulty: 'Beginner',
        defaultSets: 1,
        defaultReps: 1,
        defaultDuration: 1200,
        instructions: 'Pehla 5 minute warm up walk, phir consistent pace par running karein. Deep rhythmic breathing rakhein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0684-x8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0684-x8bYM8w.gif',
        description: 'Dil aur pait ki charbi pighlane aur lung stamina barhane ke liye.',
        trainingGoals: ['Endurance', 'Fat Loss'],
        metValue: 8.5,
        isAiTrackable: true,
        aiDetection: { enabled: true, detectorId: 'running_v1', detectorVersion: '1.0' }
      },
      {
        exerciseId: 'EX-CARDIO-02',
        name: 'Full Body Burpees',
        category: 'Cardio',
        targetMuscles: ['Full Body', 'Chest', 'Quads', 'Core'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Intermediate',
        defaultSets: 4,
        defaultReps: 15,
        instructions: 'Khare hon, neechay zameen par chest touch karein, foran push up karke jump lagayein aur haath sir ke upar taali bajayein.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1160-c8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/1160-c8bYM8w.gif',
        description: 'Duniya ki sab se zyada calories burn karne wali bodyweight exercise.',
        trainingGoals: ['Fat Loss', 'Endurance'],
        metValue: 9.0
      },
      {
        exerciseId: 'EX-CARDIO-03',
        name: 'High Knees In Place',
        category: 'Cardio',
        targetMuscles: ['Heart Rate', 'Hip Flexors', 'Calves'],
        equipmentRequired: 'Bodyweight',
        difficulty: 'Beginner',
        defaultSets: 3,
        defaultReps: 40,
        defaultDuration: 45,
        instructions: 'Ek hi jagah khare ho kar ghutne kamar ki unchai tak tez speed se upar layen.',
        gifUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        mediaUrl: 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0501-c8bYM8w.gif',
        description: 'Cardio warmup aur fast fat oxidation drill.',
        trainingGoals: ['Fat Loss', 'Endurance'],
        metValue: 8.0
      }
    ];

    await Exercise.insertMany(verifiedExercises);
    console.log(`✅ Seeded ${verifiedExercises.length} clean verified exercises with tutorials.`);

    // 3. Authentic Programs with clear user-friendly names
    const authorInfo = {
      createdBy: 'Captain Farhan (Fitness Trainer)',
      createdById: trainer._id,
      authorRole: 'FitnessInstructor',
      status: 'published'
    };

    const newPrograms = [
      {
        ...authorInfo,
        title: 'Patla Hona • 30 Din Fast Weight Loss & Fat Burn',
        type: 'Workout',
        goal: 'Lose Weight',
        category: 'Fat Loss',
        difficulty: 'Beginner',
        durationWeeks: 4,
        durationMonths: 1,
        daysPerWeek: 4,
        targetAudience: 'Wajan kam karne aur pet ki charbi pighlane walay afrad',
        minAge: 16,
        maxAge: 55,
        ageRange: '16 - 55 saal',
        ageGuidelines: '16-35: Full intensity metabolic sets. 40+: 75-90s rest aur joints ka warmup lazmi karein.',
        sportTags: ['Patla Hona', 'Fat Loss', 'Weight Loss', 'HIIT'],
        equipmentRequired: ['Dumbbells', 'Bodyweight'],
        fitnessGoals: ['Lose Weight', 'Burn Fat'],
        description: 'Scientific 30 din ka fat burning program jo body ke metabolism ko boost karta hai aur muscle bachate hue tezi se charbi kam karta hai.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Metabolic Fat Burning & Full Body Circuit',
            days: [
              {
                dayNumber: 1,
                title: 'Full Body Fat Torch Circuit',
                focus: 'Metabolic Resistance',
                isRestDay: false,
                warmup: [{ text: '5 min dynamic stretch, arm circles aur light jump', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-03', name: 'Standard Push-Up', sets: 3, reps: '15', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-LEGS-02', name: 'Bodyweight Air Squat', sets: 3, reps: '20', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-03', name: 'Mountain Climbers', sets: 3, reps: '30', restSeconds: 45, intensity: 'High' },
                  { exerciseId: 'EX-CORE-01', name: 'Forearm Core Plank', sets: 3, reps: '1', duration: 45, restSeconds: 45, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Chest & Hamstring static stretching', duration: 5 }]
              }
            ]
          }
        ]
      },
      {
        ...authorInfo,
        title: '3 Mahine Extreme Fat Shred & Tummy Slim',
        type: 'Workout',
        goal: 'Lose Weight',
        category: 'Fat Loss',
        difficulty: 'Intermediate',
        durationWeeks: 12,
        durationMonths: 3,
        daysPerWeek: 4,
        targetAudience: '10kg se 25kg tak wajan kam karne aur lean physique banane walay',
        minAge: 18,
        maxAge: 60,
        ageRange: '18 - 60 saal',
        ageGuidelines: '3 Months: Mahina 1 Base Metabolism, Mahina 2 High Intensity, Mahina 3 Peak Definition.',
        sportTags: ['Patla Hona', 'Transformation', 'Fat Loss'],
        equipmentRequired: ['Full Gym', 'Dumbbells'],
        fitnessGoals: ['Lose Weight', 'Burn Fat'],
        description: 'Complete 3 Months plan: Gym lifting aur depletion cardio ka combination taake body bilkul tight aur slim ho sake.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Foundation Fat Loss & Core Toning',
            days: [
              {
                dayNumber: 1,
                title: 'Upper Body & Core Fat Shred',
                focus: 'Chest, Back & Abs',
                isRestDay: false,
                warmup: [{ text: 'Light cardio & shoulder mobilization', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-01', name: 'Barbell Bench Press', sets: 3, reps: '10', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-BACK-03', name: 'Seated Cable Row', sets: 3, reps: '12', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-02', name: 'Bicycle Crunches', sets: 3, reps: '20', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CARDIO-02', name: 'Full Body Burpees', sets: 3, reps: '12', restSeconds: 60, intensity: 'High' }
                ],
                cooldown: [{ text: 'Full body decompression stretch', duration: 5 }]
              }
            ]
          }
        ]
      },
      {
        ...authorInfo,
        title: 'Fit Hona • 60 Din Muscle Building & Toning Split',
        type: 'Workout',
        goal: 'Build Muscle',
        category: 'Muscle Building',
        difficulty: 'Intermediate',
        durationWeeks: 8,
        durationMonths: 2,
        daysPerWeek: 4,
        targetAudience: 'Body banane, muscles ka size barhane aur broad shoulders ke khwahishmand',
        minAge: 17,
        maxAge: 50,
        ageRange: '17 - 50 saal',
        ageGuidelines: 'Har exercise mein progressive overload karein (wajan step by step barhayen). 8-12 rep range.',
        sportTags: ['Fit Hona', 'Muscle Building', 'Body Banao'],
        equipmentRequired: ['Barbell', 'Dumbbells', 'Cable Machine'],
        fitnessGoals: ['Build Muscle', 'Gain Strength'],
        description: '60 Din ka Upper/Lower split program jo muscles ko week mein do dafa train karke maximum hypertrophy deta hai.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Upper Body Hypertrophy Accumulation',
            days: [
              {
                dayNumber: 1,
                title: 'Upper Body Chest & Lat Power',
                focus: 'Chest, Lats & Shoulders',
                isRestDay: false,
                warmup: [{ text: 'Band pull-aparts aur arm rotations', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-01', name: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90, intensity: 'High' },
                  { exerciseId: 'EX-BACK-02', name: 'Wide-Grip Pull-Up', sets: 4, reps: '8', restSeconds: 90, intensity: 'High' },
                  { exerciseId: 'EX-CHEST-02', name: 'Incline Dumbbell Press', sets: 3, reps: '10', restSeconds: 75, intensity: 'Moderate' },
                  { exerciseId: 'EX-SHOULDERS-02', name: 'Dumbbell Lateral Raise', sets: 4, reps: '15', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-ARMS-01', name: 'Standing Barbell Bicep Curl', sets: 3, reps: '10', restSeconds: 60, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Doorway chest stretch & lats stretch', duration: 5 }]
              }
            ]
          }
        ]
      },
      {
        ...authorInfo,
        title: '90 Din Hardcore Bulking & Weight Gain (Wajan Barhana)',
        type: 'Workout',
        goal: 'Build Muscle',
        category: 'Weight Gain',
        difficulty: 'Intermediate',
        durationWeeks: 12,
        durationMonths: 3,
        daysPerWeek: 5,
        targetAudience: 'Kamzor jism walay hardgainers jo wajan aur mass barhana chahte hain',
        minAge: 18,
        maxAge: 45,
        ageRange: '18 - 45 saal',
        ageGuidelines: 'Heavy compound lifts aur high calorie nutrition plan follow karein.',
        sportTags: ['Weight Gain', 'Bulking', 'Mass Gain'],
        equipmentRequired: ['Full Gym'],
        fitnessGoals: ['Build Muscle', 'Gain Strength'],
        description: 'Hardcore 3-month power split designed for hardgainers looking to pack on quality size and dense muscular weight.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Heavy Compound Overload & Dense Muscle',
            days: [
              {
                dayNumber: 1,
                title: 'Heavy Chest & Triceps Day',
                focus: 'Chest Mass & Triceps Horseshoe',
                isRestDay: false,
                warmup: [{ text: 'Pushup prep and dynamic chest openers', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-01', name: 'Barbell Bench Press', sets: 4, reps: '6-8', restSeconds: 120, intensity: 'High' },
                  { exerciseId: 'EX-CHEST-02', name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', restSeconds: 90, intensity: 'High' },
                  { exerciseId: 'EX-CHEST-04', name: 'Parallel Bar Chest Dips', sets: 3, reps: '10', restSeconds: 75, intensity: 'High' },
                  { exerciseId: 'EX-ARMS-02', name: 'Cable Tricep Rope Pushdown', sets: 3, reps: '12', restSeconds: 60, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Pec stretch and triceps overhead stretch', duration: 5 }]
              }
            ]
          }
        ]
      },
      {
        ...authorInfo,
        title: 'Stamina Increase • 30 Din Athletic Cardio & Running',
        type: 'Workout',
        goal: 'Improve Stamina',
        category: 'Endurance',
        difficulty: 'Beginner',
        durationWeeks: 4,
        durationMonths: 1,
        daysPerWeek: 4,
        targetAudience: 'Thakawat jaldi honay walay, runners, cricket/football players',
        minAge: 16,
        maxAge: 60,
        ageRange: '16 - 60 saal',
        ageGuidelines: 'Lung capacity aur aerobic threshold ko safely train karein. Pani khoob piyein.',
        sportTags: ['Stamina Increase', 'Cardio', 'Running'],
        equipmentRequired: ['None (Bodyweight)'],
        fitnessGoals: ['Improve Stamina', 'General Fitness'],
        description: '30 Din ka endurance protocol jo saans phoolna theek karta hai aur full day energy level high rakhta hai.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Cardiovascular Foundation & Aerobic Capacity',
            days: [
              {
                dayNumber: 1,
                title: 'Stamina Sprint & Bodyweight Intervals',
                focus: 'Heart Rate & Lung Stamina',
                isRestDay: false,
                warmup: [{ text: 'Jogging in place & high knees', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CARDIO-01', name: 'Outdoor Running / Jogging', sets: 1, reps: '1', duration: 1200, restSeconds: 90, intensity: 'Moderate' },
                  { exerciseId: 'EX-CARDIO-02', name: 'Full Body Burpees', sets: 3, reps: '12', restSeconds: 60, intensity: 'High' },
                  { exerciseId: 'EX-CARDIO-03', name: 'High Knees In Place', sets: 3, reps: '40', restSeconds: 45, intensity: 'High' },
                  { exerciseId: 'EX-CORE-03', name: 'Mountain Climbers', sets: 3, reps: '30', restSeconds: 45, intensity: 'High' }
                ],
                cooldown: [{ text: 'Calf & quad deep stretch', duration: 5 }]
              }
            ]
          }
        ]
      },
      {
        ...authorInfo,
        title: 'Ghar Par Full Body Fit • Zero Equipment Calisthenics',
        type: 'Workout',
        goal: 'General Fitness',
        category: 'Calisthenics',
        difficulty: 'Beginner',
        durationWeeks: 4,
        durationMonths: 1,
        daysPerWeek: 4,
        targetAudience: 'Ghar par reh kar begair kisi gym saman ke body fit rakhne walay',
        minAge: 14,
        maxAge: 65,
        ageRange: '14 - 65 saal',
        ageGuidelines: 'Har age ke afrad ke lye safe. Beginners ghutnay par pushups kar sakte hain.',
        sportTags: ['Begair Equipment', 'Home Workout', 'Calisthenics'],
        equipmentRequired: ['None (Bodyweight)'],
        fitnessGoals: ['General Fitness', 'Build Muscle'],
        description: '100% equipment-free home program. Apnay wajan se chest, legs, shoulders, arms aur core ko shape dein.',
        weeks: [
          {
            weekNumber: 1,
            focus: 'Full Body Functional Strength at Home',
            days: [
              {
                dayNumber: 1,
                title: 'Home Bodyweight Full Power',
                focus: 'Pushups, Squats & Core',
                isRestDay: false,
                warmup: [{ text: 'Arm circles & bodyweight bends', duration: 5 }],
                exercises: [
                  { exerciseId: 'EX-CHEST-03', name: 'Standard Push-Up', sets: 4, reps: '12-15', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-LEGS-02', name: 'Bodyweight Air Squat', sets: 4, reps: '20', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-SHOULDERS-03', name: 'Pike Push-Up (Bodyweight Shoulder Press)', sets: 3, reps: '10', restSeconds: 60, intensity: 'Moderate' },
                  { exerciseId: 'EX-ARMS-03', name: 'Bench / Chair Tricep Dips', sets: 3, reps: '12-15', restSeconds: 45, intensity: 'Moderate' },
                  { exerciseId: 'EX-CORE-01', name: 'Forearm Core Plank', sets: 3, reps: '1', duration: 45, restSeconds: 45, intensity: 'Moderate' }
                ],
                cooldown: [{ text: 'Deep breathing & full-body relaxation', duration: 5 }]
              }
            ]
          }
        ]
      }
    ];

    await PreMadePlan.insertMany(newPrograms);
    console.log(`✅ Seeded ${newPrograms.length} authentic programs with proper Roman Urdu / English titles.`);

    // 4. Authentic Diet Plans with real gym and desi foods
    const newDietPlans = [
      {
        ...authorInfo,
        title: 'Desi High-Protein Muscle Fuel (Anday, Murghi, Daal, Roti, Doodh)',
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
        targetAudience: 'Muscle banane aur body development ke liye high protein desi khana',
        description: 'Real gym diet plan: Ublay anday, grilled chicken / keema, whey shake, oats, daal moong, gandum ki roti, dahi aur badam.',
        meals: [
          {
            mealType: 'Breakfast',
            name: 'Nashta (High Protein Breakfast)',
            timing: '08:00 AM',
            calories: 620,
            protein: 42,
            carbs: 65,
            fat: 20,
            foodItems: [
              { name: 'Ublay Anday (Whole Boiled Eggs)', quantity: 3, unit: 'piece', calories: 215, protein: 18, carbs: 1.5, fat: 15, allergens: ['Eggs'], localAlternative: 'Anda Omelette with light oil' },
              { name: 'Gandum ka Daliya ya Oats Doodh ke sath', quantity: 70, unit: 'g', calories: 275, protein: 14, carbs: 48, fat: 5, allergens: ['Dairy'], localAlternative: '2 Gandum ki Roti' },
              { name: 'Kela (Banana)', quantity: 1, unit: 'piece', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, allergens: [], localAlternative: '1 Saib (Apple)' },
              { name: 'Peanut Butter ya Badam', quantity: 15, unit: 'g', calories: 90, protein: 4, carbs: 3, fat: 7.5, allergens: ['Nuts'], localAlternative: '10 Badam' }
            ]
          },
          {
            mealType: 'Morning Snack',
            name: 'Mid-Morning Snack & Shake',
            timing: '11:30 AM',
            calories: 340,
            protein: 32,
            carbs: 22,
            fat: 10,
            foodItems: [
              { name: '100% Whey Protein Shake (1 Scoop)', quantity: 30, unit: 'g', calories: 120, protein: 25, carbs: 2, fat: 1.5, allergens: ['Dairy'], localAlternative: '1 Glass Sattu Drink + 4 Andon ki Safedi' },
              { name: 'Doodh (Cow Milk)', quantity: 250, unit: 'ml', calories: 90, protein: 9, carbs: 12, fat: 0.5, allergens: ['Dairy'], localAlternative: 'Almond Milk' },
              { name: 'Kacha Badam (Raw Almonds)', quantity: 20, unit: 'g', calories: 116, protein: 4.2, carbs: 4.3, fat: 10, allergens: ['Nuts'], localAlternative: 'Akhrot (Walnuts)' }
            ]
          },
          {
            mealType: 'Lunch',
            name: 'Dopehar ka Khana (Lunch)',
            timing: '02:00 PM',
            calories: 780,
            protein: 55,
            carbs: 95,
            fat: 20,
            foodItems: [
              { name: 'Murghi ka Seena (Chicken Breast) ya Keema', quantity: 200, unit: 'g', calories: 330, protein: 46, carbs: 0, fat: 7, allergens: [], localAlternative: 'Machli Fillet ya 150g Paneer' },
              { name: 'Ublay Basmati Chawal (Boiled Rice)', quantity: 200, unit: 'g', calories: 260, protein: 5.5, carbs: 58, fat: 0.6, allergens: [], localAlternative: '2 Gandum ki Roti' },
              { name: 'Paki hui Daal Moong / Daal Chana', quantity: 150, unit: 'g', calories: 140, protein: 9, carbs: 24, fat: 2, allergens: [], localAlternative: 'Ublay Safaid Chane' },
              { name: 'Kheera aur Tamatar Salad', quantity: 150, unit: 'g', calories: 50, protein: 2, carbs: 10, fat: 0.5, allergens: [], localAlternative: 'Hari Mirch Salad' }
            ]
          },
          {
            mealType: 'Post-Workout',
            name: 'Workout ke baad ka Meal',
            timing: '05:30 PM',
            calories: 280,
            protein: 26,
            carbs: 38,
            fat: 2,
            foodItems: [
              { name: 'Whey Protein Isolate ya 4 Andon ki Safedi', quantity: 30, unit: 'g', calories: 120, protein: 26, carbs: 1, fat: 0.5, allergens: ['Dairy'], localAlternative: '4 Boiled Egg Whites' },
              { name: 'Kela ya 3 Khajoor (Dates)', quantity: 150, unit: 'g', calories: 130, protein: 2, carbs: 32, fat: 0.2, allergens: [], localAlternative: 'Shakarqandi (Sweet Potato)' }
            ]
          },
          {
            mealType: 'Dinner',
            name: 'Raat ka Khana (Dinner)',
            timing: '08:30 PM',
            calories: 630,
            protein: 48,
            carbs: 65,
            fat: 18,
            foodItems: [
              { name: 'Grilled Fish ya Chicken Tikka Boti', quantity: 180, unit: 'g', calories: 270, protein: 40, carbs: 2, fat: 6, allergens: ['Fish'], localAlternative: 'Beef Boti ya Tofu Curry' },
              { name: 'Gandum ki Roti (Chapati)', quantity: 2, unit: 'piece', calories: 220, protein: 6, carbs: 44, fat: 1.5, allergens: ['Gluten'], localAlternative: '1 cup Boiled Brown Rice' },
              { name: 'Palak ya Mix Sabzi (Kam Ghee/Oil)', quantity: 150, unit: 'g', calories: 80, protein: 3, carbs: 12, fat: 3, allergens: [], localAlternative: 'Bhindi Fry' },
              { name: 'Sada Dahi (Greek Yogurt / Curd)', quantity: 100, unit: 'g', calories: 60, protein: 8, carbs: 4, fat: 1, allergens: ['Dairy'], localAlternative: 'Kheere ka Raita' }
            ]
          }
        ]
      },
      {
        ...authorInfo,
        title: 'Patla Hona & Fat Shredding Diet (Boiled Eggs, Chicken, Daal, Sabzi)',
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
        targetAudience: 'Pet ki charbi pighlane aur tezi se wajan kam karne ke liye',
        description: 'Clean caloric deficit plan: Boiled anday, grilled murghi, daal soup, sabzi, green tea aur hydration.',
        meals: [
          {
            mealType: 'Breakfast',
            name: 'Fat Burn Nashta',
            timing: '08:30 AM',
            calories: 380,
            protein: 36,
            carbs: 25,
            fat: 12,
            foodItems: [
              { name: '4 Andon ki Safedi (Egg Whites)', quantity: 4, unit: 'piece', calories: 68, protein: 14.4, carbs: 0.8, fat: 0.2, allergens: ['Eggs'], localAlternative: 'Egg White Omelette with spinach' },
              { name: '1 Poora Ubla Anda', quantity: 1, unit: 'piece', calories: 72, protein: 6.3, carbs: 0.5, fat: 5, allergens: ['Eggs'], localAlternative: 'Half fry egg in olive oil' },
              { name: '1 Gandum ki Roti ya Bran Bread Toast', quantity: 1, unit: 'piece', calories: 110, protein: 3.5, carbs: 22, fat: 0.8, allergens: ['Gluten'], localAlternative: '1 cup Oats Daliya' },
              { name: 'Green Tea (Bina Cheeni)', quantity: 1, unit: 'cup', calories: 2, protein: 0, carbs: 0.5, fat: 0, allergens: [], localAlternative: 'Black Coffee' }
            ]
          },
          {
            mealType: 'Lunch',
            name: 'Dopehar ka Fat-Loss Meal',
            timing: '01:30 PM',
            calories: 550,
            protein: 52,
            carbs: 52,
            fat: 12,
            foodItems: [
              { name: 'Boneless Grilled Murghi (Chicken Breast)', quantity: 180, unit: 'g', calories: 290, protein: 42, carbs: 0, fat: 6, allergens: [], localAlternative: 'Machli ya 150g Paneer' },
              { name: 'Ublay Safaid Chane ya Daal Chana Bowl', quantity: 120, unit: 'g', calories: 150, protein: 9, carbs: 26, fat: 2.5, allergens: [], localAlternative: 'Ublay Rajma (Lobia)' },
              { name: 'Fresh Salad Lemon ke sath', quantity: 180, unit: 'g', calories: 50, protein: 2, carbs: 11, fat: 0.5, allergens: [], localAlternative: 'Cucumber slices' }
            ]
          },
          {
            mealType: 'Dinner',
            name: 'Raat ka Light Meal',
            timing: '08:30 PM',
            calories: 480,
            protein: 45,
            carbs: 45,
            fat: 12,
            foodItems: [
              { name: 'Machli Fillet ya Chicken Breast Tikka', quantity: 160, unit: 'g', calories: 240, protein: 38, carbs: 0, fat: 5, allergens: ['Fish'], localAlternative: 'Chicken Salan (kam ghee)' },
              { name: '1 Gandum ki Roti', quantity: 1, unit: 'piece', calories: 110, protein: 3.5, carbs: 22, fat: 0.8, allergens: ['Gluten'], localAlternative: '1/2 cup Boiled Rice' },
              { name: 'Mixed Seasonal Sabzi (Lauki / Bhindi / Palak)', quantity: 150, unit: 'g', calories: 75, protein: 2.5, carbs: 12, fat: 2.5, allergens: [], localAlternative: 'Tinda ya Kaddu' }
            ]
          }
        ]
      }
    ];

    await PreMadePlan.insertMany(newDietPlans);
    console.log(`✅ Seeded ${newDietPlans.length} authentic diet plans.`);

    console.log('🎉 ALL DATA SEEDED TO GYMSYNC DATABASE SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding gymsync DB:', err);
    process.exit(1);
  }
};

seedGymsync();
