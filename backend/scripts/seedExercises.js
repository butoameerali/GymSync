import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Exercise from '../models/Exercise.js';
import PreMadePlan from '../models/PreMadePlan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gymsync';

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected successfully.');

    // 1. Read JSON datasets
    const datasetPath = path.join(__dirname, '../data/dataset.json');
    const plansPath = path.join(__dirname, '../data/plans.json');

    const datasetRaw = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    const plansRaw = JSON.parse(fs.readFileSync(plansPath, 'utf-8'));

    const rawExercises = datasetRaw['LLM_7_Step_Dataset'] || [];
    console.log(`Found ${rawExercises.length} exercises in dataset.json`);

    // 2. Transform & Seed Exercises
    const exerciseDocs = rawExercises.map(item => {
      const targetMusclesStr = item.Step_5_Target_Muscles || '';
      const targetMuscles = targetMusclesStr.split(',').map(s => s.trim()).filter(Boolean);

      const pathsStr = item.Step_1_Primary_Paths || '';
      const fitnessPaths = pathsStr.split(',').map(s => s.trim()).filter(Boolean);

      const medAvoidStr = item.Step_6_Medical_Avoid_If || '';
      const medicalAvoidIf = medAvoidStr ? medAvoidStr.split(',').map(s => s.trim()).filter(Boolean) : [];

      const jointAvoidStr = item.Step_6_Joint_Pain_Avoid_If || '';
      const jointPainAvoidIf = jointAvoidStr ? jointAvoidStr.split(',').map(s => s.trim()).filter(Boolean) : [];

      let difficulty = 'Beginner';
      const ageSuitability = (item.Step_2_Age_Suitability || '').toLowerCase();
      if (ageSuitability.includes('advanced') || ageSuitability.includes('athlete')) difficulty = 'Advanced';
      else if (ageSuitability.includes('intermediate')) difficulty = 'Intermediate';

      return {
        exerciseId: item.Exercise_ID || `EX-${Math.random().toString(36).substr(2, 6)}`,
        name: item.Exercise_Name || 'Unnamed Exercise',
        targetMuscles,
        equipmentRequired: item.Equipment_Required || 'Bodyweight',
        difficulty,
        fitnessPaths,
        medicalAvoidIf,
        jointPainAvoidIf,
        mediaUrl: item.Media_URL || item.mediaUrl || '',
        description: item.Instructions || item.description || `Target muscles: ${targetMusclesStr}`,
        isAiTrackable: (item.AI_Pose_Trackable || '').toLowerCase() === 'yes'
      };
    });

    console.log('Seeding Exercise collection into MongoDB...');
    await Exercise.deleteMany({});
    const insertedExercises = await Exercise.insertMany(exerciseDocs);
    console.log(`Successfully seeded ${insertedExercises.length} exercises into MongoDB!`);

    // 3. Seed Pre-Made Plans
    console.log('Seeding PreMadePlan collection into MongoDB...');
    await PreMadePlan.deleteMany({});

    const defaultPlans = [
      {
        title: 'Beginner Full Body Foundation',
        type: 'Exercise',
        category: 'Full Body',
        description: 'A 3-day fundamental strength & joint mobility plan for beginners.',
        details: [
          { day: 'Day 1', focus: 'Push & Core', exercises: ['Bodyweight Squats', 'Push-ups', 'Plank', 'Jumping Jacks'] },
          { day: 'Day 2', focus: 'Pull & Upper Body', exercises: ['Dumbbell Rows', 'Bicep Curls', 'Superman Hold', 'Arm Circles'] },
          { day: 'Day 3', focus: 'Legs & Lower Body', exercises: ['Lunges', 'Glute Bridges', 'Calf Raises', 'Cat-Cow Stretch'] }
        ]
      },
      {
        title: 'Fat Loss & High Protein Natural Diet Protocol',
        type: 'Diet',
        category: 'Weight Loss',
        description: '100% whole-food nutrition protocol tailored for caloric deficit & recovery.',
        details: [
          { meal: 'Breakfast', food: '3 Boiled Eggs + 1 Slice Bran Bread + Green Tea', macros: 'High Protein' },
          { meal: 'Snack', food: '1 Apple + 10 Almonds', macros: 'Fiber & Fats' },
          { meal: 'Lunch', food: '150g Grilled Chicken Breast + 1/2 cup Brown Rice + Fresh Salad', macros: 'High Protein' },
          { meal: 'Dinner', food: '150g Baked Fish/Chicken + Sautéed Vegetables (Broccoli, Carrots)', macros: 'Zero Starch' }
        ]
      },
      {
        title: 'Lean Muscle Hypertrophy Split',
        type: 'Exercise',
        category: 'Muscle Gain',
        description: 'Moderate-to-high volume hypertrophy program targeting primary muscle groups.',
        details: [
          { day: 'Day 1', focus: 'Chest & Triceps', exercises: ['Bench Press / Push-ups', 'Incline Dumbbell Press', 'Tricep Dips', 'Plank'] },
          { day: 'Day 2', focus: 'Back & Biceps', exercises: ['Lat Pulldowns / Rows', 'Face Pulls', 'Hammer Curls', 'Superman Hold'] },
          { day: 'Day 3', focus: 'Legs & Shoulders', exercises: ['Goblet Squats', 'Overhead Press', 'Lateral Raises', 'Calf Raises'] }
        ]
      }
    ];

    const insertedPlans = await PreMadePlan.insertMany(defaultPlans);
    console.log(`Successfully seeded ${insertedPlans.length} Pre-Made Plans into MongoDB!`);

    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
};

seedData();
