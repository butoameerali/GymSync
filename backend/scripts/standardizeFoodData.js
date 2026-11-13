/**
 * Script: Standardize Pakistani Food Database
 * 1. Prioritizes simple, common household names:
 *    - Chicken, Egg, Omelette, Fries, Oats, Roti, Rice, Daal, Mix Sabzi, Paratha, Aloo Matar, Aloo Gobi, Chai, Salad, etc.
 * 2. Ensures every food has:
 *    - simpleName (short, clean, recognizable name without giant parentheticals)
 *    - qtyPerPlate (explicit serving quantity per plate)
 *    - minCalories & maxCalories (clear range, min - max kcal)
 *    - recipeUsed (how typically made + ingredients summary)
 *    - whoCanEat (who is it suitable for: Gym, Weight Loss, Diabetics, Family)
 *    - whoShouldLimit (cautions for BP, Cholesterol, Uric Acid)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, '../data/pkFoods.json');

const foods = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 1. Core Everyday Home Dishes with Simple Names requested by user
const PRIMARY_HOME_DISHES = [
  {
    foodId: 'pk_home_chicken',
    name: 'Chicken',
    simpleName: 'Chicken',
    variation: 'Ghar Ka Salan / Curry',
    portionLabel: '1 Plate',
    qtyPerPlate: '1 Plate (250g) - 2-3 pieces with gravy',
    aliases: {
      romanUrdu: ['chicken', 'murghi', 'chicken salan', 'chicken curry', 'chicken boti', 'ghar ka chicken', 'chiken'],
      urdu: ['چکن', 'مرغی کا سالن']
    },
    category: 'gosht',
    typicalServing: { unit: 'plate (250g)', grams: 250 },
    calories: 260,
    minCalories: 220,
    maxCalories: 300,
    protein: 28.0,
    carbs: 6.0,
    fat: 13.0,
    fiber: 1.2,
    mainIngredients: ['Skinless Chicken Boti', 'Pyaz', 'Tamatar', 'Lehsan-Adrak Paste', 'Haldi & Lal Mirch', 'Zeera', '1 Tsp Oil'],
    howTypicallyMade: 'Chicken ko pyaz, tamatar, lehsan, adrak aur masalon ke sath halkay oil mein bhun kar narm hone tak dum par pakaya jata hai.',
    recipeSteps: [
      'Pan mein 1 chamach oil garam karein aur baareek kata pyaz golden fry karein.',
      'Chicken boti, lehsan-adrak paste aur tamatar shamil karein.',
      'Lal mirch, haldi, zeera aur namak daal kar 5 minute tezz aanch par bhunein.',
      'Adha cup paani daal kar halki aanch par 10-12 minute dhak kar pakayein jab tak gosht gal jaye.',
      'Hara dhaniya aur sabz mirch se garnish kar ke garam roti ya chawal ke sath serve karein.'
    ],
    healthyTip: 'Skinless chicken istemal karein aur gravy mein oil ki miqdaar sirf 1 chamach tak mehdood rakhein.',
    benefits: 'High-quality complete protein jo muscle growth, muscle repair aur lambay arsay tak bhook roknay ke liye behtareen hai.',
    whoCanEat: ['Gym & Muscle Gain (High Protein)', 'Weight Loss (Low Carb)', 'Ghar Ke Sab Afrad (Family Friendly)'],
    whoShouldLimit: ['Uric acid patients portion control karein', 'Heart patients kam oil istemal karein'],
    tags: ['chicken', 'gosht', 'high_protein', 'healthy', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_egg',
    name: 'Egg',
    simpleName: 'Egg',
    variation: 'Boiled Egg (2 Anday)',
    portionLabel: '2 Whole Eggs',
    qtyPerPlate: '2 Eggs (~100g)',
    aliases: {
      romanUrdu: ['egg', 'boiled egg', 'ubla anda', 'anday', 'hard boiled egg', 'saada anda'],
      urdu: ['انڈا', 'ابلا ہوا انڈا']
    },
    category: 'nashta',
    typicalServing: { unit: '2 eggs', grams: 100 },
    calories: 140,
    minCalories: 120,
    maxCalories: 160,
    protein: 12.6,
    carbs: 1.1,
    fat: 9.8,
    fiber: 0.0,
    mainIngredients: ['2 Fresh Eggs', 'Water', 'Kali Mirch (Black Pepper)', 'Namak (Salt)'],
    howTypicallyMade: 'Andon ko saaf paani mein 8-10 minute boil kar ke chilka utaar kar kali mirch aur namak ke sath serve kiya jata hai.',
    recipeSteps: [
      'Bartan mein paani garam karein aur andon ko chamach se ahtiyat se daalein.',
      '8 se 10 minute tak ubalne dein (Hard boiled).',
      'Thanday paani mein daal kar chilka utarein aur darmiyan se kaat lein.',
      'Kali mirch aur halka namak chirak kar serve karein.'
    ],
    healthyTip: 'Boiled egg nashtay ke liye best hai kyun ke is mein cooking oil bilkul shamil nahi hota.',
    benefits: 'High bioavailable protein, Vitamin B12 aur Choline se bharpoor, jo muscles aur dimagh ko taaqat deta hai.',
    whoCanEat: ['Gym & Muscle Building (Best Bioavailable Protein)', 'Weight Loss (Super Satiety)', 'Bachay aur Baray (All Ages)'],
    whoShouldLimit: ['High cholesterol wale egg yolk (zardi) nikaal kar egg white istemal karein'],
    tags: ['egg', 'nashta', 'high_protein', 'low_calorie', 'healthy', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_omelette',
    name: 'Omelette',
    simpleName: 'Omelette',
    variation: 'Desi Ghar Ka Omelette',
    portionLabel: '2 Eggs Omelette',
    qtyPerPlate: '1 Omelette (~130g)',
    aliases: {
      romanUrdu: ['omelette', 'omelet', 'desi omelette', 'anda omelette', 'pyaz tamatar omelette', 'nashta omelette'],
      urdu: ['آملیٹ', 'انڈے کا آملیٹ']
    },
    category: 'nashta',
    typicalServing: { unit: '1 omelette (2 eggs)', grams: 130 },
    calories: 180,
    minCalories: 155,
    maxCalories: 210,
    protein: 13.0,
    carbs: 3.5,
    fat: 12.5,
    fiber: 0.8,
    mainIngredients: ['2 Fresh Eggs', '1 Chota Pyaz (Chopped)', '1 Tamatar', '1 Sabz Mirch', 'Hara Dhaniya', '1 Tsp Oil'],
    howTypicallyMade: 'Andon ko pyaz, tamatar, sabz mirch aur masalon ke sath phent kar taway par dono taraf se golden sekain.',
    recipeSteps: [
      'Bowl mein 2 anday tore kar achi tarah phentein.',
      'Baareek kata pyaz, tamatar, sabz mirch, hara dhaniya, namak aur kali mirch mix karein.',
      'Taway par 1 chamach oil/ghee garam kar ke ameeza phela dein.',
      'Dono taraf se golden brown sek kar garma garam utaar lein.'
    ],
    healthyTip: 'Non-stick tawa use karein taake sirf aadha chamach oil mein tasty omelette tayyar ho jaye.',
    benefits: 'Subah ka taaqatwar nashta jo din bhar energy deta hai aur jaldi bhook nahi lagnay deta.',
    whoCanEat: ['Subah Ke Nashtay Ke Liye (High Energy)', 'Gym & Fitness', 'Working Professionals & Students'],
    whoShouldLimit: ['Heart patients oil ki miqdaar kam rakhein'],
    tags: ['omelette', 'egg', 'nashta', 'high_protein', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_fries',
    name: 'Fries',
    simpleName: 'Fries',
    variation: 'Crispy Potato French Fries',
    portionLabel: '1 Medium Plate',
    qtyPerPlate: '1 Medium Plate / Bowl (~150g)',
    aliases: {
      romanUrdu: ['fries', 'french fries', 'chips', 'aloo chips', 'potato fries', 'finger chips', 'crispy fries'],
      urdu: ['فرائز', 'فرنچ فرائز', 'آلو چپس']
    },
    category: 'fast_food',
    typicalServing: { unit: 'medium plate', grams: 150 },
    calories: 290,
    minCalories: 250,
    maxCalories: 340,
    protein: 3.5,
    carbs: 41.0,
    fat: 13.0,
    fiber: 3.8,
    mainIngredients: ['Taza Aloo (Potatoes)', 'Thanda Paani (Soaking)', 'Cooking Oil (Frying/Air-Fry)', 'Chaat Masala', 'Halka Namak'],
    howTypicallyMade: 'Aloo ko finger strips mein kaat kar dho kar crispy fry ya air-fry kiya jata hai aur chaat masala chirka jata hai.',
    recipeSteps: [
      'Aloo cheel kar ek jaisi lambi finger strips mein kaatein.',
      'Thanday paani mein 10 minute bhigo kar starch saaf karein aur kapray se achi tarah sookha lein.',
      'Garam oil mein crispy fry karein (ya Air Fryer mein 180°C par 15 min cook karein).',
      'Oil nikaal kar paper towel par rakhein aur garam garam chaat masala chirkein.'
    ],
    healthyTip: 'Air fryer ya baking oven use karein jis se 80% oil aur calories kam ho jati hain.',
    benefits: 'Sari duniya ka pasandeeda snack, quick carbohydrate energy ka foran zariya.',
    whoCanEat: ['Kids & Youth (Taza Ghar Ka Snack)', 'Post-Workout High Carb Refuel', 'Cheat Meal / Occasional Treat'],
    whoShouldLimit: ['Weight loss / Fat loss wale ehtiyat karein', 'Sugar & High Cholesterol wale daily istemal na karein'],
    tags: ['fries', 'fast_food', 'snacks', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: true,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_oats',
    name: 'Oats',
    simpleName: 'Oats',
    variation: 'Doodh Walay Healthy Oatmeal',
    portionLabel: '1 Bowl (1.5 cups)',
    qtyPerPlate: '1 Bowl (220g)',
    aliases: {
      romanUrdu: ['oats', 'oatmeal', 'doodh walay oats', 'oats ka daliya', 'porridge', 'healthy oats'],
      urdu: ['اوٹس', 'دودھ والے اوٹس']
    },
    category: 'nashta',
    typicalServing: { unit: 'bowl (1.5 cups)', grams: 220 },
    calories: 210,
    minCalories: 180,
    maxCalories: 240,
    protein: 8.5,
    carbs: 34.0,
    fat: 4.2,
    fiber: 5.8,
    mainIngredients: ['Rolled / Quick Oats', 'Low Fat Milk / Water', 'Choti Elaichi', 'Darchini (Cinnamon)', '1 Chota Chamach Shehad'],
    howTypicallyMade: 'Oats ko low-fat doodh aur elaichi ke sath halki aanch par paka kar creamy banaya jata hai.',
    recipeSteps: [
      'Pan mein 1 cup low-fat doodh ya paani garam karein.',
      '4-5 chamach rolled oats aur choti elaichi shamil karein.',
      'Halki aanch par 3-4 minute pakaein jab tak oats phool jayein aur creamy ho jayein.',
      'Choolha band karein, 1 chamach shehad ya darchini chirak kar serve karein.'
    ],
    healthyTip: 'Cheeni ke bajaye darchini ya 1 chamach shehad use karein aur skimmed milk use karein.',
    benefits: 'Beta-glucan soluble fiber se bharpoor; cholesterol kam karta hai aur pait ko ghanton bhara rakhta hai.',
    whoCanEat: ['Weight Loss & Fat Loss (High Satiety)', 'Heart & Cholesterol Care', 'Sugar / Diabetics Friendly', 'Daily Healthy Nashta'],
    whoShouldLimit: ['Gluten allergy wale certified gluten-free oats use karein'],
    tags: ['oats', 'nashta', 'healthy', 'high_fiber', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_roti',
    name: 'Roti',
    simpleName: 'Roti',
    variation: '100% Whole Wheat Phulka',
    portionLabel: '1 Medium Roti',
    qtyPerPlate: '1 Medium Roti (~60g)',
    aliases: {
      romanUrdu: ['roti', 'chapati', 'phulka', 'ghar ki roti', 'saada roti', 'atta roti', 'whole wheat roti'],
      urdu: ['روٹی', 'گھر کی چپاتی']
    },
    category: 'roti_paratha',
    typicalServing: { unit: '1 medium roti', grams: 60 },
    calories: 120,
    minCalories: 105,
    maxCalories: 135,
    protein: 3.8,
    carbs: 24.5,
    fat: 0.8,
    fiber: 3.2,
    mainIngredients: ['100% Whole Wheat Chakki Atta', 'Paani', 'Chutki Namak (Optional)'],
    howTypicallyMade: 'Atta goondh kar patla bail kar bina ghee/oil ke taway par dono taraf se phula kar banayi jati hai.',
    recipeSteps: [
      'Chakki ke attay ka peda bana kar sookhay attay mein lapetain.',
      'Belan se patla aur gol bail lein.',
      'Garam taway par daal kar dono taraf se sekein.',
      'Aanch par phulka phula kar foran utaar lein.'
    ],
    healthyTip: 'Bina ghee/oil ke phulka khayein taake extra fat aur calories se bacha ja sake.',
    benefits: 'Complex carbs aur dietary fiber deta hai, hazma behtar karta hai aur khoon mein sugar control rakhta hai.',
    whoCanEat: ['Sab Ke Liye (Daily Staple Diet)', 'Weight Loss (Bina ghee phulka)', 'Diabetics / Sugar Friendly'],
    whoShouldLimit: ['Celiac / Gluten allergy wale'],
    tags: ['roti', 'roti_paratha', 'healthy', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_rice',
    name: 'Rice',
    simpleName: 'Rice',
    variation: 'Saada Ublay Chawal',
    portionLabel: '1 Plate',
    qtyPerPlate: '1 Plate (~180g)',
    aliases: {
      romanUrdu: ['rice', 'chawal', 'saada chawal', 'boiled rice', 'steamed rice', 'ublay chawal', 'white rice'],
      urdu: ['چاول', 'سادہ چاول', 'ابلے ہوئے چاول']
    },
    category: 'chawal',
    typicalServing: { unit: 'plate (1.25 cups)', grams: 180 },
    calories: 210,
    minCalories: 185,
    maxCalories: 235,
    protein: 4.2,
    carbs: 45.0,
    fat: 0.5,
    fiber: 1.2,
    mainIngredients: ['Basmati Rice', 'Paani', 'Chutki Zeera & Namak'],
    howTypicallyMade: 'Chawal bhigo kar ubaltay paani mein paka kar paani nithar kar dum par rakhay jatay hain.',
    recipeSteps: [
      'Chawal ko 20 minute dho kar bhigo lein.',
      'Ubaltay paani mein namak daal kar chawal 85% tak galne dein.',
      'Paani nithar lein aur 5 minute halki aanch par dum dein.'
    ],
    healthyTip: 'Daal, salan aur taza salad ke sath khayein taake meal ka glycemic index low rahay.',
    benefits: 'Halke aur foran hazam hone walay carbs jo workout ke baad energy replenish karte hain.',
    whoCanEat: ['Post-Workout Energy Replenishment', 'Hazma / Stomach Sensitivity', 'General Active Population'],
    whoShouldLimit: ['Strict low-carb / Keto dieting wale portion kam rakhein'],
    tags: ['rice', 'chawal', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_daal',
    name: 'Daal',
    simpleName: 'Daal',
    variation: 'Ghar Ki Moong / Masoor',
    portionLabel: '1 Bowl / Plate',
    qtyPerPlate: '1 Bowl / Plate (~200g)',
    aliases: {
      romanUrdu: ['daal', 'dal', 'peeli daal', 'moong daal', 'masoor daal', 'daal tarka', 'ghar ki daal'],
      urdu: ['دال', 'گھر کی دال']
    },
    category: 'daal',
    typicalServing: { unit: 'bowl (1 cup)', grams: 200 },
    calories: 190,
    minCalories: 165,
    maxCalories: 220,
    protein: 11.5,
    carbs: 28.0,
    fat: 4.0,
    fiber: 6.5,
    mainIngredients: ['Moong & Masoor Daal', 'Lehsan', 'Zeera', 'Haldi', 'Tamatar', '1 Chamach Oil'],
    howTypicallyMade: 'Daal ko narm hone tak ubal kar lehsan aur zeera ke halkay tarka ke sath tayyar kiya jata hai.',
    recipeSteps: [
      'Daal dho kar paani, haldi aur namak ke sath galne tak pakaein.',
      'Chotay tawa par 1 chamach oil mein lehsan aur zeera tarka lagayein.',
      'Tarka daal mein shamil karein aur hara dhaniya garnish karein.'
    ],
    healthyTip: 'Tarka lagatay waqt oil ya ghee sirf 1 chotay chamach tak mehdood rakhein.',
    benefits: 'Plant protein aur fiber ka shandar zariya jo hazma theek rakhta hai aur dil ke liye mufeed hai.',
    whoCanEat: ['Weight Loss & Daily Nutrition', 'Vegetarians & Plant Protein', 'Sab Ghar Ke Afrad'],
    whoShouldLimit: ['High uric acid wale portion check karein'],
    tags: ['daal', 'high_protein', 'high_fiber', 'healthy', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_paratha',
    name: 'Paratha',
    simpleName: 'Paratha',
    variation: 'Ghar Ka Saada Paratha',
    portionLabel: '1 Medium Paratha',
    qtyPerPlate: '1 Medium Paratha (~80g)',
    aliases: {
      romanUrdu: ['paratha', 'plain paratha', 'saada paratha', 'ghee paratha', 'crispy paratha', 'nashta paratha'],
      urdu: ['پراٹھا', 'سادہ پراٹھا']
    },
    category: 'roti_paratha',
    typicalServing: { unit: '1 medium paratha', grams: 80 },
    calories: 260,
    minCalories: 230,
    maxCalories: 300,
    protein: 4.8,
    carbs: 32.0,
    fat: 12.0,
    fiber: 3.5,
    mainIngredients: ['Whole Wheat Atta', 'Ghee / Cooking Oil (1.5 tsp)', 'Paani', 'Chutki Namak'],
    howTypicallyMade: 'Attay ke peday par halka sa ghee laga kar bail kar dono taraf se taway par golden sekain.',
    recipeSteps: [
      'Attay ke peday ko bail kar darmiyan mein halka ghee lagayein aur fold karein.',
      'Dobara gol bail kar garam taway par daalein.',
      'Halka oil/ghee laga kar dono taraf se crispy golden sek lein.'
    ],
    healthyTip: 'Desi ghee ya olive oil ka 1 chamach use karein aur banaspati ghee se bachein.',
    benefits: 'Heavy physical activities aur subah ki sustained energy ke liye bohat taaqatwar.',
    whoCanEat: ['Hard Physical Work / Athletes', 'High Energy Morning Fuel'],
    whoShouldLimit: ['Strict weight loss wale roti ko tarjeeh dein, Heart / BP wale oil kam karein'],
    tags: ['paratha', 'roti_paratha', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_mix_sabzi',
    name: 'Mix Sabzi',
    simpleName: 'Mix Sabzi',
    variation: 'Aloo Matar Gajar Shimla Mirch',
    portionLabel: '1 Plate',
    qtyPerPlate: '1 Plate (~220g)',
    aliases: {
      romanUrdu: ['mix sabzi', 'sabzi', 'mixed vegetables', 'aloo matar gajar', 'tarkari', 'ghar ki sabzi'],
      urdu: ['مکس سبزی', 'سبزی']
    },
    category: 'sabzi',
    typicalServing: { unit: 'plate', grams: 220 },
    calories: 160,
    minCalories: 135,
    maxCalories: 185,
    protein: 4.5,
    carbs: 23.0,
    fat: 5.5,
    fiber: 5.8,
    mainIngredients: ['Aloo, Gajar, Matar, Shimla Mirch', 'Pyaz & Tamatar', 'Zeera & Garam Masala', '1 Chamach Oil'],
    howTypicallyMade: 'Taza sabziyon ko pyaz, tamatar aur masalon ke sath kam oil mein dum par pakaya jata hai.',
    recipeSteps: [
      'Karahi mein 1 chamach oil mein zeera aur pyaz halka bhunein.',
      'Tamatar aur sabziyan daal kar namak, haldi, mirch mix karein.',
      'Dhakkan dahanp kar halki aanch par sabzi galne tak dum dein.'
    ],
    healthyTip: 'Sabzi ko ziyada over-cook na karein taake vitamins aur crunchy fiber barqarar rahe.',
    benefits: 'Multivitamins, minerals aur high fiber se bharpoor; calories bohat kam hoti hain.',
    whoCanEat: ['Weight Loss & Fat Loss (Super Low Calorie)', 'Digestion & Gut Health', 'Heart Patients & Diabetics'],
    whoShouldLimit: ['Sab ke liye 100% mufeed hai'],
    tags: ['sabzi', 'healthy', 'low_calorie', 'high_fiber', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_salad',
    name: 'Salad',
    simpleName: 'Salad',
    variation: 'Fresh Green Kachumber',
    portionLabel: '1 Plate',
    qtyPerPlate: '1 Plate (~150g)',
    aliases: {
      romanUrdu: ['salad', 'kachumber', 'green salad', 'fresh salad', 'kheera tamatar salad', 'desi salad'],
      urdu: ['سلاد', 'کچومبر سلاد']
    },
    category: 'chutney_raita',
    typicalServing: { unit: 'plate', grams: 150 },
    calories: 45,
    minCalories: 35,
    maxCalories: 55,
    protein: 1.8,
    carbs: 8.5,
    fat: 0.3,
    fiber: 3.2,
    mainIngredients: ['Kheera (Cucumber)', 'Tamatar (Tomato)', 'Pyaz (Onion)', 'Lemon Juice', 'Chaat Masala / Kali Mirch'],
    howTypicallyMade: 'Kheeray, tamatar aur pyaz ko chota kaat kar leemo ka ras aur chaat masala nichor kar serve karein.',
    recipeSteps: [
      'Kheera, tamatar aur pyaz dho kar baareek cube shape mein kaatein.',
      'Bowl mein mix kar ke taza leemo ka ras nichorein.',
      'Chutki kali mirch ya chaat masala chirak kar foran serve karein.'
    ],
    healthyTip: 'Har khane ke sath 1 plate salad lazmi khayein taake overeating na ho.',
    benefits: 'Zero fat, hydrating, pait ko foran bharta hai aur sugar spike ko rokta hai.',
    whoCanEat: ['Weight Loss & Fat Loss (Best Choice)', 'Diabetics & Heart Patients', 'Sab Ke Liye Super Healthy'],
    whoShouldLimit: ['Sab afrad ke liye 100% safe aur recommended'],
    tags: ['salad', 'healthy', 'low_calorie', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_home_chai',
    name: 'Chai',
    simpleName: 'Chai',
    variation: 'Ghar Ki Doodh Patti',
    portionLabel: '1 Cup (150ml)',
    qtyPerPlate: '1 Cup (~150ml)',
    aliases: {
      romanUrdu: ['chai', 'tea', 'doodh patti', 'karak chai', 'black tea', 'desi chai', 'chaye'],
      urdu: ['چائے', 'دودھ پتی چائے']
    },
    category: 'drinks',
    typicalServing: { unit: 'cup (150ml)', grams: 150 },
    calories: 95,
    minCalories: 80,
    maxCalories: 115,
    protein: 3.0,
    carbs: 9.5,
    fat: 4.5,
    fiber: 0.0,
    mainIngredients: ['Black Tea Leaves (Patti)', 'Doodh (Milk)', 'Elaichi', '1 Chota Chamach Cheeni / Jaggery'],
    howTypicallyMade: 'Doodh aur paani mein patti aur elaichi daal kar achi tarah ubaal kar phent kar tayyar ki jati hai.',
    recipeSteps: [
      'Pan mein paani aur doodh ubaalein.',
      'Chai ki patti aur kooti hui elaichi shamil karein.',
      '3-4 baar ubaal aane par phentain jab tak rangat karak ho jaye.',
      'Chaan kar garma garam piyen.'
    ],
    healthyTip: 'Cheeni kam karein ya stevia/gur use karein aur low-fat milk istemal karein.',
    benefits: 'Mental alertness, mood refreshment aur antioxidants.',
    whoCanEat: ['Mental Refreshment & Focus', 'Daily Morning/Evening Beverage'],
    whoShouldLimit: ['Sugar patients cheeni bilkul na daalein (sugar-free chai)'],
    tags: ['chai', 'drinks', 'home_food'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  }
];

// Helper: derive clean simpleName and variation from long name
function deriveSimpleFields(food) {
  // If already clean simpleName, keep it
  if (food.simpleName) return;

  const rawName = food.name || '';
  const match = rawName.match(/^([^(]+)(?:\(([^)]+)\))?/);
  let base = food.baseName || (match ? match[1].trim() : rawName);
  let insideParen = match && match[2] ? match[2].trim() : '';

  // Clean base name from verbose suffixes
  base = base
    .replace(/\s*-\s*Classic.*/i, '')
    .replace(/\s*-\s*Standard.*/i, '')
    .replace(/\s*-\s*Pakistani.*/i, '')
    .trim();

  let variation = '';
  let portionLabel = '';
  if (insideParen) {
    const parts = insideParen.split(' - ');
    if (parts.length > 1) {
      variation = parts[0].trim();
      portionLabel = parts[1].trim();
    } else {
      variation = insideParen;
    }
  }

  food.simpleName = base;
  food.variation = variation;
  food.portionLabel = portionLabel || 'Standard Serving';
  food.qtyPerPlate = `${food.typicalServing?.unit || '1 Serving'} (~${food.typicalServing?.grams || 150}g)`;

  // Range
  const estRange = food.estimateRangePercent || 15;
  food.minCalories = Math.round(food.calories * (1 - estRange / 100));
  food.maxCalories = Math.round(food.calories * (1 + estRange / 100));

  // Determine whoCanEat if not present
  if (!food.whoCanEat || food.whoCanEat.length === 0) {
    const suitable = [];
    if (food.protein >= 16) {
      suitable.push('Gym & Muscle Building (High Protein)');
    }
    if (food.calories < 220 || (food.fiber && food.fiber >= 5)) {
      suitable.push('Weight Loss & Fat Loss (Low Calorie)');
    }
    if (food.fiber >= 5 || food.category === 'daal' || food.category === 'sabzi') {
      suitable.push('Digestion & Heart Health (High Fiber)');
    }
    if (food.category === 'chawal' || food.category === 'roti_paratha') {
      suitable.push('Active Daily Energy & Carbohydrates');
    }
    if (suitable.length === 0) {
      suitable.push('Ghar Ke Sab Log (Balanced Nutrition)');
    }
    food.whoCanEat = suitable;
  }

  // Ensure whoShouldLimit
  if (!food.whoShouldLimit || food.whoShouldLimit.length === 0) {
    if (['fast_food', 'sweets'].includes(food.category) || (food.fat && food.fat > 18)) {
      food.whoShouldLimit = ['Weight loss / Fat loss wale ehtiyat karein', 'High Cholesterol wale limit karein'];
    } else {
      food.whoShouldLimit = ['General moderation recommended'];
    }
  }
}

// 2. Prepend or update PRIMARY_HOME_DISHES
for (const dish of PRIMARY_HOME_DISHES) {
  const existingIdx = foods.findIndex(f => f.foodId === dish.foodId);
  if (existingIdx >= 0) {
    foods[existingIdx] = dish;
  } else {
    foods.unshift(dish);
  }
}

// 3. Process all remaining items
for (const f of foods) {
  deriveSimpleFields(f);
}

fs.writeFileSync(jsonPath, JSON.stringify(foods, null, 2), 'utf8');
console.log(`✅ Standardized pkFoods.json: ${foods.length} items with simple names, min/max kcal, recipe and whoCanEat fields.`);
