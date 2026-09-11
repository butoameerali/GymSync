import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { FOOD_SUBSTITUTION_GROUPS, getAlternatives } from '../services/nutrition/foodSubstitutionGroups.js';

async function runTests() {
  console.log("===============================================================");
  console.log("🧪 GYMSYNC PHASE 8: DIET SWAP & MACRO ENGINE");
  console.log("===============================================================");

  let passed = 0;
  let failed = 0;

  function assertCondition(desc, condition) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Test basic fetching
    const chickenAlts = getAlternatives('Grilled / Boiled Chicken Breast', []);
    assertCondition("Fetching chicken alternatives yields Fish, Beef, Eggs, Paneer, Tofu", chickenAlts.length >= 3);
    assertCondition("Alternatives do NOT include the original item", !chickenAlts.some(a => a.name.includes('Chicken')));

    // 2. Test restrictions (Vegan)
    const veganChickenAlts = getAlternatives('Grilled / Boiled Chicken Breast', ['Vegan']);
    assertCondition("Vegan alternatives to chicken yield only Vegan options (Tofu, Lentils)", veganChickenAlts.every(a => ['Tofu (Firm)', 'Cooked Lentils / Daal Tadka', 'Cooked Brown Rice', 'Whole Wheat Roti', 'Boiled Sweet Potato', 'Rolled Oats with Cinnamon & Water'].includes(a.name)));

    // 3. Test restrictions (Lactose Intolerant)
    const lactoseAlts = getAlternatives('Grilled / Boiled Chicken Breast', ['Lactose Intolerant']);
    assertCondition("Lactose Intolerant alternatives exclude Paneer and Greek Yogurt", !lactoseAlts.some(a => ['Low-Fat Paneer / Cottage Cheese', 'Greek Yogurt (Plain, Non-Fat)'].includes(a.name)));

  } catch (err) {
    console.error(err);
    failed++;
  } finally {
    console.log("\n===============================================================");
    console.log(`📊 PHASE 8 TEST REPORT: ${passed} PASSED / ${failed} FAILED`);
    if (failed > 0) process.exit(1);
    else process.exit(0);
  }
}

runTests();
