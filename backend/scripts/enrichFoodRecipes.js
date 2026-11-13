import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, '../data/pkFoods.json');

const foods = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// 1. New essential Pakistani dishes specifically requested by user (Oats, Daliya, Aloo Gobi, Aloo Matar, Mix Sabzi, etc.)
const NEW_DISHTYPES = [
  {
    foodId: 'pk_healthy_001',
    name: 'Oats Porridge (Doodh Walay Oats - Classic Healthy Breakfast)',
    baseName: 'Oats Porridge',
    aliases: {
      romanUrdu: ['doodh walay oats', 'oatmeal', 'oats ka daliya', 'porridge', 'breakfast oats', 'healthy oats'],
      urdu: ['دودھ والے اوٹس', 'اوٹ میل']
    },
    category: 'nashta',
    tags: ['healthy', 'oats_daliya', 'high_fiber', 'diet_recommendation', 'nashta'],
    typicalServing: { unit: 'bowl (1.5 cups)', grams: 220 },
    calories: 210,
    protein: 8.5,
    carbs: 34.0,
    fat: 4.2,
    fiber: 5.8,
    mainIngredients: ['Rolled / Quick Oats', 'Low Fat Milk or Water', 'Cinnamon', 'Cardamom', 'Optional: 1 tsp Honey or Chia Seeds'],
    howTypicallyMade: 'Cooked by simmering rolled oats in warm low-fat milk with crushed cardamom until creamy and thick.',
    recipeSteps: [
      'Ek saaf pan mein 1 cup low-fat doodh (ya paani) garam karein.',
      '4-5 chamach rolled oats aur choti elaichi shamil karein.',
      'Halki aanch par 3-5 minute pakaein jab tak oats phool jayein aur creamy ban jayein.',
      'Choolha band karein. Hasb-e-zaroorat 1 chamach shehad ya thori darchini (cinnamon) chirak kar serve karein.'
    ],
    healthyTip: 'Use skimmed or low-fat milk. Avoid white refined sugar; use cinnamon, berries or 1 tsp honey for natural sweetness and sustained satiety.',
    benefits: 'Rich in beta-glucan soluble fiber; lowers LDL cholesterol, keeps stomach full for hours, regulates blood sugar spikes.',
    whoShouldLimit: ['Individuals with severe celiac disease unless certified gluten-free'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA / Dietetic Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_002',
    name: 'Masala Vegetable Oats (Pakistani Namkeen Oats)',
    baseName: 'Masala Oats',
    aliases: {
      romanUrdu: ['namkeen oats', 'masala oats', 'sabzi walay oats', 'diet oats', 'savory oats'],
      urdu: ['مصالحہ نمکین اوٹس']
    },
    category: 'nashta',
    tags: ['healthy', 'oats_daliya', 'high_fiber', 'low_calorie', 'diet_recommendation', 'nashta'],
    typicalServing: { unit: 'bowl (1.5 cups)', grams: 230 },
    calories: 185,
    protein: 7.2,
    carbs: 31.0,
    fat: 3.5,
    fiber: 6.2,
    mainIngredients: ['Rolled Oats', 'Green Peas (Matar)', 'Carrots', 'Tomato', 'Onion', 'Green Chili', 'Cumin', 'Turmeric'],
    howTypicallyMade: 'Sautéed onions and diced vegetables with light spices, then simmered with oats and water like a savory khichdi.',
    recipeSteps: [
      'Pan mein 1 chota chamach oil garam karein, zeera aur thora pyaz daal kar translucent karein.',
      'Bareek katay tamatar, matar, gajar, hari mirch, haldi aur namak shamil karke 2 minute bhunay.',
      '1.5 cup paani daal kar ubaal lein, phir 1/2 cup rolled oats daal kar ache se mix karein.',
      'Halki aanch par 4-5 minute dum dein jab tak khichdi jaisa texture tayyar ho jaye. Hara dhaniya daal kar garma garam serve karein.'
    ],
    healthyTip: 'Maximum vegetables, minimum oil. Excellent low-calorie, high-satiety lunch or breakfast for fat loss.',
    benefits: 'High volume meal with low caloric density; packed with vitamins A, C and dietary fiber.',
    whoShouldLimit: ['People on strict renal potassium restriction'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Culinary Dietetic Database / USDA',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_003',
    name: 'Namkeen Wheat Daliya (Broken Wheat Khichdi with Moong Daal)',
    baseName: 'Namkeen Daliya',
    aliases: {
      romanUrdu: ['namkeen daliya', 'gandum ka daliya', 'dalia khichdi', 'vegetable daliya', 'daliya'],
      urdu: ['نمکین گندم کا دلیہ']
    },
    category: 'nashta',
    tags: ['healthy', 'oats_daliya', 'high_fiber', 'diet_recommendation', 'daal', 'nashta'],
    typicalServing: { unit: 'bowl (1.5 cups)', grams: 240 },
    calories: 195,
    protein: 8.8,
    carbs: 33.5,
    fat: 2.8,
    fiber: 7.0,
    mainIngredients: ['Broken Whole Wheat (Daliya)', 'Yellow Moong Daal', 'Carrots', 'Matar', 'Ginger', 'Cumin', 'Black Pepper'],
    howTypicallyMade: 'Roasted cracked wheat simmered with yellow split moong lentils, mild ginger, cumin, and vegetables.',
    recipeSteps: [
      'Daliya ko dry pan mein 2-3 minute khushbu aane tak dry roast karein.',
      'Pressure cooker ya pot mein 1 tsp oil mein zeera aur adrak paste bhoon lein.',
      'Dhuli hui moong daal, roasted daliya, tamatar aur gajar shamil karein.',
      '3 guna paani daal kar 3 seeti (whistles) ya 15-20 minute halki aanch par galne dein. Kali mirch aur leemo ka ras nichor kar serve karein.'
    ],
    healthyTip: 'Traditional Pakistani healing and fat loss staple. Very gentle on the stomach and extremely high in complex carbs and gut-friendly fiber.',
    benefits: 'Aids digestion, prevents constipation, stabilizes blood sugar, keeps hunger away for 4+ hours.',
    whoShouldLimit: ['People with gluten intolerance / celiac'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_004',
    name: 'Meetha Daliya (Sweet Whole Wheat Porridge with Milk)',
    baseName: 'Meetha Daliya',
    aliases: {
      romanUrdu: ['meetha daliya', 'doodh daliya', 'sweet dalia', 'gandum daliya doodh', 'sweet wheat porridge'],
      urdu: ['میٹھا گندم کا دلیہ']
    },
    category: 'nashta',
    tags: ['healthy', 'oats_daliya', 'nashta', 'diet_recommendation'],
    typicalServing: { unit: 'bowl (1.5 cups)', grams: 220 },
    calories: 225,
    protein: 7.8,
    carbs: 38.0,
    fat: 4.5,
    fiber: 5.5,
    mainIngredients: ['Cracked Whole Wheat (Daliya)', 'Low Fat Milk', 'Cardamom', 'Almonds', '1 tsp Jaggery / Shakkar'],
    howTypicallyMade: 'Cracked wheat boiled in water until tender, then slow-simmered with cardamom-infused milk and natural sweetener.',
    recipeSteps: [
      'Daliya ko 1 cup paani mein pehle ubaal lein taake narm ho jaye (10 min).',
      'Is mein 1 cup low-fat doodh aur 2 choti elaichi daal kar halki aanch par pakaein.',
      'Jab garha ho jaye toh choolha band karein aur 1 chamach shakkar ya gurr mix karein.',
      'Upar 2-3 bareek katay badaam daal kar garma garam ya thanda nosh farmaein.'
    ],
    healthyTip: 'Use desi shakkar or dates puree instead of white refined sugar. Great clean carb pre/post workout energy breakfast.',
    benefits: 'Sustained slow-release energy, high magnesium and B-vitamins.',
    whoShouldLimit: ['Diabetics should limit portion and skip added sweeteners'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / Culinary Analysis',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_005',
    name: 'Aloo Gobi Salan (Ghar Ka Bhuna Salan / Tarkari)',
    baseName: 'Aloo Gobi',
    aliases: {
      romanUrdu: ['aloo gobi ka salan', 'gobi aloo', 'gobi tarkari', 'cauliflower potato curry', 'gobi ka salan'],
      urdu: ['آلو گوبھی کا سالن']
    },
    category: 'sabzi',
    tags: ['sabzi', 'salan', 'healthy', 'low_calorie', 'diet_recommendation'],
    typicalServing: { unit: 'plate (1.5 cups)', grams: 200 },
    calories: 175,
    protein: 4.5,
    carbs: 24.0,
    fat: 6.8,
    fiber: 5.2,
    mainIngredients: ['Cauliflower (Phool Gobi)', 'Potatoes (Aloo)', 'Onion', 'Tomatoes', 'Ginger (Adrak)', 'Garlic', 'Cumin', 'Turmeric', 'Coriander Powder', 'Cooking Oil'],
    howTypicallyMade: 'Sautéed onion, ginger and tomatoes with traditional Pakistani spices, combined with cauliflower florets and potatoes, slow-simmered on "dum".',
    recipeSteps: [
      'Pyaz ko 1-2 tbsp oil mein halka golden karein. Adrak lehsan paste (1 tbsp) daal kar 1 minute bhunay.',
      'Katay tamatar, haldi, lal mirch, zeera aur dhaniya powder shamil karke tamatar galne tak masala bhunay.',
      'Aloo ke chotay tukray aur gobi ke phool daal kar masalay mein achi tarah coat karein.',
      '2-3 tbsp paani ka cheenta dein aur dhakan dhaanp kar bilkul halki aanch par 12-15 minute "dum" par pakaein jab tak aloo aur gobi gal jayein.',
      'Garma garam hara dhaniya, bareek lambi kati adrak aur pisa garam masala chirak kar serve karein.'
    ],
    healthyTip: 'Ghar mein 1 tbsp oil per 4 servings use karein bajaye ghee ke. Gobi fiber se bharpoor hai aur calories bohat kam hain.',
    benefits: 'Rich in sulforaphane antioxidants, vitamin C, dietary fiber. Low caloric density allows satisfying volume.',
    whoShouldLimit: ['People with severe IBS/bloating may need to cook with extra ginger and ajwain'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / Culinary Recipe Analysis',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_006',
    name: 'Aloo Matar Salan (Pakistani Green Peas & Potato Gravy)',
    baseName: 'Aloo Matar',
    aliases: {
      romanUrdu: ['aloo matar ka salan', 'matar aloo shorba', 'matar tarkari', 'peas potato curry', 'matar ka salan'],
      urdu: ['آلو مٹر کا سالن']
    },
    category: 'sabzi',
    tags: ['sabzi', 'salan', 'healthy', 'diet_recommendation'],
    typicalServing: { unit: 'plate (1.5 cups)', grams: 210 },
    calories: 185,
    protein: 5.8,
    carbs: 27.0,
    fat: 5.5,
    fiber: 5.6,
    mainIngredients: ['Fresh / Frozen Green Peas (Matar)', 'Potatoes', 'Onion', 'Tomatoes', 'Ginger Garlic Paste', 'Garam Masala', 'Coriander', 'Cumin', 'Light Cooking Oil'],
    howTypicallyMade: 'Fragrant onion-tomato masala bhunai with cumin and coriander, then simmered with green peas and potatoes into a comforting gravy.',
    recipeSteps: [
      'Degchi mein oil garam karke bareek pyaz brown karein, phir lehsan adrak paste shamil karein.',
      'Tamatar paste aur bunyadi masalay (haldi, pisi lal mirch, namak, zeera) daal kar tail alag honay tak bhunai karein.',
      'Katay aloo aur matar shamil karke 2 minute masalay ke sath bhunay.',
      '1 cup paani daal kar dhakan band karein aur halki aanch par 15 minute pakaein jab tak aloo narm ho jayein.',
      'Shorba/gravy apni pasand ke mutabiq garha karein aur hara dhaniya chirak dein.'
    ],
    healthyTip: 'Green peas provide natural plant protein and dietary fiber. Pair with 1 whole wheat roti or boiled rice for a balanced vegetarian meal.',
    benefits: 'Supports digestion, heart health, and provides natural phytonutrients and B-complex vitamins.',
    whoShouldLimit: ['Diabetics should account for carbs from peas and potatoes combined'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / Culinary Recipe Analysis',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_007',
    name: 'Mix Sabzi (Pakistani Ghar Ki Aloo Matar Gajar Shimla Mirch)',
    baseName: 'Mix Sabzi',
    aliases: {
      romanUrdu: ['mix sabzi', 'mixed vegetable curry', 'aloo matar gajar', 'subzi bhuni', 'mixed sabzi'],
      urdu: ['مکس سبزی']
    },
    category: 'sabzi',
    tags: ['sabzi', 'salan', 'healthy', 'low_calorie', 'high_fiber', 'diet_recommendation'],
    typicalServing: { unit: 'plate (1.5 cups)', grams: 200 },
    calories: 160,
    protein: 4.8,
    carbs: 22.0,
    fat: 5.2,
    fiber: 6.5,
    mainIngredients: ['Carrots (Gajar)', 'Green Peas (Matar)', 'Potatoes (Aloo)', 'Capsicum (Shimla Mirch)', 'Onion', 'Tomato', 'Ginger', 'Ajwain & Zeera'],
    howTypicallyMade: 'Seasonal vegetables diced uniformly and stir-cooked with cumin, ajwain, turmeric and tomatoes without heavy water, on gentle steam.',
    recipeSteps: [
      'Pot mein 1 chamach oil mein thori ajwain aur zeera crackle karein.',
      'Pyaz aur adrak sauté karein, phir tamatar aur bareek masalay shamil karein.',
      'Gajar, matar aur aloo daal kar 3 minute tezz aanch par stir fry karein.',
      'Dhakan dhaanp kar halki aanch par sabziyon ke apnay paani mein 10 minute paknay dein.',
      'Aakhri 2 minute mein shimla mirch aur qasuri methi daal kar tez aanch par bhunai karein taake crunch barqarar rahay.'
    ],
    healthyTip: 'Top tier fat-loss and healthy lifestyle meal. Packed with micronutrients, fiber and antioxidants with very low calories.',
    benefits: 'High beta-carotene, vitamin C, gut-friendly fiber, supports metabolic health.',
    whoShouldLimit: ['Generally safe for everyone'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_008',
    name: 'Desi Omelette (Classic 2-Egg Pakistani Pyaz Tamatar Omelette)',
    baseName: 'Desi Omelette',
    aliases: {
      romanUrdu: ['desi omelette', 'pakistani omelette', 'pyaz anda', 'anda fry', 'khagina', 'anda omelette'],
      urdu: ['دیسی آملیٹ']
    },
    category: 'nashta',
    tags: ['nashta', 'anda', 'healthy', 'high_protein', 'diet_recommendation'],
    typicalServing: { unit: 'omelette (2 whole eggs)', grams: 120 },
    calories: 180,
    protein: 13.0,
    carbs: 3.0,
    fat: 12.5,
    fiber: 0.8,
    mainIngredients: ['2 Fresh Eggs', 'Diced Red Onion', 'Diced Tomatoes', 'Green Chili', 'Fresh Coriander', 'Black Pepper / Red Chili Flakes', '1 tsp Oil'],
    howTypicallyMade: 'Eggs whisked vigorously with diced onions, tomatoes, chopped chilies and salt, then pan-cooked until fluffy and golden.',
    recipeSteps: [
      'Ek bowl mein 2 anday torein. Bareek katay pyaz, tamatar, hari mirch, hara dhaniya, namak aur kali mirch daalein.',
      'Fork se achi tarah 1-2 minute phentein (whisk karein) taake anday fluffy ho jayein.',
      'Non-stick frying pan par 1 chota chamach oil phela kar garam karein.',
      'Phentey huay anday daalein, 1-2 minute medium aanch par paknay dein, phir ehtiyat se palat kar doosri taraf se sunhera karein.',
      'Garma garam serve karein.'
    ],
    healthyTip: 'Use a non-stick pan with 1 tsp oil/spray to keep calories low. Or use 1 whole egg + 2 egg whites for a 16g protein powerhouse at only ~110 kcal!',
    benefits: 'High biological value complete protein, choline for brain health, vitamin B12.',
    whoShouldLimit: ['Individuals on strict low-cholesterol diets should limit whole yolks'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / USDA',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_009',
    name: 'Boiled Eggs (2 Whole Eggs with Black Pepper & Zeera)',
    baseName: 'Boiled Eggs',
    aliases: {
      romanUrdu: ['ublay anday', 'boiled eggs', 'hard boiled eggs', 'hard boiled egg', 'anda'],
      urdu: ['ابلے ہوئے انڈے']
    },
    category: 'nashta',
    tags: ['nashta', 'anda', 'healthy', 'high_protein', 'diet_recommendation'],
    typicalServing: { unit: '2 eggs', grams: 100 },
    calories: 140,
    protein: 12.6,
    carbs: 0.8,
    fat: 9.5,
    fiber: 0.0,
    mainIngredients: ['2 Whole Chicken Eggs', 'Pinch of Black Pepper', 'Pinch of Himalayan Pink Salt'],
    howTypicallyMade: 'Whole eggs gently boiled in simmering water for 8-10 minutes, peeled, and seasoned with black pepper and salt.',
    recipeSteps: [
      'Pot mein paani ubaal lein aur anday aahista se chamach se daalein.',
      'Medium aanch par 9-10 minute boil karein (hard-boiled ke liye).',
      'Fauran thanday barf walay paani mein daalein taake chilka asaani se utar jaye.',
      'Chheel kar beech se kat lein aur kali mirch chirak kar serve karein.'
    ],
    healthyTip: 'Zero added oil or butter. Perfect pre-workout or post-workout clean protein snack.',
    benefits: 'Pure bio-available protein with lutein, zeaxanthin, and essential amino acids.',
    whoShouldLimit: ['Safe for general population'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'USDA / Nutrition Guidelines',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  },
  {
    foodId: 'pk_healthy_010',
    name: 'Ghar Ki Roti (100% Whole Wheat Phulka / Chapati)',
    baseName: 'Ghar Ki Roti',
    aliases: {
      romanUrdu: ['ghar ki roti', 'phulka', 'chapati', 'gandum ki roti', 'dry roti', 'roti'],
      urdu: ['گھر کی روٹی', 'پھلکا', 'چپاتی']
    },
    category: 'roti_paratha',
    tags: ['roti_paratha', 'healthy', 'diet_recommendation'],
    typicalServing: { unit: 'roti (phulka)', grams: 55 },
    calories: 115,
    protein: 3.6,
    carbs: 24.0,
    fat: 0.6,
    fiber: 3.4,
    mainIngredients: ['100% Whole Wheat Chakki Atta', 'Water', 'Zero Oil / Baghair Ghee'],
    howTypicallyMade: 'Stone-ground whole wheat kneaded with water, rolled thin and puffed directly on an iron tawa / open flame without oil.',
    recipeSteps: [
      'Chakki ka pure lal atta paani se goondh kar 15 minute ke liye dhak kar rakh dein.',
      'Chota peda banayein aur khushkay ki madad se patla gol bail lein.',
      'Garam taway par daalein, jab chotay bubbles ayein toh palat dein.',
      'Kapray ya flame par phula lein (phulka banayein). Baghair ghee ya makkhan lagaye serve karein.'
    ],
    healthyTip: 'Ghar ki phulka roti baghair ghee ke hoti hai, jo maida ya tandoori naan ke muqablay mein 100-150 calories kam hoti hai aur fiber zyada deti hai.',
    benefits: 'High in complex carbs, dietary fiber, low glycemic index compared to white flour.',
    whoShouldLimit: ['Celiac patients (gluten sensitive)'],
    isEstimate: true,
    estimateRangePercent: 15,
    source: 'Pakistan Food Composition Database / Culinary Recipe Analysis',
    confidence: 'high',
    needsReview: false,
    medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
  }
];

// Helper to generate recipe steps and tips for existing items if missing
function generateRecipeForExisting(food) {
  if (food.recipeSteps && food.recipeSteps.length > 0) return;

  const cat = food.category || '';
  const name = food.name || '';
  const ingredients = Array.isArray(food.mainIngredients) ? food.mainIngredients.join(', ') : 'Desi spices and fresh ingredients';

  const steps = [];
  let tip = '';
  const tags = food.tags || [];

  if (cat === 'daal') {
    steps.push('Daal ko achi tarah dho kar 20-30 minute ke liye bhigo dein.');
    steps.push('Pot mein 3 guna paani, haldi, namak aur lehsan daal kar daal galne tak ubaal lein.');
    steps.push('Alag pan mein 1 chamach oil/ghee mein zeera, bareek lehsan aur sabit gol lal mirch ka khushbudaar tarka lagayein.');
    steps.push('Tarka daal mein shamil karein aur hara dhaniya chirak kar serve karein.');
    tip = 'Tarka mein ghee kam use karein (1 tsp instead of 2 tbsp) to save over 100 calories without sacrificing aroma.';
    tags.push('daal', 'high_fiber', 'diet_recommendation');
    if (food.protein >= 8) tags.push('healthy');
  } else if (cat === 'sabzi') {
    steps.push('Pyaz ko halka gulabi karein, phir lehsan adrak aur tamatar paste daal kar bhunay.');
    steps.push('Bunyadi masalay (haldi, pisi lal mirch, zeera, dhaniya) daal kar masalay ki bhunai karein.');
    steps.push('Taza kati sabzi daal kar masalay mein mix karein aur halki aanch par dum par paknay dein.');
    steps.push('Sabzi galnay par hara dhaniya aur pisa garam masala daal kar serve karein.');
    tip = 'Steam or stir-fry vegetables with minimal oil to protect vitamins and keep calories extremely low.';
    tags.push('sabzi', 'salan', 'low_calorie', 'high_fiber');
    if (food.calories < 220) tags.push('healthy', 'diet_recommendation');
  } else if (cat === 'gosht' || cat === 'bbq') {
    steps.push('Gosht/Chicken ko lehsan, adrak, dahi aur masalon mein 30 minute marinate karein.');
    steps.push('Pot ya karahi mein halkay oil mein marinate kiya hua gosht tezz aanch par bhunay.');
    steps.push('Tamatar aur sabz mirch daal kar halki aanch par gosht galne tak dum dein.');
    steps.push('Adrak julienne aur hara dhaniya daal kar garma garam serve karein.');
    tip = 'Skinless chicken and lean cuts save significant saturated fat. Prefer grilled or bhuna style over deep-fried.';
    tags.push('gosht', 'high_protein');
    if (food.protein >= 18) tags.push('healthy');
  } else if (cat === 'chawal') {
    steps.push('Basmati chawal ko 20-25 minute saaf paani mein bhigo kar rakhein.');
    steps.push('Qorma ya yakhi tayyar karein aur chawal shamil karein.');
    steps.push('Paani khushk hone par rang aur garam masala chirak kar 10-12 minute halki aanch par dum dein.');
    steps.push('Dahanp kar halkay haath se chamach chalaein aur serve karein.');
    tip = 'Measure portion with a cup (e.g. 1 cup cooked rice ~180 kcal) and pair with plenty of fresh salad and raita.';
    tags.push('chawal');
  } else if (cat === 'roti_paratha') {
    steps.push('Chakki ka pure atta paani se narm goondh kar 15 minute rest dein.');
    steps.push('Gol peda bana kar patla bail lein.');
    steps.push('Garam taway par daal kar dono taraf se sekein.');
    steps.push('Flame par phulka phula lein ya halka sa oil/ghee laga kar taway par sekein.');
    tip = 'Choose whole wheat phulka without ghee over fried paratha to cut calorie intake by more than half.';
    tags.push('roti_paratha');
  } else {
    steps.push(`Prepared using traditional Pakistani culinary methods with ${ingredients}.`);
    steps.push('Cooked carefully to maintain authentic flavor and texture.');
    steps.push('Garnished and served fresh.');
    tip = 'Enjoy in moderation as part of a varied, balanced daily diet.';
  }

  food.recipeSteps = steps;
  food.healthyTip = tip;
  food.tags = Array.from(new Set(tags));
}

// Add new dishes if not already present
for (const newDish of NEW_DISHTYPES) {
  const existingIdx = foods.findIndex(f => f.foodId === newDish.foodId);
  if (existingIdx >= 0) {
    foods[existingIdx] = newDish;
  } else {
    foods.unshift(newDish);
  }
}

// Process existing foods
let enrichedCount = 0;
for (const f of foods) {
  if (!f.recipeSteps || f.recipeSteps.length === 0) {
    generateRecipeForExisting(f);
    enrichedCount++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(foods, null, 2), 'utf8');
console.log(`✅ Finished enriching pkFoods.json: Total entries = ${foods.length}. Enriched ${enrichedCount} items.`);
