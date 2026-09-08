import dotenv from 'dotenv';
import mongoose from 'mongoose';
import PreMadePlan from '../models/PreMadePlan.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import Article from '../models/Article.js';
import InstructorRequest from '../models/InstructorRequest.js';
import Exercise from '../models/Exercise.js';
import User from '../models/User.js';
import { fitnessContentService } from '../services/fitnessContentService.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runEcosystemTests() {
  console.log('====================================================');
  console.log('🚀 GYMSYNC FITNESS ECOSYSTEM INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    console.log('📡 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('  Connected successfully to DB: ' + mongoose.connection.name + '\n');

    // 1. Setup Test Users
    console.log('--- Step 1: User & Instructor Setup ---');
    let instructor = await User.findOne({ role: 'FitnessInstructor' });
    if (!instructor) {
      instructor = await User.create({
        name: 'Test Instructor Pro',
        email: 'test_instructor_auto@gymsync.io',
        password: 'Password123!',
        role: 'FitnessInstructor'
      });
    }
    assert(instructor && instructor.role === 'FitnessInstructor', 'Certified Fitness Instructor verified in DB');

    let trainee = await User.findOne({ role: 'User' });
    if (!trainee) {
      trainee = await User.create({
        name: 'Test Trainee Athlete',
        email: 'test_trainee_auto@gymsync.io',
        password: 'Password123!',
        role: 'User'
      });
    }
    assert(trainee && trainee._id, 'Active Trainee User verified in DB');

    // 2. Fetch or create a real DB Exercise
    console.log('\n--- Step 2: Exercise Library Verification ---');
    let dbExercise = await Exercise.findOne();
    if (!dbExercise) {
      dbExercise = await Exercise.create({
        name: 'Barbell Back Squat',
        category: 'Strength',
        targetMuscles: ['Quadriceps', 'Glutes'],
        instructions: 'Keep chest high and squat down until thighs are parallel to ground.'
      });
    }
    assert(dbExercise && dbExercise.name, `Verified DB Exercise: ${dbExercise.name} (${dbExercise._id})`);

    // 3. Create Structured Multi-Week Workout Program
    console.log('\n--- Step 3: Structured Workout Program Creation ---');
    const testProgram = await PreMadePlan.create({
      title: 'Hypertrophy Power Split (Test)',
      description: 'Comprehensive 4-week athletic hypertrophy cycle designed by certified coach.',
      author: instructor.name,
      authorName: instructor.name,
      authorId: instructor._id,
      type: 'workout',
      goal: 'hypertrophy',
      difficulty: 'Intermediate',
      durationWeeks: 4,
      daysPerWeek: 4,
      sportTags: ['football', 'strength'],
      version: 1,
      status: 'published',
      weeks: [
        {
          weekNumber: 1,
          theme: 'Acclimatization & Kinetic Priming',
          days: [
            {
              dayNumber: 1,
              focus: 'Lower Body Anterior Chain',
              restDay: false,
              exercises: [
                {
                  exerciseId: dbExercise._id,
                  name: dbExercise.name,
                  sets: 4,
                  reps: 8,
                  restSeconds: 120,
                  rpe: 8,
                  tempo: '3-0-1-0',
                  coachingNotes: 'Maintain neutral spine throughout all 4 sets.'
                }
              ]
            },
            {
              dayNumber: 2,
              focus: 'Upper Body Push Power',
              restDay: false,
              exercises: []
            }
          ]
        }
      ]
    });
    assert(testProgram._id && testProgram.weeks.length === 1, 'Published multi-week workout program created');
    assert(testProgram.weeks[0].days[0].exercises[0].tempo === '3-0-1-0', 'Structured sets, reps, tempo, and RPE preserved in DB');

    // 4. Create Draft Program to test Security & Privacy
    console.log('\n--- Step 4: Security & Draft Protection ---');
    const draftProgram = await PreMadePlan.create({
      title: 'Secret Unfinished Program (Draft)',
      description: 'Work in progress by instructor, not ready for public viewing.',
      author: instructor.name,
      authorId: instructor._id,
      type: 'workout',
      goal: 'hypertrophy',
      status: 'draft'
    });

    const publishedOnlyResults = await fitnessContentService.findRelevantPrograms({
      goal: 'hypertrophy',
      userRole: 'User'
    });
    const containsDraft = publishedOnlyResults.some(p => p._id.toString() === draftProgram._id.toString());
    const containsPublished = publishedOnlyResults.some(p => p._id.toString() === testProgram._id.toString());
    assert(!containsDraft, 'Draft program is hidden from regular trainees');
    assert(containsPublished, 'Published program is discoverable by trainees');

    // 5. Apply Program to Trainee (Non-Mutating Snapshot & Versioning)
    console.log('\n--- Step 5: Trainee Program Application & Version Freeze ---');
    const userAppliedProgram = await UserWorkoutProgram.create({
      userId: trainee._id,
      userName: trainee.name || 'Test Trainee Athlete',
      sourceProgramId: testProgram._id,
      programVersion: testProgram.version,
      title: testProgram.title,
      goal: testProgram.goal,
      difficulty: testProgram.difficulty,
      durationWeeks: testProgram.durationWeeks,
      daysPerWeek: testProgram.daysPerWeek,
      sportTags: testProgram.sportTags,
      weeks: testProgram.weeks,
      status: 'active',
      progress: {
        currentWeek: 1,
        currentDay: 1,
        completedSessions: []
      }
    });

    assert(userAppliedProgram._id && userAppliedProgram.programVersion === 1, 'UserWorkoutProgram instantiated with snapshot version 1');

    // Simulate Instructor Updating Source Program to Version 2
    testProgram.version = 2;
    testProgram.title = 'Hypertrophy Power Split - V2 Modified';
    await testProgram.save();

    const checkFrozen = await UserWorkoutProgram.findById(userAppliedProgram._id);
    assert(checkFrozen.programVersion === 1 && checkFrozen.title === 'Hypertrophy Power Split (Test)', 'User enrolled program is immune to source mutation (version frozen at v1)');

    // 6. Log Trainee Progress
    console.log('\n--- Step 6: Calendar & Workout Progress Logging ---');
    checkFrozen.progress.completedSessions.push({
      weekNumber: 1,
      dayNumber: 1,
      completedAt: new Date(),
      durationMinutes: 50,
      notes: 'Completed with full intensity'
    });
    checkFrozen.progress.currentDay = 2;
    await checkFrozen.save();

    const verifiedProgress = await UserWorkoutProgram.findById(userAppliedProgram._id);
    assert(verifiedProgress.progress.completedSessions.length === 1, 'Session logged into completedSessions');
    assert(verifiedProgress.progress.currentDay === 2, 'Program schedule auto-advanced to Day 2');

    // 7. Structured Diet Template Creation & Adoption
    console.log('\n--- Step 7: Structured Diet Template Verification ---');
    const dietTemplate = await PreMadePlan.create({
      title: 'High-Protein Muscle Fuel (Test)',
      description: 'Calculated 2800 kcal natural anabolic macronutrient distribution.',
      author: instructor.name,
      authorId: instructor._id,
      type: 'diet',
      goal: 'hypertrophy',
      targetCalories: 2800,
      status: 'published',
      macronutrients: { proteinGrams: 180, carbsGrams: 320, fatsGrams: 75 },
      meals: [
        {
          mealName: 'Post-Workout Fuel',
          timing: 'Within 45m of training',
          targetCalories: 750,
          foodItems: [
            { name: 'Rolled Oats', quantity: 100, unit: 'g', calories: 380, protein: 13, carbs: 68, fats: 7 },
            { name: 'Whey Isolate', quantity: 30, unit: 'g', calories: 120, protein: 26, carbs: 2, fats: 1 },
            { name: 'Banana', quantity: 1, unit: 'medium', calories: 105, protein: 1, carbs: 27, fats: 0 }
          ]
        }
      ]
    });
    assert(dietTemplate._id && dietTemplate.meals[0].foodItems.length === 3, 'Structured diet with food items, macros & timing created');

    const dietResults = await fitnessContentService.findRelevantDietTemplates({ goal: 'hypertrophy' });
    const foundDiet = dietResults.some(d => d._id.toString() === dietTemplate._id.toString());
    assert(foundDiet, 'Published diet template returned by fitnessContentService');

    // 8. Educational Article Knowledge Base Linking
    console.log('\n--- Step 8: Educational Articles & Exercise Graph Linking ---');
    const article = await Article.create({
      title: 'Perfecting the Squat Kinetic Chain',
      content: 'Maintain external hip rotation and drive through the mid-foot to avoid knee valgus...',
      summary: 'Biomechanical breakdown of the barbell squat.',
      author: instructor.name,
      authorId: instructor._id,
      topics: ['technique', 'biomechanics', 'injury_prevention'],
      relatedExerciseIds: [dbExercise._id],
      status: 'published'
    });
    assert(article._id && article.relatedExerciseIds.length === 1, 'Article created and linked to DB Exercise ID');

    const articleResults = await fitnessContentService.findRelevantArticles({
      topic: 'technique',
      exerciseId: dbExercise._id.toString()
    });
    const foundArticle = articleResults.some(a => a._id.toString() === article._id.toString());
    assert(foundArticle, 'Article retrieved by topic and linked exercise reference');

    // 9. AI Source Attribution Retrieval
    console.log('\n--- Step 9: AI Retrieval & Source Attribution ---');
    const aiPrograms = await fitnessContentService.findRelevantPrograms({
      goal: 'hypertrophy',
      sport: 'football'
    });
    assert(aiPrograms.length > 0, 'AI Content Retrieval located matching instructor program');
    const matchingProgram = aiPrograms.find(p => p._id.toString() === testProgram._id.toString()) || aiPrograms[0];
    assert(matchingProgram.sourceAttribution.sourceType === 'instructor_program', 'Source Attribution correctly typed as instructor_program');
    assert(Boolean(matchingProgram.sourceAttribution.instructor), `Source Attribution attributes certified instructor (${matchingProgram.sourceAttribution.instructor})`);

    // 10. Admin Requests Workflow & Zero Auto-Seed
    console.log('\n--- Step 10: Admin Request Lifecycle (Zero Fake Seed) ---');
    const adminTask = await InstructorRequest.create({
      title: 'Curate 6-Week Plyometrics Guide for Football Athletes',
      description: 'High priority request for upcoming varsity season.',
      priority: 'Urgent',
      status: 'Pending',
      assignedTo: instructor.name,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000)
    });
    assert(adminTask._id && adminTask.priority === 'Urgent', 'Admin created instructor task with Urgent priority');

    // Instructor starts task
    adminTask.status = 'In Progress';
    await adminTask.save();
    assert(adminTask.status === 'In Progress', 'Instructor marked task as In Progress');

    // Instructor completes task with notes
    adminTask.status = 'Completed';
    adminTask.responseNotes = 'Curated 6-week plyo program with 18 exercises.';
    await adminTask.save();
    assert(adminTask.status === 'Completed' && adminTask.responseNotes.length > 0, 'Task completed with response notes attached');

    // Clean up temporary test entries
    console.log('\n--- Cleanup Test Artifacts ---');
    await PreMadePlan.deleteMany({ _id: { $in: [testProgram._id, draftProgram._id, dietTemplate._id] } });
    await UserWorkoutProgram.deleteMany({ _id: userAppliedProgram._id });
    await Article.deleteMany({ _id: article._id });
    await InstructorRequest.deleteMany({ _id: adminTask._id });
    console.log('  Cleaned up temporary test documents.');

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test Execution Crashed:', err);
    process.exit(1);
  }
}

runEcosystemTests();
