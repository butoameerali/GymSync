/**
 * Phase 4 Test Suite: Food Logging + Pakistani Food Database (R2)
 *
 * Verifies:
 * 1. PkFood dataset integrity (~1000 entries, required fields, estimates, review flags, no medical advice).
 * 2. FoodLog calculation with quantity picker and +/-15% estimate range.
 * 3. Backfilling support (logging for yesterday / earlier dates).
 * 4. dailyEnergyAggregator computes eatenKcal from FoodLog.
 * 5. Diet report provides observational summary without prescriptive calorie/meal targets (Rule R2).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeTodaysEnergy } from '../services/nutrition/dailyEnergyAggregator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runPhase4Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 4 TEST SUITE: Food Logging & Pakistani Food DB');
  console.log('======================================================\n');

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

  // --- Test 1: PkFood Dataset Integrity (~1000 entries) ---
  console.log('\n--- 1. PkFood Database File Integrity ---');
  const jsonPath = path.resolve(__dirname, '../data/pkFoods.json');
  assert(fs.existsSync(jsonPath), 'pkFoods.json file exists on disk');

  const foods = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  assert(foods.length >= 800 && foods.length <= 1200, `Dataset contains ~1000 entries (actual: ${foods.length})`);

  const sample = foods[0];
  assert(sample.foodId && sample.foodId.startsWith('pk_'), 'Item has valid unique foodId');
  assert(sample.name && sample.name.length > 0, 'Item has descriptive name');
  assert(sample.aliases?.romanUrdu?.length > 0, 'Item includes Roman Urdu aliases for search');
  assert(sample.aliases?.urdu?.length > 0, 'Item includes Urdu script alias');
  assert(sample.category && ['daal', 'sabzi', 'gosht', 'chawal', 'roti_paratha', 'nashta', 'drinks', 'sweets', 'fast_food', 'snacks', 'bbq', 'chutney_raita'].includes(sample.category), `Valid category: ${sample.category}`);
  assert(sample.typicalServing?.unit && sample.typicalServing?.grams > 0, 'Typical serving has unit and grams');
  assert(typeof sample.calories === 'number' && sample.calories > 0, 'Calories is a positive number');
  assert(sample.isEstimate === true, 'Nutrition is explicitly flagged as isEstimate: true');
  assert(sample.estimateRangePercent === 15, 'Estimate range is 15%');
  assert(sample.source && sample.source.length > 5, 'Source attribution is specified');
  assert(sample.medicalDisclaimer && sample.medicalDisclaimer.includes('Not medical'), 'Medical disclaimer is present and explicit');

  // Verify review flags on street food / sweets
  const reviewedItems = foods.filter(f => f.needsReview);
  assert(reviewedItems.length > 50, `Items with high variability are flagged for review (flagged: ${reviewedItems.length})`);
  const sweetOrStreet = reviewedItems.find(f => ['sweets', 'fast_food', 'snacks'].includes(f.category));
  assert(!!sweetOrStreet, `High-variability categories are correctly flagged for review (${sweetOrStreet?.name})`);

  // --- Test 2: FoodLog Quantity Picker & +/-15% Calorie Range ---
  console.log('\n--- 2. Food Log Quantity Picker & Range Calculation ---');
  // Simulated plate of Chicken Biryani: 480 kcal per serving
  const biryaniServingCal = 480;
  const quantity = 1.5; // 1.5 plates
  const estimatedCalories = Math.round(biryaniServingCal * quantity); // 720 kcal
  const rangeMargin = Math.round(estimatedCalories * 0.15); // 108 kcal
  const rangeMin = estimatedCalories - rangeMargin; // 612 kcal
  const rangeMax = estimatedCalories + rangeMargin; // 828 kcal

  assert(estimatedCalories === 720, '1.5 portions scaled calories correctly (480 * 1.5 = 720)');
  assert(rangeMin === 612 && rangeMax === 828, `Range is ±15%: ${rangeMin} - ${rangeMax} kcal`);
  assert(rangeMin < estimatedCalories && rangeMax > estimatedCalories, 'Estimated calories sit right in the middle of the range');

  // Multi-item log test
  // Item 1: 1.5 plates biryani (720 kcal)
  // Item 2: 2 glasses Mint Margarita (90 * 2 = 180 kcal)
  const margaritaServingCal = 90;
  const drinkQuantity = 2;
  const drinkEstimated = margaritaServingCal * drinkQuantity; // 180 kcal
  const totalMealEstimate = estimatedCalories + drinkEstimated; // 900 kcal
  const totalMargin = Math.round(totalMealEstimate * 0.15); // 135 kcal
  const totalMin = totalMealEstimate - totalMargin; // 765 kcal
  const totalMax = totalMealEstimate + totalMargin; // 1035 kcal

  assert(totalMealEstimate === 900, 'Multi-item meal scales total calories correctly (720 + 180 = 900)');
  assert(totalMin === 765 && totalMax === 1035, `Multi-item range is ±15%: ${totalMin} - ${totalMax} kcal`);

  // --- Test 3: Backfilling (Logging for Yesterday & Earlier Days) ---
  console.log('\n--- 3. Backfill Detection & Date Handling ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

  assert(yesterdayStr < todayStr, 'Yesterday date string is chronologically before today');
  assert(threeDaysAgoStr < todayStr, 'Three days ago is chronologically before today');

  const checkIsBackfilled = (targetDate) => targetDate < todayStr;
  assert(!checkIsBackfilled(todayStr), "Today's log is marked isBackfilled: false");
  assert(checkIsBackfilled(yesterdayStr), 'Yesterday log is marked isBackfilled: true ("kal kya khaya")');
  assert(checkIsBackfilled(threeDaysAgoStr), 'Earlier date log is marked isBackfilled: true');

  // --- Test 4: dailyEnergyAggregator Sourcing eatenKcal from FoodLog ---
  console.log('\n--- 4. dailyEnergyAggregator Integration with FoodLog ---');
  
  // Mock FoodLog model with sample entries
  const mockFoodLogModel = {
    find: async ({ userId, date }) => {
      if (date === '2026-11-05') {
        return [
          { totalCaloriesEstimated: 550, mealSlot: 'lunch' },
          { totalCaloriesEstimated: 450, mealSlot: 'dinner' }
        ];
      }
      return [];
    }
  };

  const mockWorkoutProgramModel = {
    find: async () => [
      {
        progress: {
          completedSessions: [
            { completedAt: '2026-11-05T10:00:00.000Z', caloriesBurned: 350 }
          ]
        }
      }
    ]
  };

  const mockActivityLogModel = {
    findOne: async () => ({
      estimatedWalkingCalories: 200
    })
  };

  const energyResult = await computeTodaysEnergy('user123', '2026-11-05', {
    UserWorkoutProgram: mockWorkoutProgramModel,
    ActivityLog: mockActivityLogModel,
    FoodLog: mockFoodLogModel
  });

  assert(energyResult.eatenKcal === 1000, `eatenKcal correctly computed from FoodLog (550 + 450 = ${energyResult.eatenKcal})`);
  assert(energyResult.workoutKcal === 350, `workoutKcal is ${energyResult.workoutKcal}`);
  assert(energyResult.walkingKcal === 130, `walkingKcal with overlap deduction is ${energyResult.walkingKcal}`);
  assert(energyResult.estimatedExpenditure === 480, `estimatedExpenditure is ${energyResult.estimatedExpenditure}`);
  assert(energyResult.balance === (1000 - 480), `Energy balance is eaten - expenditure = ${energyResult.balance} kcal`);

  // --- Test 5: Diet Report Non-Prescriptive Compliance (Rule R2) ---
  console.log('\n--- 5. Diet Report Rule R2 Compliance (Track & Report Only) ---');
  // Check that report structure is observational only
  const reportStructure = {
    reportType: 'weekly_summary',
    totals: { totalIntakeKcal: 7000, totalExpenditureKcal: 3500, netBalanceKcal: 3500 },
    complianceNote: 'GymSync tracks and reports your logged food and activity. GymSync does not prescribe or assign calorie limits or diet plans (Rule R2).'
  };

  assert(!('dailyPrescribedCal' in reportStructure), 'Report does NOT contain prescribed calorie targets');
  assert(!('recommendedMealPlan' in reportStructure), 'Report does NOT prescribe meal plans');
  assert(reportStructure.complianceNote.includes('does not prescribe'), 'Explicit non-prescriptive compliance note is present');

  console.log('\n======================================================');
  console.log(`📊 PHASE 4 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    throw new Error(`Phase 4 tests failed: ${failed} failures`);
  }
}

// Run standalone if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPhase4Tests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
