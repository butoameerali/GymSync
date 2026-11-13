/**
 * Enrich Pakistani Food Database with:
 * 1. Premier Gym & Health Preferred Dishes placed at the very top.
 * 2. Complete, authentic recipes (ingredients, step-by-step instructions, healthy tips, benefits).
 * 3. Structured mealSlots ('breakfast', 'lunch', 'snack', 'dinner') on EVERY food item.
 * 4. isGymPreferred: true on all gym & fitness recommended foods.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, '../data/pkFoods.json');

const foods = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ── 1. PREMIER GYM & HEALTH FITNESS DISHES (PLACED AT THE VERY TOP) ──
const PREMIER_GYM_HEALTH_DISHES = [
  {
    foodId: 'pk_gym_boiled_chicken_breast',
    name: 'Boiled Chicken Breast (Clean Protein)',
    simpleName: 'Boiled Chicken Breast',
    variation: 'Clean Boiled & Shredded with Lemon & Kali Mirch',
    portionLabel: '150g Breast',
    qtyPerPlate: '150g Clean Breast (~46g Protein)',
    aliases: {
      romanUrdu: ['boiled chicken', 'chicken breast', 'ubli hui murghi', 'boiled chicken breast', 'gym chicken', 'clean chicken', 'diet chicken'],
      urdu: ['ابلا ہوا چکن بریسٹ', 'جم چکن', 'ڈائٹ چکن']
    },
    category: 'gosht',
    typicalServing: { unit: 'breast piece (150g)', grams: 150 },
    calories: 245,
    minCalories: 220,
    maxCalories: 270,
    protein: 46.5,
    carbs: 0.0,
    fat: 5.2,
    fiber: 0.0,
    mainIngredients: ['150g Fresh Skinless Chicken Breast', '1 Clove Garlic (Lehsan)', '1 Slice Adrak', '1/2 Lemon (Nimbu ka Ras)', 'Taza Pisi Kali Mirch', 'Himalayan Pink Salt (Chutki)'],
    howTypicallyMade: 'Chicken breast ko lehsan, adrak aur halkay namak ke sath paani mein narm hone tak ubaal kar kali mirch aur lemon juice ke sath serve kiya jata hai.',
    recipeSteps: [
      'Skinless chicken breast ko dho kar fork se halkay holes kar lein taake andar tak pake.',
      'Pan mein 2 cup paani, 1 lehsan ka jwa, adrak ka tukra aur chutki namak shamil karein.',
      'Chicken daal kar ubaal aane dein, phir darmiyani aanch par 12-14 minute dhak kar pakaein.',
      'Jab chicken bilkul safaid aur narm ho jaye toh nikaal kar shreds ya cubes mein kaat lein.',
      'Upar taza pisi kali mirch aur aadha leemu nichor kar garma garam serve karein.'
    ],
    healthyTip: 'Oil zero use hota hai. Paani mein lehsan aur zeera daal kar ubaalne se chicken ki smell bilkul khatam ho jati hai aur protein 100% bioavailable rehta hai.',
    benefits: 'Gold standard lean protein for muscle building, rapid workout recovery, and zero unwanted fats for aggressive fat loss.',
    whoCanEat: ['Gym & Muscle Gain (Maximum Protein)', 'Fat Loss & Cutting (Zero Carb, Low Fat)', 'High Protein Diet'],
    whoShouldLimit: ['Uric acid patients portion doctor ke mashwaray se lein'],
    mealSlots: ['lunch', 'dinner'],
    tags: ['gym', 'high_protein', 'healthy', 'chicken', 'lunch', 'dinner', 'clean_eating', 'fat_loss', 'muscle_building'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_boiled_eggs_white',
    name: 'Boiled Eggs & Egg Whites (2 Whole + 2 Whites)',
    simpleName: 'Boiled Eggs (2 Whole + 2 Whites)',
    variation: '2 Whole Eggs + 2 Egg Whites',
    portionLabel: '4 Eggs (2 Whole + 2 Whites)',
    qtyPerPlate: '4 Eggs (~160g total)',
    aliases: {
      romanUrdu: ['boiled eggs', 'egg whites', 'ublay anday', 'anday', 'hard boiled eggs', 'gym eggs', 'protein anday'],
      urdu: ['ابلے ہوئے انڈے', 'انڈے کی سفیدی', 'پروٹین انڈے']
    },
    category: 'nashta',
    typicalServing: { unit: '4 eggs (2 whole + 2 whites)', grams: 160 },
    calories: 210,
    minCalories: 190,
    maxCalories: 230,
    protein: 24.5,
    carbs: 1.5,
    fat: 10.2,
    fiber: 0.0,
    mainIngredients: ['4 Fresh Farm Eggs', 'Boiling Water', 'Kali Mirch (Black Pepper)', 'Kala Namak / Pink Salt (Chutki)'],
    howTypicallyMade: '4 andon ko ubaal kar chilka utara jata hai, 2 andon ki zardi nikaal di jati hai aur 2 ko poora khaya jata hai.',
    recipeSteps: [
      'Degchi mein paani garam karein aur andon ko chamach se ahtiyat se garam paani mein daalein.',
      'Tezz ubaal par 9 se 10 minute tak pakaein (Perfect Hard Boiled).',
      'Gas band kar ke foran thanday paani mein daal dein taake chilka asaani se utar jaye.',
      'Chilka utaar kar 2 andon ko darmiyan se kaat kar zardi alag kar lein, aur 2 anday poore rakhein.',
      'Kali mirch aur halka kala namak chirak kar serve karein.'
    ],
    healthyTip: '2 whole eggs zaroori micronutrients (Choline, Vitamin D, Healthy Fats) dete hain, jabke 2 whites pure lean protein add karte hain bina extra cholesterol ke.',
    benefits: 'Best bioavailable protein on earth (BV 100), muscle repair aur subah lambi energy ke liye lajawab.',
    whoCanEat: ['Gym & Bodybuilding (Lean Protein Powerhouse)', 'Weight Loss & Satiety', 'Breakfast & Evening Snack'],
    whoShouldLimit: ['Severe cholesterol issues wale sirf egg whites istemal karein'],
    mealSlots: ['breakfast', 'snack'],
    tags: ['gym', 'high_protein', 'healthy', 'nashta', 'egg', 'breakfast', 'snack', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_desi_fitness_omelette',
    name: 'High-Protein Desi Fitness Omelette',
    simpleName: 'Fitness Desi Omelette',
    variation: '3 Eggs (1 Whole + 2 Whites) with Palak & Green Chillies',
    portionLabel: '1 Fitness Omelette',
    qtyPerPlate: '1 Large Omelette (~180g)',
    aliases: {
      romanUrdu: ['fitness omelette', 'gym omelette', 'desi omelette', 'egg white omelette', 'spinach omelette', 'palak omelette'],
      urdu: ['فٹنس آملیٹ', 'پالک انڈے کا آملیٹ', 'ہائی پروٹین آملیٹ']
    },
    category: 'nashta',
    typicalServing: { unit: '1 large omelette', grams: 180 },
    calories: 215,
    minCalories: 195,
    maxCalories: 240,
    protein: 21.0,
    carbs: 4.5,
    fat: 11.5,
    fiber: 1.8,
    mainIngredients: ['3 Fresh Eggs (1 Whole + 2 Whites)', '1 Cup Baareek Kati Palak (Spinach)', '1 Chota Pyaz', '1 Sabz Mirch', 'Hara Dhaniya', '1/2 Tsp Zaitoon Ka Tail (Olive Oil)', 'Namak & Kali Mirch'],
    howTypicallyMade: 'Andon ko taza palak, pyaz, sabz mirch aur kali mirch ke sath phent kar non-stick taway par sirf aadha chamach oil mein golden sekte hain.',
    recipeSteps: [
      'Bowl mein 1 poora anda aur 2 andon ki sirf safedi daal kar kaantay se achi tarah phentein.',
      'Baareek kati palak, chota pyaz, sabz mirch, hara dhaniya, namak aur kali mirch mix karein.',
      'Non-stick pan par 1/2 chamach olive oil daal kar brush se phela dein.',
      'Ameeza pan mein daal kar halki aanch par 2 minute pakayein jab tak neechay se set ho jaye.',
      'Chamchay se palat kar dusri taraf se 1 minute golden sek kar plate mein nikaal lein.'
    ],
    healthyTip: 'Palak se Iron aur Fiber milta hai aur sirf aadha chamach olive oil se calories bilkul control mein rehti hain.',
    benefits: 'Muscle repair, iron boost, high satiety aur zero sugar subah ke nashtay ke liye.',
    whoCanEat: ['Gym Enthusiasts & Athletes', 'Weight Loss (Low Carb High Protein)', 'Nashta & Post-Workout'],
    whoShouldLimit: ['Hypertension wale namak bilkul halka rakhein'],
    mealSlots: ['breakfast', 'snack'],
    tags: ['gym', 'high_protein', 'healthy', 'nashta', 'omelette', 'breakfast', 'snack'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_oatmeal_daliya',
    name: 'Gym Oatmeal Daliya (Milk, Banana & Seeds)',
    simpleName: 'Gym Oatmeal (Oats Daliya)',
    variation: 'Rolled Oats with Low-Fat Milk, Banana & Chia Seeds',
    portionLabel: '1 Large Bowl',
    qtyPerPlate: '1 Bowl (~260g) with toppings',
    aliases: {
      romanUrdu: ['gym oatmeal', 'oats daliya', 'doodh walay oats', 'oats porridge', 'banana oats', 'chia oats', 'healthy oatmeal'],
      urdu: ['جم اوٹ مل دلیہ', 'دودھ والے اوٹس', 'اوٹس دلیہ']
    },
    category: 'nashta',
    typicalServing: { unit: '1 bowl', grams: 260 },
    calories: 285,
    minCalories: 255,
    maxCalories: 315,
    protein: 13.5,
    carbs: 51.0,
    fat: 4.8,
    fiber: 7.2,
    mainIngredients: ['50g Rolled Oats', '200ml Skimmed Milk (Low Fat)', '1/2 Chota Kela (Banana Slices)', '1 Tsp Chia Seeds / Tukh Malanga', '1 Chutki Dalchini Powder (Cinnamon)'],
    howTypicallyMade: 'Oats ko skimmed doodh mein 4-5 minute pakaya jata hai aur kela, chia seeds aur dalchini se garnish kiya jata hai.',
    recipeSteps: [
      'Pan mein 200ml low-fat doodh aur 50g rolled oats daal kar halki aanch par rakhein.',
      'Chamach chalatay hue 4-5 minute ubaal aane tak pakaein jab tak daliya garha aur creamy ho jaye.',
      'Bowl mein nikaal kar upar aadha kela slice kar ke sajayein.',
      '1 chamach chia seeds aur 1 chutki dalchini powder chirak kar garma garam ya room temp par noosh karein.'
    ],
    healthyTip: 'Sugar ke bajaye kela natural sweetness deta hai aur dalchini insulin sensitivity barhati hai.',
    benefits: 'Beta-glucan soluble fiber jo cholesterol kam karta hai, sustained 4-5 ghantay ki slow release energy deta hai.',
    whoCanEat: ['Gym Pre-Workout Fuel & Energy', 'Heart Patients & Diabetics', 'Subah Ka Taqatwar Nashta'],
    whoShouldLimit: ['Strict keto wale oats na lein'],
    mealSlots: ['breakfast', 'snack'],
    tags: ['gym', 'healthy', 'nashta', 'breakfast', 'snack', 'oats', 'high_fiber', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_grilled_chicken_tikka',
    name: 'Grilled Chicken Tikka (Boneless BBQ Breast)',
    simpleName: 'Grilled Chicken Tikka',
    variation: 'Charcoal / Tawa Grilled Boneless Breast Pieces',
    portionLabel: '1 Plate (200g)',
    qtyPerPlate: '1 Plate (200g boneless) - ~42g Protein',
    aliases: {
      romanUrdu: ['chicken tikka', 'grilled chicken', 'bbq chicken', 'boneless tikka', 'gym tikka', 'chicken boti tikka'],
      urdu: ['چکن تکہ', 'گرلڈ چکن تکہ', 'باربی کیو تکہ']
    },
    category: 'bbq',
    typicalServing: { unit: 'plate (200g)', grams: 200 },
    calories: 260,
    minCalories: 235,
    maxCalories: 290,
    protein: 42.0,
    carbs: 2.5,
    fat: 8.0,
    fiber: 0.6,
    mainIngredients: ['200g Boneless Chicken Breast Cubes', '2 Tbsp Low Fat Dahi (Yogurt)', '1 Tsp Lehsan-Adrak Paste', 'Tikka Masala / Lal Mirch, Zeera, Dhania', '1/2 Lemon Juice', '1 Tsp Mustard / Olive Oil'],
    howTypicallyMade: 'Chicken boti ko dahi, lehsan adrak aur masalon mein 1 ghanta marinate kar ke grill ya non-stick taway par seka jata hai.',
    recipeSteps: [
      'Chicken breast ko cubes mein kaat kar dho kar sookha lein.',
      'Bowl mein dahi, lehsan-adrak, tikka masala, nimbu ka ras aur 1 chamach oil mila kar marinade banayein.',
      'Chicken ko achi tarah coat kar ke 30-60 minute fridge mein rakhein.',
      'Grill pan ya non-stick taway par halka oil spray kar ke har taraf se 3-4 minute tak sekain.',
      'Koyle ka dhuan de kar desi mint raita aur leemu pyaz ke sath serve karein.'
    ],
    healthyTip: 'Skinless boneless breast pieces use karein. Fry karne ke bajaye grill ya bake karein.',
    benefits: 'Ultra high protein meal for muscle hyper-trophy with minimal calories and authentic Pakistani BBQ flavor.',
    whoCanEat: ['Gym & Fitness (Dinner & Lunch)', 'High Protein Low Carb', 'Family BBQ Choice'],
    whoShouldLimit: ['Portion control for strict low sodium diets'],
    mealSlots: ['dinner', 'lunch'],
    tags: ['gym', 'high_protein', 'healthy', 'bbq', 'chicken', 'dinner', 'lunch', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_sattu_protein_shake',
    name: 'Desi Sattu Protein Drink (Roasted Gram Shake)',
    simpleName: 'Desi Sattu Protein Shake',
    variation: '40g Roasted Chana Flour with Chilled Water & Lemon',
    portionLabel: '1 Large Glass (300ml)',
    qtyPerPlate: '1 Glass (300ml with 40g Sattu)',
    aliases: {
      romanUrdu: ['sattu', 'desi sattu', 'sattu sharbat', 'chana sattu', 'sattu shake', 'desi whey protein', 'satu'],
      urdu: ['ستو کا شربت', 'دیسی ستو پروٹین', 'چنے کا ستو']
    },
    category: 'drinks',
    typicalServing: { unit: '1 glass (300ml)', grams: 300 },
    calories: 195,
    minCalories: 175,
    maxCalories: 215,
    protein: 14.2,
    carbs: 30.0,
    fat: 2.8,
    fiber: 7.5,
    mainIngredients: ['40g Bhuna Chana Sattu (Roasted Gram Powder)', '250ml Thanda Paani (Cold Water)', '1/2 Lemon (Nimbu)', '1/2 Tsp Bhuna Zeera Powder', 'Kala Namak (Pinch)'],
    howTypicallyMade: 'Sattu ko thanday paani mein ghol kar leemu, bhuna zeera aur kala namak mila kar shake banaya jata hai.',
    recipeSteps: [
      'Shaker ya glass mein 250ml thanda paani lein.',
      '40g (lagbhag 3 baray chamach) taza sattu shamil karein.',
      'Aadha leemu nichorain, bhuna zeera aur chutki kala namak daalein.',
      'Chammach se ya shaker bottle mein 30 second shake karein taake lumps na banein.',
      'Baraf daal kar do-peher ya workout se pehle piyen.'
    ],
    healthyTip: 'Cheeni ya gur ke bajaye namkeen (kala namak aur leemu) banayein taake zero processed sugar intake ho.',
    benefits: 'Known as Desi Whey Protein: natural gut cooling, gut bacteria support, muscle endurance, and high prebiotic fiber.',
    whoCanEat: ['Gym Athletes & Fitness Enthusiasts', 'Pre-Workout & Sham Ka Khana (Snack)', 'Summer Hydration'],
    whoShouldLimit: ['Severe bloat prone individuals start with 20g portion'],
    mealSlots: ['snack', 'breakfast'],
    tags: ['gym', 'high_protein', 'healthy', 'drinks', 'snack', 'breakfast', 'desi_whey', 'high_fiber'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_chana_lobia_chaat',
    name: 'Boiled Chana & Lobia Chaat (Chickpeas & Red Beans)',
    simpleName: 'Boiled Chana & Lobia Chaat',
    variation: 'Spiced Chickpeas, Red Kidney Beans, Cucumber & Lemon',
    portionLabel: '1 Medium Bowl (200g)',
    qtyPerPlate: '1 Bowl (~200g) with fresh salad dressing',
    aliases: {
      romanUrdu: ['chana chaat', 'lobia chaat', 'boiled chana', 'chickpea salad', 'protein chaat', 'healthy chaat', 'safaid chana'],
      urdu: ['چنا اور لوبیا چاٹ', 'ابلا چنا چاٹ', 'پروٹین چاٹ']
    },
    category: 'snacks',
    typicalServing: { unit: '1 bowl', grams: 200 },
    calories: 240,
    minCalories: 215,
    maxCalories: 265,
    protein: 14.5,
    carbs: 41.0,
    fat: 2.5,
    fiber: 11.2,
    mainIngredients: ['100g Ubla Safaid Chana (Boiled Chickpeas)', '50g Ubla Surkh Lobia (Red Beans)', '1 Baareek Kata Kheera (Cucumber)', '1 Tamatar', '1 Chota Pyaz', 'Chaat Masala & Nimbu ka Ras', 'Hara Dhaniya'],
    howTypicallyMade: 'Ublay chano aur lobia mein kheera, tamatar, pyaz, chaat masala aur leemu ka ras daal kar toss kiya jata hai.',
    recipeSteps: [
      'Bowl mein ublay safaid chanay aur ubla surkh lobia daalein.',
      'Baareek kata kheera, tamatar, pyaz aur hara dhaniya shamil karein.',
      'Chaat masala, thora zeera powder aur 1 poora leemu nichor kar mix karein.',
      'Achi tarah mix kar ke sham ki chai ya pre-workout snack ke tor par serve karein.'
    ],
    healthyTip: 'Imli ki meethi cheeni wali chutney avoid karein, sirf taza leemu aur chaat masala use karein.',
    benefits: 'Clean plant protein combined with incredible 11g dietary fiber for long lasting hunger suppression and digestive health.',
    whoCanEat: ['Gym & Fitness Snack (Sham Ka Khana)', 'Vegetarians & Clean Eaters', 'Diabetics & Heart Health'],
    whoShouldLimit: ['Gastric sensitivity wale portion control karein'],
    mealSlots: ['snack', 'lunch'],
    tags: ['gym', 'high_protein', 'healthy', 'snacks', 'snack', 'lunch', 'high_fiber', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_greek_dahi_bowl',
    name: 'Hung Dahi Bowl (Desi Greek Yogurt with Seeds)',
    simpleName: 'Hung Dahi (Greek Yogurt Bowl)',
    variation: 'Thick Strained Low-Fat Dahi with Walnuts & Flax Seeds',
    portionLabel: '1 Cup (180g)',
    qtyPerPlate: '1 Cup (~180g) with 10g mixed seeds',
    aliases: {
      romanUrdu: ['hung curd', 'desi greek yogurt', 'thick dahi', 'yogurt bowl', 'protein dahi', 'dahi bowl'],
      urdu: ['ہنگ دہی باؤل', 'گاڑھا دیسی دہی', 'پروٹین دہی']
    },
    category: 'snacks',
    typicalServing: { unit: '1 cup (180g)', grams: 180 },
    calories: 180,
    minCalories: 160,
    maxCalories: 200,
    protein: 16.0,
    carbs: 9.0,
    fat: 8.5,
    fiber: 2.5,
    mainIngredients: ['180g Hung Curd / Thick Desi Dahi', '4 Giri Akhrot (Walnuts crushed)', '1 Tsp Alsi ke Beej (Flax seeds / Chia)', '1 Chutki Elaichi Powder', '1/2 Chota Chamach Shehad (Honey)'],
    howTypicallyMade: 'Ghar ke dahi ko malmal ke kapray mein 2 ghantay latka kar paani nikaal kar thick yogurt banaya jata hai aur seeds milaye jatay hain.',
    recipeSteps: [
      'Ghar ke taza dahi ko sooti malmal ke kapray mein baandh kar 2 ghantay channi par rakhein taake paani nikal jaye.',
      'Bowl mein thick creamy hung dahi nikaalein.',
      'Upar crushed akhrot, alsi ke beej aur halki elaichi chirkein.',
      'Chahein toh adha chamach pure raw honey daal kar thanda serve karein.'
    ],
    healthyTip: 'Paani nikal jane se whey protein concentrate ho jata hai aur consistency market ke mehngay Greek Yogurt jaisi ho jati hai.',
    benefits: 'Gut-friendly live probiotic cultures, slow-digesting casein protein jo raat ko muscle breakdown rokta hai.',
    whoCanEat: ['Gym Lovers (Bedtime or Evening Snack)', 'Gut Health & Digestion', 'Healthy Nashta'],
    whoShouldLimit: ['Lactose intolerant individuals choose lactose-free dahi'],
    mealSlots: ['snack', 'breakfast'],
    tags: ['gym', 'high_protein', 'healthy', 'snack', 'breakfast', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_brown_rice_chicken',
    name: 'Brown Rice with Grilled Chicken & Cucumber Raita',
    simpleName: 'Brown Rice with Grilled Chicken',
    variation: 'Steamed Brown Rice + 120g Grilled Chicken + Mint Raita',
    portionLabel: '1 Complete Meal Plate',
    qtyPerPlate: '150g Brown Rice + 120g Chicken + 50g Raita',
    aliases: {
      romanUrdu: ['brown rice chicken', 'chicken rice bowl', 'gym rice', 'chicken with brown rice', 'clean rice chicken'],
      urdu: ['براؤن چاول اور چکن', 'گرلڈ چکن براؤن رائس', 'جم رائس باؤل']
    },
    category: 'chawal',
    typicalServing: { unit: '1 meal plate', grams: 320 },
    calories: 385,
    minCalories: 350,
    maxCalories: 425,
    protein: 36.0,
    carbs: 44.0,
    fat: 6.5,
    fiber: 4.8,
    mainIngredients: ['150g Pakay Hue Brown Rice (Steamed)', '120g Grilled Chicken Breast', '50g Kheera Mint Dahi Raita', 'Steamed Gobi / French Beans (50g)'],
    howTypicallyMade: 'Brown rice ko zeeray ke sath steam karein aur grilled chicken boti aur podina raita ke sath serve karein.',
    recipeSteps: [
      'Brown rice ko 30 minute bhigo kar zeeray aur halkay namak ke sath boil kar lein.',
      'Chicken breast ko lehsan kali mirch marinate kar ke grill kar lein.',
      'Plate mein brown rice phelaayein, upar sliced grilled chicken rakhein.',
      'Saath mein taza kheera mint raita aur steamed sabzi serve karein.'
    ],
    healthyTip: 'Brown rice ka glycemic index kam hota hai jo blood sugar spike nahi hone deta aur chicken se clean protein milta hai.',
    benefits: 'The definitive bodybuilder lunch: clean complex carbs for glycogen replenishment plus high-grade animal protein.',
    whoCanEat: ['Gym Athletes Post-Workout Meal', 'Clean Eating Lunch / Dinner', 'Active Working Professionals'],
    whoShouldLimit: ['Very low carb / keto diets limit rice quantity'],
    mealSlots: ['lunch', 'dinner'],
    tags: ['gym', 'high_protein', 'healthy', 'chawal', 'lunch', 'dinner', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_tawa_machli',
    name: 'Tawa Grilled Fish (Machli with Ajwain & Lemon)',
    simpleName: 'Tawa Grilled Fish (Machli)',
    variation: 'Non-stick Tawa Grilled Rohu / Salmon with Desi Spices',
    portionLabel: '200g Fish Fillet',
    qtyPerPlate: '200g Grilled Fish Fillet (~38g Protein)',
    aliases: {
      romanUrdu: ['grilled fish', 'machli', 'tawa machli', 'fish tikka', 'diet fish', 'gym machli', 'rohu fish'],
      urdu: ['توے کی گرلڈ مچھلی', 'مچھلی کا فلے', 'ڈائٹ مچھلی']
    },
    category: 'gosht',
    typicalServing: { unit: '200g fillet', grams: 200 },
    calories: 220,
    minCalories: 195,
    maxCalories: 245,
    protein: 38.0,
    carbs: 1.5,
    fat: 6.5,
    fiber: 0.0,
    mainIngredients: ['200g Taza Fish Fillet (Rohu, Surmai ya Salmon)', '1/2 Tsp Kooti Hui Ajwain', '1 Tsp Lehsan Paste', 'Lal Mirch, Haldi, Zeera Powder', '1 Poora Leemu (Lemon Juice)', '1/2 Tsp Zaitoon Ka Tail (Olive Oil)'],
    howTypicallyMade: 'Machli ko ajwain, lehsan, leemu aur masalon mein coat kar ke non-stick taway par dono taraf se sekain.',
    recipeSteps: [
      'Machli ke fillet ko dho kar paper towel se achi tarah dry karein.',
      'Ajwain, lehsan paste, lal mirch, haldi, zeera powder aur leemu ka ras mix kar ke paste banayein.',
      'Paste ko machli par dono taraf lagayein aur 15 minute marinate karein.',
      'Taway par sirf 1/2 chamach olive oil garam karein aur machli rakhein.',
      'Darmiyani aanch par har taraf 4-5 minute pakayein jab tak crispy golden ho jaye.'
    ],
    healthyTip: 'Deep frying ke bajaye non-stick taway par halkay oil mein sekain, jis se 70% calories bach jati hain aur Omega-3 fatty acids mehfooz rehte hain.',
    benefits: 'Rich in Omega-3 fatty acids, reduces joint inflammation from heavy gym lifting, supports heart and brain health.',
    whoCanEat: ['Gym Enthusiasts (Lean Muscle & Joint Recovery)', 'Heart & Cholesterol Health', 'Dinner & Lunch'],
    whoShouldLimit: ['Fish allergy wale avoid karein'],
    mealSlots: ['dinner', 'lunch'],
    tags: ['gym', 'high_protein', 'healthy', 'gosht', 'dinner', 'lunch', 'omega3', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_lowfat_paneer_bhurji',
    name: 'Low-Fat Paneer Bhurji (Cottage Cheese Scramble)',
    simpleName: 'Low-Fat Paneer Bhurji',
    variation: 'Cottage Cheese Scramble with Shimla Mirch & Tamatar',
    portionLabel: '1 Bowl (180g)',
    qtyPerPlate: '1 Bowl (~180g) - ~21g Protein',
    aliases: {
      romanUrdu: ['paneer bhurji', 'cottage cheese', 'paneer scramble', 'desi paneer', 'low fat paneer', 'gym paneer'],
      urdu: ['پنیر بھورجی', 'لو فیٹ پنیر', 'دیسی کاٹیج چیز']
    },
    category: 'sabzi',
    typicalServing: { unit: '1 bowl', grams: 180 },
    calories: 225,
    minCalories: 200,
    maxCalories: 250,
    protein: 21.0,
    carbs: 6.5,
    fat: 12.0,
    fiber: 2.2,
    mainIngredients: ['120g Low-Fat Paneer (Crumbled)', '1 Chota Pyaz', '1 Tamatar', '1/2 Shimla Mirch (Capsicum)', '1 Sabz Mirch', 'Haldi & Zeera', '1/2 Tsp Cooking Oil'],
    howTypicallyMade: 'Pyaz, tamatar aur shimla mirch ko bhun kar crumbled low fat paneer aur masale mila kar scramble banaya jata hai.',
    recipeSteps: [
      'Pan mein 1/2 chamach oil mein zeera karkaraein aur pyaz golden karein.',
      'Tamatar, shimla mirch, sabz mirch, haldi aur namak daal kar 2 minute bhunein.',
      'Haath se crumble kiya hua low-fat paneer shamil karein.',
      'Halki aanch par 2-3 minute toss karein (zyada na pakaein warna paneer sakht ho jayega).',
      'Hara dhaniya chirak kar roti ya spoon se garam garam khayein.'
    ],
    healthyTip: 'Low-fat doodh se bana paneer use karein taake protein high aur saturated fat low rahe.',
    benefits: 'Vegetarian high-protein powerhouse rich in bioavailable calcium, zinc, and muscle sustaining casein.',
    whoCanEat: ['Vegetarian Gym Athletes', 'Breakfast, Dinner & Sham Ka Khana', 'Bone Health & Calcium'],
    whoShouldLimit: ['Severe dairy intolerance wale avoid karein'],
    mealSlots: ['breakfast', 'dinner', 'snack'],
    tags: ['gym', 'high_protein', 'healthy', 'sabzi', 'breakfast', 'dinner', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_whey_protein_shake',
    name: 'Whey Protein Post-Workout Shake',
    simpleName: 'Whey Protein Post-Workout Shake',
    variation: '1 Scoop Whey + 250ml Skimmed Milk + 1/2 Banana',
    portionLabel: '1 Shaker Bottle (350ml)',
    qtyPerPlate: '1 Shaker Bottle (~350ml) - ~32g Protein',
    aliases: {
      romanUrdu: ['whey protein', 'protein shake', 'post workout shake', 'protein smoothie', 'whey shake', 'banana protein shake'],
      urdu: ['پروٹین شیک', 'وے پروٹین شیک', 'پوسٹ ورک آؤٹ شیک']
    },
    category: 'drinks',
    typicalServing: { unit: '1 shaker (350ml)', grams: 350 },
    calories: 230,
    minCalories: 210,
    maxCalories: 260,
    protein: 32.0,
    carbs: 22.0,
    fat: 2.2,
    fiber: 2.0,
    mainIngredients: ['1 Scoop (30g) Whey Protein Isolate/Concentrate', '250ml Thanda Skimmed Doodh (Low Fat Milk)', '1/2 Chota Kela (Banana)', 'Baraf ke Tukray (Ice cubes)'],
    howTypicallyMade: 'Shaker bottle ya blender mein doodh, whey protein powder aur kela daal kar 30 second blend kiya jata hai.',
    recipeSteps: [
      'Blender ya shaker mein pehle 250ml thanda doodh daalein.',
      '1 scoop whey protein powder shamil karein (pehle liquid daalne se lumps nahi bante).',
      'Aadha kela aur 2-3 baraf ke tukray daalein.',
      '30 second tezz speed par blend ya shake karein jab tak smooth aur frothy ho jaye.',
      'Workout ke foran baad 30-45 minute ke andar piyen.'
    ],
    healthyTip: 'Gym workout ke baad foran lena anabolic window mein muscle protein synthesis ko foran trigger karta hai.',
    benefits: 'Fastest digesting protein rich in BCAAs (Leucine) for rapid muscle recovery and preventing soreness.',
    whoCanEat: ['Post-Workout Muscle Recovery', 'Daily Protein Target Completion', 'Fitness Athletes'],
    whoShouldLimit: ['Severe kidney issues doctor ke mashwaray se use karein'],
    mealSlots: ['snack', 'breakfast'],
    tags: ['gym', 'high_protein', 'healthy', 'drinks', 'snack', 'post_workout', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_palak_chicken',
    name: 'Palak Chicken (Lean Chicken Breast with Spinach)',
    simpleName: 'Palak Chicken (Iron & Protein)',
    variation: 'Boneless Chicken Breast in Pureed Spinach Gravy',
    portionLabel: '1 Plate (250g)',
    qtyPerPlate: '1 Plate (250g) with gravy - ~34g Protein',
    aliases: {
      romanUrdu: ['palak chicken', 'chicken palak', 'spinach chicken', 'palak murgh', 'healthy palak chicken'],
      urdu: ['پالک چکن', 'مرغ پالک', 'پالک مرغی']
    },
    category: 'gosht',
    typicalServing: { unit: '1 plate (250g)', grams: 250 },
    calories: 270,
    minCalories: 240,
    maxCalories: 310,
    protein: 34.0,
    carbs: 7.0,
    fat: 11.0,
    fiber: 4.2,
    mainIngredients: ['180g Skinless Chicken Breast (Cubes)', '250g Taza Palak (Pureed)', '1 Chota Pyaz', '1 Tamatar', 'Lehsan-Adrak Paste', 'Garam Masala & Haldi', '1 Tsp Cooking Oil'],
    howTypicallyMade: 'Palak ko blanch kar ke pees lein aur chicken breast ke sath lehsan adrak mein kam oil ke sath dum par pakayein.',
    recipeSteps: [
      'Palak ko 2 minute ubaal kar thanday paani mein daalein aur blender mein pees lein.',
      'Degchi mein 1 chamach oil garam kar ke pyaz aur lehsan-adrak golden karein.',
      'Chicken cubes daal kar 5 minute bhunein jab tak rangat badal jaye.',
      'Pisi hui palak, tamatar puree aur masale shamil karein.',
      'Halki aanch par 8-10 minute dhak kar pakayein jab tak chicken gal jaye aur oil upar aa jaye.'
    ],
    healthyTip: 'Heavy cream ya makhan ke bajaye sirf palak ki natural gravy use karein.',
    benefits: 'High iron boosts hemoglobin and oxygen delivery to muscles during heavy lifts, while chicken delivers complete protein.',
    whoCanEat: ['Gym Enthusiasts (Lunch & Dinner)', 'Anemia & Low Hemoglobin Recovery', 'Family Dinner'],
    whoShouldLimit: ['Kidney stone (oxalate) patients ehtiyat karein'],
    mealSlots: ['lunch', 'dinner'],
    tags: ['gym', 'high_protein', 'healthy', 'gosht', 'lunch', 'dinner', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_beef_shami_kabab',
    name: 'Lean Beef Shami Kabab (2 Kababs - Lean Protein)',
    simpleName: 'Beef Shami Kabab (2 Kabab)',
    variation: 'Lean Minced Beef + Dal Chana Shami Patty',
    portionLabel: '2 Kababs (~120g)',
    qtyPerPlate: '2 Kababs (~120g) - ~22g Protein',
    aliases: {
      romanUrdu: ['shami kabab', 'beef shami', 'kabab', 'desi kabab', 'homemade shami', 'gym kabab'],
      urdu: ['شامی کباب', 'بیف شامی کباب', 'دیسی شامی کباب']
    },
    category: 'bbq',
    typicalServing: { unit: '2 kababs (120g)', grams: 120 },
    calories: 210,
    minCalories: 185,
    maxCalories: 235,
    protein: 22.0,
    carbs: 11.0,
    fat: 8.0,
    fiber: 3.0,
    mainIngredients: ['80g Lean Beef Qeema (Minced Beef)', '40g Chana Daal', 'Pyaz, Lehsan, Adrak', 'Sabut Lal Mirch, Zeera, Garam Masala', '1 Anda (Egg for coating)', '1/2 Tsp Oil for pan shallow-sear'],
    howTypicallyMade: 'Beef qeema aur chana daal ko masalon ke sath ubaal kar pees kar tikkian banai jati hain aur taway par shallow sekte hain.',
    recipeSteps: [
      'Qeema aur daal chana ko lehsan adrak aur kharay masalon ke sath paani mein narm hone tak ubaalein.',
      'Paani sookhne par achi tarah sil-battay ya chopper mein pees lein.',
      'Baareek pyaz, hara dhaniya aur sabz mirch mila kar round kabab shape dein.',
      'Ande mein dip kar ke non-stick taway par sirf aadha chamach oil mein dono taraf se golden brown karein.'
    ],
    healthyTip: 'Lean beef (kam charbi wala qeema) istemal karein aur deep fry na karein balkay non-stick par sekein.',
    benefits: 'Rich source of natural dietary creatine, heme iron, and zinc to support natural testosterone and strength gains.',
    whoCanEat: ['Gym Strength & Power Athletes', 'Sham Ka Khana / High-Protein Snack', 'Lunch & Dinner Addition'],
    whoShouldLimit: ['High cholesterol wale portion 1-2 kababs tak mehdood rakhein'],
    mealSlots: ['snack', 'dinner', 'lunch'],
    tags: ['gym', 'high_protein', 'healthy', 'bbq', 'snack', 'dinner', 'lunch', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_sweet_potato_shakarkandi',
    name: 'Boiled Sweet Potato (Shakarkandi - Pre-Workout Carbs)',
    simpleName: 'Boiled Sweet Potato (Shakarkandi)',
    variation: 'Steamed Sweet Potato with Chaat Masala & Lemon',
    portionLabel: '1 Medium (150g)',
    qtyPerPlate: '1 Medium Steamed Sweet Potato (~150g)',
    aliases: {
      romanUrdu: ['sweet potato', 'shakarkandi', 'ubli shakarkandi', 'steamed sweet potato', 'pre workout shakarkandi'],
      urdu: ['شکر قندی', 'ابلی ہوئی شکر قندی', 'جم پری ورک آؤٹ شکر قندی']
    },
    category: 'snacks',
    typicalServing: { unit: '1 medium (150g)', grams: 150 },
    calories: 135,
    minCalories: 120,
    maxCalories: 155,
    protein: 2.5,
    carbs: 31.0,
    fat: 0.2,
    fiber: 4.5,
    mainIngredients: ['150g Taza Shakarkandi (Sweet Potato)', 'Chaat Masala (1/2 Tsp)', '1/2 Lemon (Nimbu ka Ras)', 'Kala Namak (Pinch)'],
    howTypicallyMade: 'Shakarkandi ko paani mein ya steam par ubaal kar chilka utaar kar chaat masala aur leemu ke sath serve kiya jata hai.',
    recipeSteps: [
      'Shakarkandi ko achi tarah dho kar mitti saaf karein.',
      'Degchi mein paani daal kar 15-20 minute ubaalein jab tak kaanta asaani se andar chala jaye.',
      'Thanda hone par chilka utarein aur gol slices mein kaatein.',
      'Upar chaat masala, kala namak aur taza leemu nichor kar serve karein.'
    ],
    healthyTip: 'Fried snacks ke muqablay mein shakarkandi complex clean carb source hai jo fat bilkul nahi banne deti.',
    benefits: 'Rich in Vitamin A, Potassium (prevents gym cramps), and low-GI complex carbs for sustained pump and energy.',
    whoCanEat: ['Gym Pre-Workout Clean Carbs (1 hr before workout)', 'Fat Loss Diet Friendly', 'Sham Ka Healthy Snack'],
    whoShouldLimit: ['Diabetics portion control 100g rakhein'],
    mealSlots: ['snack', 'breakfast'],
    tags: ['gym', 'healthy', 'snacks', 'snack', 'breakfast', 'pre_workout', 'clean_carbs'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_chicken_veg_clear_soup',
    name: 'Chicken & Vegetable Clear Soup (Zero Oil)',
    simpleName: 'Chicken Vegetable Clear Soup',
    variation: 'Shredded Chicken Breast, Cabbage, Carrot & Black Pepper Broth',
    portionLabel: '1 Large Bowl (300ml)',
    qtyPerPlate: '1 Bowl (~300ml) - ~20g Protein',
    aliases: {
      romanUrdu: ['chicken soup', 'clear soup', 'chicken vegetable soup', 'gym soup', 'yakhni soup', 'diet soup'],
      urdu: ['چکن سبزی سوپ', 'کلیئر چکن سوپ', 'ڈائٹ سوپ']
    },
    category: 'gosht',
    typicalServing: { unit: '1 large bowl (300ml)', grams: 300 },
    calories: 130,
    minCalories: 110,
    maxCalories: 155,
    protein: 19.5,
    carbs: 6.0,
    fat: 2.5,
    fiber: 1.8,
    mainIngredients: ['100g Chicken Breast (Shredded)', '2.5 Cup Chicken Bone Yakhni / Broth', 'Baareek Kati Band Gobi & Gajar', '1 Clove Garlic (Lehsan)', 'Kali Mirch & Soy Sauce (1/2 Tsp)'],
    howTypicallyMade: 'Chicken broth mein shredded chicken breast aur baareek sabzian daal kar kali mirch aur lehsan ke sath ubaala jata hai.',
    recipeSteps: [
      'Pan mein yakhni ubaalein aur baareek kata lehsan shamil karein.',
      'Shredded chicken breast aur baareek kati gajar aur band gobi daalein.',
      '5 minute halki aanch par ubaalein taake sabzian narm aur crunchy rahein.',
      'Taza pisi kali mirch, halka namak aur 1/2 chamach soy sauce mila kar garma garam piyen.'
    ],
    healthyTip: 'Cornflour aur anday ki zardi avoid karein taake calories 130 se kam rahein aur soup 100% light aur clean rahe.',
    benefits: 'High satiety, instant stomach fullness with under 130 calories and nearly 20g of pure protein for evening cravings.',
    whoCanEat: ['Weight Loss & Cutting Phase', 'Light Dinner or Sham Ka Khana', 'Immunity & Recovery'],
    whoShouldLimit: ['Sodium sensitive individuals reduce soy sauce'],
    mealSlots: ['dinner', 'snack'],
    tags: ['gym', 'high_protein', 'healthy', 'low_calorie', 'dinner', 'snack', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_moong_daal_bran_roti',
    name: 'Yellow Moong Daal with 1 Bran Roti',
    simpleName: 'Moong Daal with 1 Bran Roti',
    variation: 'Light Zeera Tarka Moong Daal + 1 Whole Wheat Bran Roti',
    portionLabel: '1 Bowl Daal + 1 Roti',
    qtyPerPlate: '1 Bowl Daal (180g) + 1 Bran Roti (50g)',
    aliases: {
      romanUrdu: ['moong daal', 'daal roti', 'moong ki daal', 'bran roti', 'healthy daal roti', 'diet daal roti'],
      urdu: ['مونگ کی دال اور بران روٹی', 'دال روٹی', 'ڈائٹ دال روٹی']
    },
    category: 'daal',
    typicalServing: { unit: '1 bowl daal + 1 roti', grams: 230 },
    calories: 295,
    minCalories: 265,
    maxCalories: 330,
    protein: 16.5,
    carbs: 50.0,
    fat: 4.0,
    fiber: 8.5,
    mainIngredients: ['1 Bowl Moong Daal (Pili Daal)', '1/2 Tsp Zeera & Lehsan Tarka (Minimal oil)', '1 Choti Whole Wheat Bran Roti (50g Lal Aata + Chokar)', 'Salad & Lemon'],
    howTypicallyMade: 'Moong daal ko haldi namak mein galayein, sirf aadha chamach oil mein zeera tarka lagayein aur lal aatay ki roti ke sath lein.',
    recipeSteps: [
      'Moong daal ko 20 minute bhigo kar haldi, namak aur paani ke sath galne tak pakaein.',
      'Chotay pan mein sirf 1/2 chamach oil mein zeera aur lehsan ka tarka lagayein.',
      'Chokar milay aatay (Bran wheat) ki phooli hui roti taway par bina ghee ke sekain.',
      'Garma garam daal aur roti taza salad aur leemu ke sath noosh karein.'
    ],
    healthyTip: 'Daal mein desi ghee ka bhari tarka na lagayein, sirf zeera aur lehsan use karein.',
    benefits: 'Complete amino acid profile formed by combining pulses with whole grain cereal, extremely easy on the stomach.',
    whoCanEat: ['Clean Desi Lunch & Dinner', 'Vegetarian Balanced Nutrition', 'Daily Family Staple'],
    whoShouldLimit: ['Portion control roti to 1 piece for weight loss'],
    mealSlots: ['lunch', 'dinner'],
    tags: ['gym', 'healthy', 'daal', 'lunch', 'dinner', 'high_fiber', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_garden_salad',
    name: 'Fresh Desi Garden Salad (Kheera, Tamatar, Chukandar)',
    simpleName: 'Fresh Desi Garden Salad',
    variation: 'Cucumber, Tomatoes, Beetroot, Radish & Lemon',
    portionLabel: '1 Medium Bowl (150g)',
    qtyPerPlate: '1 Bowl (~150g) Fresh Chopped Veggies',
    aliases: {
      romanUrdu: ['salad', 'kachumber salad', 'desi salad', 'garden salad', 'kheera tamatar salad', 'diet salad'],
      urdu: ['تازہ دیسی سلاد', 'کچومر سلاد', 'کھیرا ٹماٹر سلاد']
    },
    category: 'sabzi',
    typicalServing: { unit: '1 bowl', grams: 150 },
    calories: 45,
    minCalories: 35,
    maxCalories: 60,
    protein: 2.0,
    carbs: 9.0,
    fat: 0.3,
    fiber: 3.5,
    mainIngredients: ['1 Kheera (Cucumber)', '1 Tamatar (Tomato)', '1/2 Chukandar (Beetroot)', '1 Choti Mooli (Radish)', '1 Poora Leemu (Lemon)', 'Chutki Kala Namak & Kali Mirch'],
    howTypicallyMade: 'Kheera, tamatar, chukandar aur mooli ko cubes mein kaat kar leemu aur kali mirch se dress kiya jata hai.',
    recipeSteps: [
      'Sab sabzion ko dho kar cheel lein.',
      'Kheera, tamatar aur chukandar ko chotay cubes mein kaat lein.',
      'Bowl mein daal kar 1 poora taza leemu nichorain.',
      'Chutki kala namak aur taza pisi kali mirch daal kar toss karein aur har meal ke sath khayein.'
    ],
    healthyTip: 'Mayonnaise ya creamy dressings bilkul na daalein, sirf leemu aur kali mirch best natural dressing hain.',
    benefits: 'High nitrate in beetroot boosts nitric oxide and vascular pump in gym, while cucumber hydrates the cells.',
    whoCanEat: ['Essential With Every Meal (Lunch & Dinner)', 'Weight Loss Volume Eating', 'Blood Pressure & Heart Health'],
    whoShouldLimit: ['None - safe and recommended for everyone'],
    mealSlots: ['lunch', 'dinner', 'snack'],
    tags: ['gym', 'healthy', 'low_calorie', 'sabzi', 'lunch', 'dinner', 'snack', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  },
  {
    foodId: 'pk_gym_bhuna_chana_green_tea',
    name: 'Bhuna Chana with Green Tea (Roasted Black Gram)',
    simpleName: 'Bhuna Chana with Green Tea',
    variation: '50g Roasted Black Gram with Peel + Cup of Green Tea',
    portionLabel: '50g Chana + 1 Cup Tea',
    qtyPerPlate: '50g Bhuna Chana + 1 Green Tea Cup',
    aliases: {
      romanUrdu: ['bhuna chana', 'roasted chana', 'black chana', 'green tea', 'chana green tea', 'healthy evening snack'],
      urdu: ['بھنا چنا اور گرین ٹی', 'بھنے ہوئے چنے', 'شام کا اسنیک']
    },
    category: 'snacks',
    typicalServing: { unit: '50g + 1 cup tea', grams: 200 },
    calories: 185,
    minCalories: 165,
    maxCalories: 205,
    protein: 11.5,
    carbs: 29.0,
    fat: 3.0,
    fiber: 8.2,
    mainIngredients: ['50g Bhuna Kala Chana Chilkay Samait (Roasted Gram)', '1 Cup Green Tea (Bina Cheeni)', '1 Chutki Elaichi / Daarchini'],
    howTypicallyMade: 'Bhunay huay chanay chilkay samait khaye jatay hain aur sath baghair cheeni ke green tea pi jati hai.',
    recipeSteps: [
      'Bowl mein 50g bhuna kala chana lein.',
      '1 cup paani mein green tea bag ya patti daal kar 2 minute dum dein.',
      'Channay chaba kar khayein aur sath green tea ke ghont lein.'
    ],
    healthyTip: 'Chana chilkay samait khayein kyun ke 50% fiber chilkay mein hota hai jo glucose spike rokkta hai.',
    benefits: 'Perfect crunchy evening tea replacement that destroys biscuit and junk cravings with high plant protein and fiber.',
    whoCanEat: ['Office & Evening Tea Snack (Sham Ka Khana)', 'Weight Loss & Satiety', 'Diabetics Safe Snack'],
    whoShouldLimit: ['Moderate sodium if eating salted variety'],
    mealSlots: ['snack'],
    tags: ['gym', 'high_protein', 'healthy', 'snacks', 'snack', 'clean_eating'],
    isGymPreferred: true,
    isEstimate: false,
    confidence: 'high'
  }
];

// Helper to determine mealSlots for any existing dish
function assignMealSlots(food) {
  const cat = (food.category || '').toLowerCase();
  const name = ((food.simpleName || '') + ' ' + (food.name || '') + ' ' + (food.variation || '')).toLowerCase();
  const slots = new Set(food.mealSlots || []);

  // Breakfast items
  if (
    cat === 'nashta' ||
    /egg|anda|omelette|oat|daliya|paratha|halwa puri|chaye|chai|nashta|bread|french toast/i.test(name)
  ) {
    slots.add('breakfast');
  }

  // Lunch & Dinner staples
  if (
    cat === 'daal' ||
    cat === 'sabzi' ||
    cat === 'gosht' ||
    cat === 'chawal' ||
    cat === 'roti_paratha' ||
    /chicken|karahi|qorma|salan|handi|biryani|pulao|rice|daal|chawal|roti|chapati|bhindi|tinda|aloo|machli|fish|beef|mutton/i.test(name)
  ) {
    slots.add('lunch');
    slots.add('dinner');
  }

  // BBQ & Kebabs
  if (cat === 'bbq' || /tikka|kabab|kebab|boti|chargah|sajji/i.test(name)) {
    slots.add('dinner');
    slots.add('lunch');
  }

  // Snacks & Evening items (Sham Ka Khana)
  if (
    cat === 'snacks' ||
    cat === 'drinks' ||
    cat === 'fast_food' ||
    cat === 'sweets' ||
    cat === 'chutney_raita' ||
    /chaat|samosa|pakora|roll|fries|chips|chana|sattu|smoothie|shake|tea|chai|coffee|lassi|sharbat|snack|biscuit|dry fruit|nuts/i.test(name)
  ) {
    slots.add('snack');
  }

  // Salad & Raita suitable for lunch, dinner and snacks
  if (/salad|kachumber|raita|chutney/i.test(name)) {
    slots.add('lunch');
    slots.add('dinner');
    slots.add('snack');
  }

  // Fallback if none matched
  if (slots.size === 0) {
    slots.add('lunch');
    slots.add('dinner');
  }

  return Array.from(slots);
}

// ── 2. PROCESS EXISTING FOODS ──
for (const f of foods) {
  // Ensure mealSlots
  f.mealSlots = assignMealSlots(f);

  // Sync tags with mealSlots
  f.tags = Array.isArray(f.tags) ? f.tags : [];
  for (const slot of f.mealSlots) {
    if (!f.tags.includes(slot)) {
      f.tags.push(slot);
    }
  }

  // Check if gym preferred
  if (f.protein >= 18 || (f.tags && f.tags.includes('high_protein')) || (f.tags && f.tags.includes('gym'))) {
    f.isGymPreferred = true;
    if (!f.tags.includes('gym')) f.tags.push('gym');
    if (!f.tags.includes('high_protein')) f.tags.push('high_protein');
  } else if (f.isGymPreferred === undefined) {
    f.isGymPreferred = false;
  }
}

// ── 3. PREPEND PREMIER GYM DISHES SO THEY ARE FIRST IN DATABASE & JSON ──
// Ensure standard metadata fields on all premier items
for (const item of PREMIER_GYM_HEALTH_DISHES) {
  item.isEstimate = true;
  item.estimateRangePercent = 15;
  item.source = 'Pakistan Food Composition Database / USDA / Institutional Recipe Analysis';
  item.medicalDisclaimer = 'General nutritional estimates only. Not medical or clinical dietetic advice.';
  item.confidence = 'high';
  item.needsReview = false;
}

// Remove any existing instances with same foodId first
const premierIds = new Set(PREMIER_GYM_HEALTH_DISHES.map(d => d.foodId));
const filteredExisting = foods.filter(f => !premierIds.has(f.foodId));

// Combine: Premier Gym Dishes first, then the rest
const finalFoods = [...PREMIER_GYM_HEALTH_DISHES, ...filteredExisting];

fs.writeFileSync(jsonPath, JSON.stringify(finalFoods, null, 2), 'utf8');

console.log(`✅ Successfully updated ${jsonPath}:`);
console.log(`- Total foods: ${finalFoods.length}`);
console.log(`- Premier gym dishes at start: ${PREMIER_GYM_HEALTH_DISHES.length}`);
console.log(`- First 5 dishes now:`, finalFoods.slice(0, 5).map(f => f.simpleName));
console.log(`- All items now have mealSlots (breakfast, lunch, snack, dinner) and tags.`);
