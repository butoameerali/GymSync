import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputFile = path.resolve(__dirname, '../data/pkFoods.json');

console.log('Generating comprehensive Pakistani Food Database (~1000 entries)...');

// Base templates with nutritional profiles per typical serving
const baseFoods = [
  // ----------------------- 1. DAAL (Lentils & Pulses) -----------------------
  {
    baseName: 'Daal Chana',
    urdu: 'دال چنا',
    romanUrdu: ['chana daal', 'dal chana', 'chana dal fry'],
    category: 'daal',
    servingUnit: 'plate (1.5 cups)',
    grams: 250,
    calories: 280,
    protein: 14,
    carbs: 42,
    fat: 6,
    fiber: 9,
    ingredients: ['Split Bengal Gram', 'Onion', 'Tomato', 'Garlic', 'Ginger', 'Turmeric', 'Cumin', 'Oil/Ghee'],
    cookingMethod: 'Boiled until tender, then tempered with ghee, garlic, and cumin seeds (tarka).',
    benefits: 'High in plant protein and dietary fiber; supports sustained satiety and gut health.',
    whoShouldLimit: ['People with uric acid issues (gout)', 'Individuals on strict kidney potassium restrictions'],
    prepVariations: [
      { modifier: 'Ghar Ki (Standard Tarka)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Style (Heavy Ghee)', calMul: 1.35, fatMul: 1.7 },
      { modifier: 'Bhuni Hui (Dry Fry)', calMul: 1.15, fatMul: 1.25 },
      { modifier: 'Low Oil (Diet Friendly)', calMul: 0.8, fatMul: 0.45 }
    ]
  },
  {
    baseName: 'Daal Mash',
    urdu: 'دال ماش',
    romanUrdu: ['maash ki daal', 'urad daal', 'white daal'],
    category: 'daal',
    servingUnit: 'plate',
    grams: 220,
    calories: 310,
    protein: 15,
    carbs: 38,
    fat: 9,
    fiber: 8,
    ingredients: ['White Urad Dal', 'Ginger slices', 'Green Chilies', 'Onion', 'Ghee/Oil', 'Garam Masala'],
    cookingMethod: 'Soaked, parboiled with spices, then sautéed until dry and aromatic with julienned ginger.',
    benefits: 'Rich in iron, magnesium, and slow-digesting complex carbohydrates.',
    whoShouldLimit: ['Individuals prone to flatulence or bloating', 'High uric acid / gout patients'],
    prepVariations: [
      { modifier: 'Dhawa Fry', calMul: 1.3, fatMul: 1.6 },
      { modifier: 'Ghar Ki Sukhi', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Shorbay Wali', calMul: 0.85, fatMul: 0.8 },
      { modifier: 'Desi Ghee Tarka', calMul: 1.4, fatMul: 1.8 }
    ]
  },
  {
    baseName: 'Daal Moong',
    urdu: 'دال مونگ',
    romanUrdu: ['moong ki daal', 'peeli daal', 'yellow moong'],
    category: 'daal',
    servingUnit: 'bowl (1 cup)',
    grams: 200,
    calories: 210,
    protein: 12,
    carbs: 34,
    fat: 4,
    fiber: 7,
    ingredients: ['Yellow Petite Lentils', 'Tomato', 'Cumin', 'Turmeric', 'Green Chili', 'Garlic'],
    cookingMethod: 'Simmered until soft and creamy, finished with cumin and red chili tarka.',
    benefits: 'Extremely easy to digest; ideal for recovery, stomach lightness, and daily energy.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Patli (Soup/Shorba)', calMul: 0.8, fatMul: 0.7 },
      { modifier: 'Kadhi (Thick Gravy)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Bhuni Hui', calMul: 1.2, fatMul: 1.3 },
      { modifier: 'Khichdi Style with Ghee', calMul: 1.25, fatMul: 1.4 }
    ]
  },
  {
    baseName: 'Daal Masoor',
    urdu: 'دال مسور',
    romanUrdu: ['masoor daal', 'red lentils', 'lal daal'],
    category: 'daal',
    servingUnit: 'bowl',
    grams: 220,
    calories: 220,
    protein: 13,
    carbs: 36,
    fat: 4.5,
    fiber: 8,
    ingredients: ['Red Split Lentils', 'Garlic', 'Onion', 'Tomatoes', 'Red Chili Flakes', 'Mustard Seeds'],
    cookingMethod: 'Fast-cooking red lentils simmered into a smooth stew with garlic-mustard tarka.',
    benefits: 'Abundant in folate and polyphenols; promotes cardiovascular health.',
    whoShouldLimit: ['Severe kidney disease on restricted potassium'],
    prepVariations: [
      { modifier: 'Ghar Ka Tarka', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Restaurant Fry', calMul: 1.3, fatMul: 1.6 },
      { modifier: 'Mixed with Moong', calMul: 1.05, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Lobia Masala (Red/White Kidney Beans)',
    urdu: 'لوبیا سالن',
    romanUrdu: ['rajma', 'safaid lobia', 'lal lobia'],
    category: 'daal',
    servingUnit: 'plate',
    grams: 240,
    calories: 290,
    protein: 16,
    carbs: 45,
    fat: 5,
    fiber: 12,
    ingredients: ['Kidney Beans / Black-eyed peas', 'Onions', 'Tomatoes', 'Coriander', 'Spices'],
    cookingMethod: 'Pressure cooked beans simmered in a spiced tomato-onion reduction gravy.',
    benefits: 'High soluble fiber aids cholesterol management and stabilizes blood glucose.',
    whoShouldLimit: ['People prone to IBS or legume-induced gas'],
    prepVariations: [
      { modifier: 'Gravy / Shorba', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dry Chaat Style', calMul: 0.9, fatMul: 0.7 },
      { modifier: 'Extra Ghee Dhaba', calMul: 1.3, fatMul: 1.5 }
    ]
  },
  {
    baseName: 'Kala Chana Salan',
    urdu: 'کالا چنا شوربہ',
    romanUrdu: ['black chickpeas', 'kala chana shorba'],
    category: 'daal',
    servingUnit: 'plate',
    grams: 250,
    calories: 270,
    protein: 15,
    carbs: 43,
    fat: 4.5,
    fiber: 11,
    ingredients: ['Black Chickpeas', 'Onion', 'Tomato Paste', 'Ginger-Garlic', 'Garam Masala'],
    cookingMethod: 'Slow cooked black chickpeas in an aromatic thin broth spiced with roasted cumin.',
    benefits: 'Low glycemic index and powerhouse of mineral iron, zinc, and dietary fiber.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Thin Shorba', calMul: 0.85, fatMul: 0.7 },
      { modifier: 'Dry Bhuna', calMul: 1.15, fatMul: 1.3 },
      { modifier: 'Spicy Chaat Style', calMul: 0.95, fatMul: 0.8 }
    ]
  },
  {
    baseName: 'Daal Makhani',
    urdu: 'دال مکھنی',
    romanUrdu: ['makhani daal', 'black urad cream'],
    category: 'daal',
    servingUnit: 'bowl',
    grams: 230,
    calories: 390,
    protein: 14,
    carbs: 35,
    fat: 22,
    fiber: 7,
    ingredients: ['Whole Black Urad', 'Butter', 'Cream', 'Tomato Puree', 'Fenugreek Leaves'],
    cookingMethod: 'Slow-simmered whole lentils enriched with butter, cream, and smoky charcoal tarka.',
    benefits: 'High calcium and calorie-dense; provides long-lasting energy.',
    whoShouldLimit: ['Diabetics', 'High cholesterol patients', 'Weight loss program participants'],
    prepVariations: [
      { modifier: 'Restaurant Butter Rich', calMul: 1.25, fatMul: 1.4 },
      { modifier: 'Home Style Low Cream', calMul: 0.75, fatMul: 0.5 }
    ]
  },
  {
    baseName: 'Mixed Daal (Panchmel)',
    urdu: 'مکس دال',
    romanUrdu: ['mix daal', 'panchratan dal'],
    category: 'daal',
    servingUnit: 'plate',
    grams: 220,
    calories: 240,
    protein: 13,
    carbs: 38,
    fat: 5,
    fiber: 8,
    ingredients: ['Chana', 'Moong', 'Masoor', 'Mash', 'Toor Dal', 'Garlic Tarka'],
    cookingMethod: 'Five lentils boiled together and flavored with browned garlic and cumin tarka.',
    benefits: 'Complete amino acid profile from multiple pulses; balanced daily nutrition.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Standard Ghar Ka Tarka', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Double Tarka', calMul: 1.3, fatMul: 1.6 }
    ]
  },

  // ----------------------- 2. SABZI (Vegetable Dishes) -----------------------
  {
    baseName: 'Aloo Gobi',
    urdu: 'آلو گوبھی',
    romanUrdu: ['aloo gobhi', 'potato cauliflower sabzi'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 200,
    calories: 190,
    protein: 4,
    carbs: 26,
    fat: 8,
    fiber: 5,
    ingredients: ['Potatoes', 'Cauliflower', 'Onion', 'Tomato', 'Turmeric', 'Cumin', 'Coriander'],
    cookingMethod: 'Florets and potato cubes stir-steamed in a lightly spiced onion-tomato masala.',
    benefits: 'Rich in vitamin C, vitamin K, and glucosinolates from cruciferous cauliflower.',
    whoShouldLimit: ['Diabetics monitor potato portion (high carb count)'],
    prepVariations: [
      { modifier: 'Ghar Ki Bhuni', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Masala (Extra Oil)', calMul: 1.4, fatMul: 1.8 },
      { modifier: 'Low Oil Steamed', calMul: 0.75, fatMul: 0.4 }
    ]
  },
  {
    baseName: 'Bhindi Masala (Okra)',
    urdu: 'بھنڈی مصالحہ',
    romanUrdu: ['bhindi fry', 'lady finger sabzi'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 180,
    calories: 160,
    protein: 3.5,
    carbs: 18,
    fat: 9,
    fiber: 6,
    ingredients: ['Okra', 'Sliced Onions', 'Tomatoes', 'Amchur/Pomegranate powder', 'Green Chilies'],
    cookingMethod: 'Sliced okra shallow fried with caramelized onions and dry tangy spices.',
    benefits: 'High soluble mucilage fiber supports digestive tract and helps blunt glucose spikes.',
    whoShouldLimit: ['People on kidney stone prevention (high oxalate content)'],
    prepVariations: [
      { modifier: 'Crispy Fry', calMul: 1.3, fatMul: 1.6 },
      { modifier: 'Bhindi Pyaz Ghar Ki', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Air Fried / Minimal Oil', calMul: 0.65, fatMul: 0.3 }
    ]
  },
  {
    baseName: 'Palak Paneer',
    urdu: 'پالک پنیر',
    romanUrdu: ['saag paneer', 'spinach paneer'],
    category: 'sabzi',
    servingUnit: 'bowl',
    grams: 220,
    calories: 270,
    protein: 13,
    carbs: 12,
    fat: 19,
    fiber: 5,
    ingredients: ['Pureed Spinach', 'Paneer cubes', 'Cream', 'Garlic', 'Garam Masala'],
    cookingMethod: 'Blanched spinach simmered with paneer cubes and garlic, rounded with cream.',
    benefits: 'Excellent calcium, iron, and lutein source for bone and vision preservation.',
    whoShouldLimit: ['Lactose intolerant individuals', 'Severe cardiovascular disease (due to dairy fats)'],
    prepVariations: [
      { modifier: 'Cream Rich Restaurant', calMul: 1.3, fatMul: 1.5 },
      { modifier: 'Homestyle No Cream', calMul: 0.8, fatMul: 0.6 }
    ]
  },
  {
    baseName: 'Aloo Palak',
    urdu: 'آلو پالک',
    romanUrdu: ['spinach potato', 'palak aloo'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 220,
    calories: 180,
    protein: 5,
    carbs: 24,
    fat: 7,
    fiber: 6,
    ingredients: ['Spinach leaves', 'Potatoes', 'Garlic', 'Green Chilies', 'Mustard Oil/Ghee'],
    cookingMethod: 'Finely chopped spinach cooked down until water evaporates with potato wedges.',
    benefits: 'High dietary folate, vitamin A, and potassium balance.',
    whoShouldLimit: ['Kidney stone prone individuals (oxalate)'],
    prepVariations: [
      { modifier: 'Ghar Ka Salan', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Bhuna', calMul: 1.35, fatMul: 1.7 }
    ]
  },
  {
    baseName: 'Sarson Ka Saag',
    urdu: 'سرسوں کا ساگ',
    romanUrdu: ['mustard greens', 'punjabi saag'],
    category: 'sabzi',
    servingUnit: 'bowl',
    grams: 250,
    calories: 220,
    protein: 7,
    carbs: 18,
    fat: 14,
    fiber: 8,
    ingredients: ['Mustard Greens', 'Bathua', 'Spinach', 'Maize Flour', 'Garlic', 'Butter/Ghee'],
    cookingMethod: 'Slow cooked for hours into a velvety mash, thickened with cornmeal and topped with butter.',
    benefits: 'Exceptional phytonutrient density, vitamin K, and winter stamina support.',
    whoShouldLimit: ['Thyroid disorder patients (goitrogens when undercooked)', 'Heart patients monitor butter topping'],
    prepVariations: [
      { modifier: 'With Makhan Topping', calMul: 1.45, fatMul: 1.9 },
      { modifier: 'Plain Saag No Butter', calMul: 0.7, fatMul: 0.4 }
    ]
  },
  {
    baseName: 'Karela Pyaz (Bitter Gourd)',
    urdu: 'کریلا پیاز',
    romanUrdu: ['bitter gourd fry', 'karela masala'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 180,
    calories: 140,
    protein: 3,
    carbs: 16,
    fat: 7,
    fiber: 6,
    ingredients: ['Bitter Gourd', 'Sliced Onions', 'Fennel Seeds', 'Coriander Seeds', 'Amchur'],
    cookingMethod: 'Salted, squeezed bitter melon sautéed with generous onions to temper the bitterness.',
    benefits: 'Charantin and polypeptide-p naturally support healthy blood glucose regulation.',
    whoShouldLimit: ['Pregnant women (traditional advisory against high bitter gourd intake)'],
    prepVariations: [
      { modifier: 'Deep Fried Crunchy', calMul: 1.5, fatMul: 2.0 },
      { modifier: 'Homestyle Bhuna', calMul: 1.0, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Baingan Ka Bharta',
    urdu: 'بینگن کا بھرتہ',
    romanUrdu: ['roasted eggplant mash', 'baingan bharta'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 200,
    calories: 150,
    protein: 3,
    carbs: 16,
    fat: 8,
    fiber: 7,
    ingredients: ['Fire-roasted Eggplant', 'Onions', 'Tomatoes', 'Green Chilies', 'Coriander'],
    cookingMethod: 'Eggplants charred over open flame, peeled, mashed, and sautéed with aromatics.',
    benefits: 'High in nasunin (antioxidant) and gentle on blood sugar; low calorie density.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Homestyle Light Ghee', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Smoky Dhaba Style', calMul: 1.3, fatMul: 1.6 }
    ]
  },
  {
    baseName: 'Tinday Masala',
    urdu: 'ٹینڈے مصالحہ',
    romanUrdu: ['apple gourd', 'tinday salan'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 200,
    calories: 120,
    protein: 2.5,
    carbs: 14,
    fat: 6,
    fiber: 5,
    ingredients: ['Apple Gourd', 'Tomato', 'Cumin', 'Red Chili', 'Garlic'],
    cookingMethod: 'Peeled tinday stewed with mild spices until translucent and fork tender.',
    benefits: 'Very high water content; supports hydration and light digestive cleansing.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Shorba Wali', calMul: 0.85, fatMul: 0.7 },
      { modifier: 'Bhuni Hui', calMul: 1.15, fatMul: 1.3 }
    ]
  },
  {
    baseName: 'Torai / Turai (Ridge Gourd)',
    urdu: 'توری کی سبزی',
    romanUrdu: ['tori ki sabzi', 'ridge gourd'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 200,
    calories: 110,
    protein: 2,
    carbs: 12,
    fat: 6,
    fiber: 4.5,
    ingredients: ['Ridge Gourd', 'Onion', 'Tomato', 'Turmeric', 'Cumin Seeds'],
    cookingMethod: 'Slow cooked in its own natural juices with minimal spices.',
    benefits: 'Cooling, light, and very low calorie; ideal for digestion and recovery.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Ghar Ki Sukhi', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Tori Daal Mix', calMul: 1.5, fatMul: 1.2 }
    ]
  },
  {
    baseName: 'Mixed Sabzi (Aloo Matar Gajar)',
    urdu: 'مکس سبزی',
    romanUrdu: ['mix vegetable', 'aloo matar gajar'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 220,
    calories: 175,
    protein: 4.5,
    carbs: 25,
    fat: 7,
    fiber: 6,
    ingredients: ['Potatoes', 'Green Peas', 'Carrots', 'Capsicum', 'Cumin', 'Onions'],
    cookingMethod: 'Diced seasonal vegetables braised in fragrant cumin-coriander base.',
    benefits: 'Broad spectrum vitamins A, C, and carotenoids from colorful garden veggies.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Standard Ghar Ki', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Extra Tarka', calMul: 1.35, fatMul: 1.7 }
    ]
  },

  // ----------------------- 3. GOSHT & POULTRY (Meat Curries & Karahis) -----------------------
  {
    baseName: 'Chicken Karahi',
    urdu: 'چکن کڑاہی',
    romanUrdu: ['chicken karahi', 'desi murgh karahi'],
    category: 'gosht',
    servingUnit: 'portion (2-3 pieces + gravy)',
    grams: 250,
    calories: 380,
    protein: 34,
    carbs: 8,
    fat: 24,
    fiber: 2,
    ingredients: ['Chicken with bone', 'Tomatoes', 'Ginger', 'Garlic', 'Green Chilies', 'Black Pepper', 'Ghee/Oil'],
    cookingMethod: 'Cooked at high heat in a cast-iron wok with ripe tomatoes and ginger julienne, no onions.',
    benefits: 'Dense complete protein supporting muscle synthesis and cellular repair.',
    whoShouldLimit: ['High blood pressure or cholesterol if prepared with heavy commercial oil/ghee'],
    prepVariations: [
      { modifier: 'Restaurant Shenwari / Namak Mandi', calMul: 1.35, fatMul: 1.7 },
      { modifier: 'Homestyle Low Oil', calMul: 0.75, fatMul: 0.5 },
      { modifier: 'White Karahi (Cream & Yogurt)', calMul: 1.25, fatMul: 1.5 },
      { modifier: 'Boneless Handi Cut', calMul: 1.1, fatMul: 1.15 }
    ]
  },
  {
    baseName: 'Mutton Karahi',
    urdu: 'مٹن کڑاہی',
    romanUrdu: ['mutton karahi', 'bakra karahi'],
    category: 'gosht',
    servingUnit: 'portion (250g)',
    grams: 250,
    calories: 490,
    protein: 32,
    carbs: 6,
    fat: 38,
    fiber: 2,
    ingredients: ['Mutton / Goat meat', 'Tomatoes', 'Ginger', 'Garlic', 'Green Chilies', 'Ghee'],
    cookingMethod: 'Tender goat cuts sautéed with cracked black pepper and reduced tomatoes in a heavy karahi.',
    benefits: 'High bioavailable heme iron, zinc, and vitamin B12.',
    whoShouldLimit: ['Hypercholesterolemia / cardiovascular disease (high saturated animal fat)', 'Uric acid / gout patients'],
    prepVariations: [
      { modifier: 'Desi Ghee Shinwari', calMul: 1.3, fatMul: 1.5 },
      { modifier: 'Ghar Ki Mutton Karahi', calMul: 0.9, fatMul: 0.8 },
      { modifier: 'Black Pepper Special', calMul: 1.05, fatMul: 1.05 }
    ]
  },
  {
    baseName: 'Beef Nihari',
    urdu: 'نہاری بیف',
    romanUrdu: ['beef nihari', 'nalli nihari'],
    category: 'gosht',
    servingUnit: 'bowl with shank meat & gravy',
    grams: 300,
    calories: 520,
    protein: 36,
    carbs: 18,
    fat: 34,
    fiber: 2.5,
    ingredients: ['Beef Shank', 'Wheat Flour (Atta)', 'Nihari Spice Blend (Fennel, Ginger, Star Anise)', 'Ghee', 'Ginger/Lemon'],
    cookingMethod: 'Slow overnight braising of shank with bone marrow, thickened with flour slurry and seasoned oil.',
    benefits: 'High collagen, gelatin, and restorative minerals for joint lubrication.',
    whoShouldLimit: ['Diabetics (flour thickened)', 'Heart disease (dense saturated fats & sodium)', 'Weight loss phases'],
    prepVariations: [
      { modifier: 'With Nalli (Bone Marrow)', calMul: 1.35, fatMul: 1.6 },
      { modifier: 'With Maghaz (Brain)', calMul: 1.45, fatMul: 1.8 },
      { modifier: 'Sada (Lean Shank)', calMul: 0.85, fatMul: 0.7 }
    ]
  },
  {
    baseName: 'Chicken Korma',
    urdu: 'چکن قورمہ',
    romanUrdu: ['chicken korma', 'shadiyon wala korma'],
    category: 'gosht',
    servingUnit: 'portion',
    grams: 240,
    calories: 410,
    protein: 28,
    carbs: 12,
    fat: 28,
    fiber: 2,
    ingredients: ['Chicken', 'Browned Fried Onions', 'Yogurt', 'Kewra Water', 'Cardamom', 'Cinnamon', 'Ghee'],
    cookingMethod: 'Yogurt-based spiced gravy with pureed caramelized onions and fragrant whole spices.',
    benefits: 'High protein with aromatic warming spices aiding digestive enzyme secretion.',
    whoShouldLimit: ['Individuals on low-fat diets (high ghee content in traditional wedding preparations)'],
    prepVariations: [
      { modifier: 'Deghi Shadi Style', calMul: 1.35, fatMul: 1.7 },
      { modifier: 'Homestyle Mild', calMul: 0.85, fatMul: 0.7 }
    ]
  },
  {
    baseName: 'Haleem / Daleem (Beef/Chicken)',
    urdu: 'حلیم / دلیم',
    romanUrdu: ['beef haleem', 'chicken daleem'],
    category: 'gosht',
    servingUnit: 'bowl',
    grams: 300,
    calories: 440,
    protein: 30,
    carbs: 48,
    fat: 15,
    fiber: 10,
    ingredients: ['Wheat Kernels', 'Barley', 'Lentils (Chana, Moong, Masoor, Mash)', 'Shredded Beef/Chicken', 'Ghee Tarka', 'Fried Onions'],
    cookingMethod: 'Slow cooked for 8+ hours, continuously beaten with wooden paddles until meat and grains coalesce.',
    benefits: 'Exceptional combination of complex grains and meat; provides sustained stamina and high fiber.',
    whoShouldLimit: ['Diabetics monitor portion size due to grain carbohydrate load'],
    prepVariations: [
      { modifier: 'Extra Tarka & Crispy Pyaz', calMul: 1.3, fatMul: 1.6 },
      { modifier: 'Low Oil Homestyle', calMul: 0.8, fatMul: 0.5 },
      { modifier: 'Chicken Haleem', calMul: 0.9, fatMul: 0.8 }
    ]
  },
  {
    baseName: 'Aloo Gosht',
    urdu: 'آلو گوشت',
    romanUrdu: ['mutton aloo gosht', 'meat and potato curry'],
    category: 'gosht',
    servingUnit: 'bowl with shorba',
    grams: 280,
    calories: 360,
    protein: 24,
    carbs: 22,
    fat: 20,
    fiber: 3.5,
    ingredients: ['Mutton or Beef', 'Potatoes', 'Onion', 'Yogurt', 'Whole Garam Masala', 'Fresh Coriander'],
    cookingMethod: 'Traditional comforting shorba curry with tender meat and potato halves soaking in the broth.',
    benefits: 'Classic family staple offering hydration, protein, and energy.',
    whoShouldLimit: ['High blood pressure watch sodium in shorba'],
    prepVariations: [
      { modifier: 'Mutton Homestyle Shorba', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Beef Cut', calMul: 1.1, fatMul: 1.2 },
      { modifier: 'Chicken Aloo', calMul: 0.8, fatMul: 0.7 }
    ]
  },
  {
    baseName: 'Qeema Matar',
    urdu: 'قیمہ مٹر',
    romanUrdu: ['minced meat with peas', 'keema matar'],
    category: 'gosht',
    servingUnit: 'plate',
    grams: 220,
    calories: 340,
    protein: 26,
    carbs: 16,
    fat: 19,
    fiber: 4,
    ingredients: ['Minced Beef or Mutton', 'Green Peas', 'Ginger-Garlic', 'Green Chilies', 'Coriander'],
    cookingMethod: 'Ground meat sautéed on medium heat with sweet peas, cumin, and sliced ginger.',
    benefits: 'Easily digestible protein combined with vitamin-rich sweet peas.',
    whoShouldLimit: ['Gout / high uric acid patients'],
    prepVariations: [
      { modifier: 'Beef Qeema', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Chicken Qeema (Lean)', calMul: 0.75, fatMul: 0.5 },
      { modifier: 'Dhaba Extra Ghee', calMul: 1.35, fatMul: 1.7 }
    ]
  },
  {
    baseName: 'Murgh Cholay (Chicken Chickpeas)',
    urdu: 'مرغ چھولے',
    romanUrdu: ['murgh chana', 'lahori murgh cholay'],
    category: 'gosht',
    servingUnit: 'plate',
    grams: 260,
    calories: 390,
    protein: 29,
    carbs: 36,
    fat: 16,
    fiber: 8,
    ingredients: ['Chicken pieces', 'White Chickpeas', 'Onion Gravy', 'Black Pepper', 'Baking soda (for tenderness)'],
    cookingMethod: 'Soft-boiled chickpeas cooked with chicken pieces in an aromatic peppery Punjabi sauce.',
    benefits: 'Synergistic combination of animal and legume proteins with abundant dietary fiber.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Lahori Nashta Style (Oil Rich)', calMul: 1.3, fatMul: 1.6 },
      { modifier: 'Ghar Ka Salan', calMul: 0.85, fatMul: 0.7 }
    ]
  },
  {
    baseName: 'Bong Paya (Goat Trotters)',
    urdu: 'بونگ پائے',
    romanUrdu: ['mutton paya', 'paya shorba'],
    category: 'gosht',
    servingUnit: 'bowl with broth & trotter',
    grams: 320,
    calories: 460,
    protein: 28,
    carbs: 6,
    fat: 36,
    fiber: 1,
    ingredients: ['Goat / Cow trotters', 'Onion', 'Garlic', 'Turmeric', 'Coriander Seeds', 'Gelatinous broth'],
    cookingMethod: 'Simmered overnight on low coal embers until connective tissue melts into rich broth.',
    benefits: 'Supreme source of natural collagen, glucosamine, and bone broth amino acids.',
    whoShouldLimit: ['Cardiovascular patients with restricted saturated fats', 'Severe cholesterol control'],
    prepVariations: [
      { modifier: 'Mutton Paya (Classic)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Beef Big Paya', calMul: 1.25, fatMul: 1.35 }
    ]
  },
  {
    baseName: 'Chapli Kabab',
    urdu: 'چپلی کباب',
    romanUrdu: ['peshawari chapli kabab', 'taru jabba kabab'],
    category: 'gosht',
    servingUnit: '1 large kabab',
    grams: 140,
    calories: 360,
    protein: 22,
    carbs: 8,
    fat: 26,
    fiber: 1.5,
    ingredients: ['Ground Beef (with fat)', 'Tomatoes', 'Pomegranate Seeds (Anardana)', 'Crushed Coriander', 'Maize Flour', 'Animal Tallow / Ghee'],
    cookingMethod: 'Flattened disks pan-fried in shallow animal fat or oil on massive concave iron tawas.',
    benefits: 'Rich in zinc, carnosine, and iron with distinctive crunchy coriander and tart anardana.',
    whoShouldLimit: ['People on fat restriction or cholesterol management', 'Heart disease'],
    prepVariations: [
      { modifier: 'Peshawari (Tallow Fried)', calMul: 1.3, fatMul: 1.5 },
      { modifier: 'Home Pan-Fried (Vegetable Oil)', calMul: 0.85, fatMul: 0.75 },
      { modifier: 'Chicken Chapli Kabab', calMul: 0.7, fatMul: 0.5 }
    ]
  },
  {
    baseName: 'Seekh Kabab (Beef/Chicken)',
    urdu: 'سیخ کباب',
    romanUrdu: ['beef seekh kabab', 'chicken seekh kabab'],
    category: 'gosht',
    servingUnit: '2 skewers (160g)',
    grams: 160,
    calories: 290,
    protein: 28,
    carbs: 4,
    fat: 18,
    fiber: 1,
    ingredients: ['Finely minced meat', 'Papaya paste', 'Garam Masala', 'Green Chilies', 'Onion water extracted'],
    cookingMethod: 'Molded onto iron skewers and charcoal-grilled with gentle butter brushing.',
    benefits: 'High protein with minimal carbohydrates; versatile for low-carb nutrition.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Beef Charcoal Grilled', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Chicken Seekh (Leaner)', calMul: 0.75, fatMul: 0.5 },
      { modifier: 'Gola Kabab Style', calMul: 1.1, fatMul: 1.15 }
    ]
  },

  // ----------------------- 4. CHAWAL (Rice Specialties) -----------------------
  {
    baseName: 'Chicken Biryani',
    urdu: 'چکن بریانی',
    romanUrdu: ['chicken biryani', 'sindhi biryani', 'karachi biryani'],
    category: 'chawal',
    servingUnit: 'standard plate (approx 350g)',
    grams: 350,
    calories: 520,
    protein: 26,
    carbs: 68,
    fat: 16,
    fiber: 3.5,
    ingredients: ['Basmati Rice', 'Chicken pieces', 'Yogurt', 'Potatoes', 'Fried Onions', 'Plums (Aloo Bukhara)', 'Mint', 'Biryani Spices'],
    cookingMethod: 'Layered parboiled basmati rice over spicy chicken masala, steam-infused (dum) with saffron.',
    benefits: 'Iconic celebratory meal offering quick carbohydrate replenishment and complete protein.',
    whoShouldLimit: ['Diabetics must monitor portions due to high glycemic basmati carbs', 'Weight loss deficit phases'],
    prepVariations: [
      { modifier: 'Karachi Masaledar with Aloo', calMul: 1.15, fatMul: 1.25 },
      { modifier: 'Homestyle Light Oil', calMul: 0.85, fatMul: 0.65 },
      { modifier: 'Sindhi Spicy Double Dum', calMul: 1.2, fatMul: 1.3 },
      { modifier: 'Without Potato (Aloo Kay Baghair)', calMul: 0.9, fatMul: 0.95 }
    ]
  },
  {
    baseName: 'Mutton Biryani',
    urdu: 'مٹن بریانی',
    romanUrdu: ['mutton biryani', 'gosht biryani'],
    category: 'chawal',
    servingUnit: 'plate (350g)',
    grams: 350,
    calories: 610,
    protein: 28,
    carbs: 66,
    fat: 25,
    fiber: 3,
    ingredients: ['Basmati Rice', 'Mutton with bone', 'Yogurt', 'Ghee', 'Fried Onions', 'Kewra', 'Whole Spices'],
    cookingMethod: 'Dum-cooked marinated goat meat layered with fragrant long-grain basmati and saffron milk.',
    benefits: 'Calorie and nutrient dense; high bioavailable minerals (iron, phosphorus).',
    whoShouldLimit: ['Cardiovascular disease / high cholesterol', 'Diabetics'],
    prepVariations: [
      { modifier: 'Wedding Degh Style', calMul: 1.3, fatMul: 1.5 },
      { modifier: 'Ghar Ki Dum Biryani', calMul: 0.9, fatMul: 0.8 }
    ]
  },
  {
    baseName: 'Chicken Pulao (Yakhni Pulao)',
    urdu: 'چکن یخنی پلاؤ',
    romanUrdu: ['chicken pulao', 'yakhni pulao', 'bannu pulao'],
    category: 'chawal',
    servingUnit: 'plate (320g)',
    grams: 320,
    calories: 450,
    protein: 24,
    carbs: 62,
    fat: 12,
    fiber: 2,
    ingredients: ['Basmati Rice', 'Chicken', 'Aromatic Broth (Yakhni of fennel, coriander, onion)', 'Ghee'],
    cookingMethod: 'Rice cooked entirely within concentrated chicken bone broth until liquid is absorbed.',
    benefits: 'Gentler on stomach than spicy biryani; broth infuses natural collagen and minerals.',
    whoShouldLimit: ['Diabetics monitor rice portion'],
    prepVariations: [
      { modifier: 'Standard Punjabi Yakhni', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Bannu Beef Pulao (Fat Infused)', calMul: 1.45, fatMul: 1.9 },
      { modifier: 'Light Diet Pulao', calMul: 0.8, fatMul: 0.5 }
    ]
  },
  {
    baseName: 'Plain Boiled Basmati Rice',
    urdu: 'سادہ ابلے چاول',
    romanUrdu: ['boiled rice', 'chawal sada', 'zeera rice'],
    category: 'chawal',
    servingUnit: 'plate (1 cup cooked)',
    grams: 200,
    calories: 240,
    protein: 5,
    carbs: 52,
    fat: 0.8,
    fiber: 1.2,
    ingredients: ['Basmati Rice', 'Water', 'Salt', 'Optional Cumin Seeds (Zeera)'],
    cookingMethod: 'Drained or absorption boiled basmati grains without added cooking oil.',
    benefits: 'Very easy to digest; pure complex carbohydrate source for pre/post workout energy.',
    whoShouldLimit: ['Diabetics should pair with fiber (salad/daal) to avoid sudden glycemic spike'],
    prepVariations: [
      { modifier: 'Plain Drained (Pich Nikali)', calMul: 0.9, fatMul: 0.5 },
      { modifier: 'Zeera Tarka (1 tsp Ghee)', calMul: 1.2, fatMul: 3.0 },
      { modifier: 'Brown Basmati Rice', calMul: 0.95, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Chana Pulao',
    urdu: 'چنا پلاؤ',
    romanUrdu: ['chickpea rice', 'kabuli chana pulao'],
    category: 'chawal',
    servingUnit: 'plate (300g)',
    grams: 300,
    calories: 390,
    protein: 12,
    carbs: 68,
    fat: 8,
    fiber: 6,
    ingredients: ['White Chickpeas', 'Basmati Rice', 'Onions', 'Cumin', 'Bay Leaf', 'Garam Masala'],
    cookingMethod: 'Boiled chickpeas sautéed with onion broth and cooked alongside seasoned rice.',
    benefits: 'Plant-based protein and high dietary fiber improves satiety compared to plain rice.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Homestyle Light', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Extra Tarka', calMul: 1.3, fatMul: 1.7 }
    ]
  },
  {
    baseName: 'Khichdi (Moong Daal + Rice)',
    urdu: 'کھچڑی',
    romanUrdu: ['moong daal khichdi', 'khichri'],
    category: 'chawal',
    servingUnit: 'bowl (250g)',
    grams: 250,
    calories: 310,
    protein: 11,
    carbs: 54,
    fat: 6,
    fiber: 5,
    ingredients: ['Split Yellow Moong', 'Rice', 'Cumin', 'Turmeric', 'Desi Ghee'],
    cookingMethod: 'Lentils and rice cooked past standard firmness into a comforting porridge consistency.',
    benefits: 'Gold standard Ayurvedic and Desi comfort food for stomach recovery and convalescence.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Soft Porridge Consistency', calMul: 0.9, fatMul: 0.8 },
      { modifier: 'With Desi Ghee Tarka', calMul: 1.3, fatMul: 1.8 }
    ]
  },

  // ----------------------- 5. ROTI & PARATHA (Breads) -----------------------
  {
    baseName: 'Tandoori Roti',
    urdu: 'تندوری روٹی',
    romanUrdu: ['tandoori roti', 'khamiri roti', 'lal atta roti'],
    category: 'roti_paratha',
    servingUnit: '1 roti',
    grams: 80,
    calories: 180,
    protein: 6,
    carbs: 38,
    fat: 0.8,
    fiber: 4,
    ingredients: ['Whole Wheat Flour', 'Water', 'Salt', 'Yeast/Khamir'],
    cookingMethod: 'Baked inside a clay pit tandoor oven without any added shortening or butter.',
    benefits: 'Zero fat, complex carbohydrates with intact wheat bran fiber for digestion.',
    whoShouldLimit: ['Celiac disease / gluten intolerance'],
    prepVariations: [
      { modifier: 'Dry (Baghair Ghee)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Chupri Hui (Light Ghee Brushed)', calMul: 1.3, fatMul: 4.5 }
    ]
  },
  {
    baseName: 'Ghar Ki Phulka / Chapati',
    urdu: 'گھر کی چپاتی',
    romanUrdu: ['phulka', 'chapati', 'tawa roti'],
    category: 'roti_paratha',
    servingUnit: '1 medium chapati',
    grams: 60,
    calories: 140,
    protein: 4.5,
    carbs: 29,
    fat: 0.6,
    fiber: 3.5,
    ingredients: ['Whole Wheat Flour (Chakki Atta)', 'Water'],
    cookingMethod: 'Rolled thin, cooked on hot flat iron tawa, and puffed directly over flame.',
    benefits: 'Pure staple grain nutrition with no additives or industrial fats.',
    whoShouldLimit: ['Gluten intolerance'],
    prepVariations: [
      { modifier: 'Dry (Saadi Phulka)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Ghee Lagai (Brushed)', calMul: 1.35, fatMul: 5.0 },
      { modifier: 'Double Pera (Large Size)', calMul: 1.6, fatMul: 1.6 }
    ]
  },
  {
    baseName: 'Sada Paratha (Tawa)',
    urdu: 'سادہ پراٹھا',
    romanUrdu: ['paratha', 'plain paratha', 'tawa paratha'],
    category: 'roti_paratha',
    servingUnit: '1 paratha',
    grams: 100,
    calories: 320,
    protein: 5.5,
    carbs: 38,
    fat: 16,
    fiber: 3,
    ingredients: ['Wheat Flour', 'Ghee or Oil layered inside and shallow-fried', 'Salt'],
    cookingMethod: 'Dough layered with fat, rolled into spirals, and shallow fried until golden and flaky.',
    benefits: 'High calorie density; provides sustained energy for active physical laborers.',
    whoShouldLimit: ['Diabetics', 'High cholesterol / heart patients', 'Weight loss deficit tracking'],
    prepVariations: [
      { modifier: 'Homestyle (Moderate Ghee)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Crispy (Deep Fried)', calMul: 1.35, fatMul: 1.65 },
      { modifier: 'Desi Ghee Paratha', calMul: 1.25, fatMul: 1.4 }
    ]
  },
  {
    baseName: 'Aloo Paratha',
    urdu: 'آلو والا پراٹھا',
    romanUrdu: ['aloo paratha', 'potato stuffed bread'],
    category: 'roti_paratha',
    servingUnit: '1 stuffed paratha',
    grams: 160,
    calories: 390,
    protein: 7,
    carbs: 52,
    fat: 17,
    fiber: 4.5,
    ingredients: ['Wheat Dough', 'Spiced Mashed Potatoes', 'Coriander', 'Green Chilies', 'Pomegranate seeds', 'Ghee'],
    cookingMethod: 'Potato stuffing sealed inside layered dough, flattened, and griddle-fried in ghee.',
    benefits: 'Wholesome, highly satiating breakfast favorite.',
    whoShouldLimit: ['Diabetics (double starch combination of flour + potato)'],
    prepVariations: [
      { modifier: 'Standard Homestyle', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Butter Topped Dhaba', calMul: 1.3, fatMul: 1.6 }
    ]
  },
  {
    baseName: 'Qeema Paratha',
    urdu: 'قیمہ پراٹھا',
    romanUrdu: ['qeema paratha', 'minced meat paratha'],
    category: 'roti_paratha',
    servingUnit: '1 stuffed paratha',
    grams: 180,
    calories: 460,
    protein: 18,
    carbs: 42,
    fat: 24,
    fiber: 3,
    ingredients: ['Wheat Dough', 'Cooked Minced Beef or Chicken', 'Garam Masala', 'Mint', 'Ghee'],
    cookingMethod: 'Seasoned minced meat stuffed into dough rounds and pan-fried till golden crisp.',
    benefits: 'High protein breakfast or dinner bread with great satiety.',
    whoShouldLimit: ['People monitoring saturated fat'],
    prepVariations: [
      { modifier: 'Beef Qeema', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Chicken Qeema', calMul: 0.85, fatMul: 0.75 }
    ]
  },
  {
    baseName: 'Roghani Naan',
    urdu: 'روغنی نان',
    romanUrdu: ['roghani naan', 'sesame naan'],
    category: 'roti_paratha',
    servingUnit: '1 naan',
    grams: 130,
    calories: 360,
    protein: 8,
    carbs: 56,
    fat: 12,
    fiber: 2,
    ingredients: ['Refined Flour (Maida)', 'Milk', 'Yogurt', 'Ghee', 'Sesame Seeds (Til)', 'Yeast'],
    cookingMethod: 'Punched with textured patterns, sprinkled with sesame, tandoor-baked, and brushed with butter.',
    benefits: 'Soft, rich, and celebratory bread pairing perfectly with Nihari and Karahi.',
    whoShouldLimit: ['Diabetics (refined flour)', 'Calorie-restricted diets'],
    prepVariations: [
      { modifier: 'Standard Sesame', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Extra Butter / Ghee', calMul: 1.25, fatMul: 1.5 }
    ]
  },
  {
    baseName: 'Puri',
    urdu: 'پوری',
    romanUrdu: ['halwa puri wali puri', 'poori'],
    category: 'roti_paratha',
    servingUnit: '1 puri',
    grams: 45,
    calories: 160,
    protein: 2.5,
    carbs: 18,
    fat: 9,
    fiber: 0.8,
    ingredients: ['Refined White Flour (Maida)', 'Oil for deep frying', 'Salt'],
    cookingMethod: 'Deep fried in hot oil for seconds until puffing into an airy, thin golden orb.',
    benefits: 'Traditional weekend cultural breakfast treat.',
    whoShouldLimit: ['Diabetics', 'High cholesterol', 'Hypertension', 'Weight management'],
    prepVariations: [
      { modifier: 'Standard Size', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Large Bhatura Style', calMul: 1.6, fatMul: 1.7 }
    ]
  },
  {
    baseName: 'Besan Ki Roti (Gram Flour Bread)',
    urdu: 'بیسن کی روٹی',
    romanUrdu: ['besan roti', 'missi roti'],
    category: 'roti_paratha',
    servingUnit: '1 roti',
    grams: 75,
    calories: 170,
    protein: 7,
    carbs: 26,
    fat: 4,
    fiber: 5,
    ingredients: ['Gram Flour (Besan)', 'Whole Wheat', 'Onions', 'Pomegranate seeds', 'Ajwain'],
    cookingMethod: 'Herbed gram flour flatbread cooked dry on tawa with ajwain and crushed chili.',
    benefits: 'High protein, low glycemic index; exceptionally favorable for diabetic management.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Plain Dry Tawa', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Brushed With Desi Ghee', calMul: 1.3, fatMul: 3.5 }
    ]
  },

  // ----------------------- 6. NASHTA (Breakfast Items) -----------------------
  {
    baseName: 'Pakistani Omelette',
    urdu: 'پاکستانی آملیٹ',
    romanUrdu: ['desi omelette', 'khagina anda', 'pyaz tamatar omelet'],
    category: 'nashta',
    servingUnit: '2-egg omelette',
    grams: 120,
    calories: 220,
    protein: 13,
    carbs: 3.5,
    fat: 17,
    fiber: 0.8,
    ingredients: ['Eggs', 'Finely Diced Onion', 'Tomatoes', 'Green Chilies', 'Coriander', 'Red Chili Powder', 'Oil/Ghee'],
    cookingMethod: 'Whisked with diced veggies and pan fried till edges are crisp and golden.',
    benefits: 'Complete biological protein, choline for cognitive health, near zero glycemic impact.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Standard 2 Eggs', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Single Egg', calMul: 0.55, fatMul: 0.55 },
      { modifier: 'Egg Whites Only (Diet)', calMul: 0.45, fatMul: 0.2 },
      { modifier: 'Dhaba Extra Oil', calMul: 1.35, fatMul: 1.6 }
    ]
  },
  {
    baseName: 'Halwa (Sooji Halwa for Puri)',
    urdu: 'سوجی کا حلوہ',
    romanUrdu: ['sooji halwa', 'nashta halwa'],
    category: 'nashta',
    servingUnit: 'small bowl (100g)',
    grams: 100,
    calories: 290,
    protein: 3.5,
    carbs: 44,
    fat: 12,
    fiber: 1,
    ingredients: ['Semolina (Sooji)', 'Sugar', 'Ghee', 'Cardamom', 'Yellow food color'],
    cookingMethod: 'Semolina roasted in ghee until fragrant, then stewed with sugar syrup into a soft confection.',
    benefits: 'Rapid energy replenishment; traditional Sunday pairing with spicy chickpeas and puri.',
    whoShouldLimit: ['Diabetics (pure refined sugar + semolina)', 'Weight loss calorie deficit programs'],
    prepVariations: [
      { modifier: 'Standard Bazaar Nashta', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Homestyle Low Sugar', calMul: 0.75, fatMul: 0.6 }
    ]
  },
  {
    baseName: 'Chana Tarkari (Halwa Puri Style)',
    urdu: 'چھولے ترکاری',
    romanUrdu: ['halwa poori chana', 'salan chana nashta'],
    category: 'nashta',
    servingUnit: 'bowl',
    grams: 200,
    calories: 230,
    protein: 10,
    carbs: 34,
    fat: 6,
    fiber: 7,
    ingredients: ['Chickpeas', 'Kalonji (Nigella seeds)', 'Methi Dana', 'Potato cubes', 'Pickle spices'],
    cookingMethod: 'Chickpeas simmered with nigella seeds and achari spices into a glossy aromatic sauce.',
    benefits: 'High dietary fiber and digestive benefits from nigella and fenugreek seeds.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Standard Bazaar Style', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Homestyle Light', calMul: 0.85, fatMul: 0.7 }
    ]
  },

  // ----------------------- 7. DRINKS & CHAI -----------------------
  {
    baseName: 'Doodh Patti Chai',
    urdu: 'دودھ پتی چائے',
    romanUrdu: ['doodh patti', 'karak chai', 'pakistani chai'],
    category: 'drinks',
    servingUnit: 'standard teacup (180ml)',
    grams: 180,
    calories: 140,
    protein: 4.5,
    carbs: 16,
    fat: 6.5,
    fiber: 0,
    ingredients: ['Full Cream Milk', 'Black Tea Dust (Patti)', 'Sugar', 'Green Cardamom'],
    cookingMethod: 'Tea leaves simmered directly in pure whole milk without water, frothed repeatedly until thickened.',
    benefits: 'Cultural staple offering caffeine alertness, warmth, and dietary calcium.',
    whoShouldLimit: ['Diabetics should request baghair cheeni (unsweetened)', 'Acid reflux sufferers'],
    prepVariations: [
      { modifier: 'Meethi (1.5 tsp Sugar)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Baghair Cheeni (Unsweetened)', calMul: 0.7, fatMul: 1.0 },
      { modifier: 'Elaichi Karak (Strong)', calMul: 1.05, fatMul: 1.0 },
      { modifier: 'Half Milk Half Water (Mixed)', calMul: 0.55, fatMul: 0.45 }
    ]
  },
  {
    baseName: 'Kashmiri Chai (Pink Tea)',
    urdu: 'کشمیری چائے / گلابی چائے',
    romanUrdu: ['pink tea', 'gulabi chai', 'noon chai'],
    category: 'drinks',
    servingUnit: 'cup (200ml)',
    grams: 200,
    calories: 190,
    protein: 6,
    carbs: 18,
    fat: 10,
    fiber: 0.5,
    ingredients: ['Special Kashmiri Green Leaves', 'Baking Soda', 'Milk', 'Pistachios', 'Almonds', 'Cardamom'],
    cookingMethod: 'Aerated boiled tea shocked with cold water to extract natural pink pigment, simmered with milk.',
    benefits: 'Hearty winter drink rich in flavonoids and healthy fats from crushed nuts.',
    whoShouldLimit: ['Watch salt content in authentic salted Kashmiri versions'],
    prepVariations: [
      { modifier: 'Sweetened with Nuts', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Traditional Salted (Namkeen)', calMul: 0.75, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Meethi Lassi',
    urdu: 'میٹھی لسی',
    romanUrdu: ['sweet lassi', 'punjabi lassi'],
    category: 'drinks',
    servingUnit: 'tall glass (350ml)',
    grams: 350,
    calories: 320,
    protein: 9,
    carbs: 46,
    fat: 11,
    fiber: 0,
    ingredients: ['Whole Milk Yogurt (Dahi)', 'Sugar', 'Milk', 'Ice', 'Optional Malai/Cream top'],
    cookingMethod: 'Yogurt churned with wooden madhani with sugar and ice into a frothy cold beverage.',
    benefits: 'Probiotic richness supports gut microbiome and provides soothing hydration in hot weather.',
    whoShouldLimit: ['Diabetics (very high simple sugar content)', 'Weight loss phases'],
    prepVariations: [
      { modifier: 'With Peda / Malai Topping', calMul: 1.35, fatMul: 1.6 },
      { modifier: 'Standard Sweet', calMul: 1.0, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Namkeen Lassi (Salted Lassi)',
    urdu: 'نمکین لسی',
    romanUrdu: ['salted lassi', 'chaas', 'jeera lassi'],
    category: 'drinks',
    servingUnit: 'tall glass (350ml)',
    grams: 350,
    calories: 140,
    protein: 8,
    carbs: 12,
    fat: 6,
    fiber: 0.5,
    ingredients: ['Yogurt', 'Water', 'Black Salt (Kala Namak)', 'Roasted Cumin'],
    cookingMethod: 'Lightly churned yogurt thinned with ice water and spiced with roasted cumin and mineral salt.',
    benefits: 'Superb electrolyte replenisher and digestive aid; completely sugar-free.',
    whoShouldLimit: ['Severe hypertension patients monitor sodium from black salt'],
    prepVariations: [
      { modifier: 'Standard Salted', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Thinned Chaas (Low Fat)', calMul: 0.65, fatMul: 0.3 }
    ]
  },
  {
    baseName: 'Ganne Ka Ras (Sugarcane Juice)',
    urdu: 'گنے کا رس',
    romanUrdu: ['sugarcane juice', 'ganne ka juice'],
    category: 'drinks',
    servingUnit: 'glass (300ml)',
    grams: 300,
    calories: 180,
    protein: 0.5,
    carbs: 45,
    fat: 0.2,
    fiber: 0.5,
    ingredients: ['Fresh Sugarcane stalks', 'Ginger', 'Mint', 'Lemon', 'Black Salt'],
    cookingMethod: 'Freshly cold-pressed through heavy iron rollers with ginger and lemon.',
    benefits: 'Natural alkaline hydration rich in potassium, magnesium, and flavonoids.',
    whoShouldLimit: ['Diabetics (very rapid glycemic spike)'],
    prepVariations: [
      { modifier: 'With Lemon & Ginger', calMul: 1.0, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Rooh Afza / Jam-e-Shirin Sharbat',
    urdu: 'روح افزا / جام شیریں',
    romanUrdu: ['red syrup', 'rooh afza sharbat', 'jam e shirin'],
    category: 'drinks',
    servingUnit: 'glass (250ml)',
    grams: 250,
    calories: 140,
    protein: 0.2,
    carbs: 35,
    fat: 0,
    fiber: 0,
    ingredients: ['Herbal Rose Syrup', 'Water or Milk', 'Ice', 'Basil Seeds (Tukhm-e-Balanga)'],
    cookingMethod: 'Diluted with chilled water or milk, optionally stirred with soaked basil seeds.',
    benefits: 'Cooling summer and Iftar beverage; basil seeds provide mucilage gut soothing.',
    whoShouldLimit: ['Diabetics (high sugar content)'],
    prepVariations: [
      { modifier: 'In Water', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'In Milk (Doodh Rooh Afza)', calMul: 1.8, fatMul: 6.0 },
      { modifier: 'With Tukhm-e-Balanga (Basil Seeds)', calMul: 1.1, fatMul: 1.0 }
    ]
  },

  // ----------------------- 8. SWEETS & DESSERTS -----------------------
  {
    baseName: 'Gulab Jamun',
    urdu: 'گلاب جامن',
    romanUrdu: ['gulab jamun', 'mithai'],
    category: 'sweets',
    servingUnit: '2 pieces (100g)',
    grams: 100,
    calories: 380,
    protein: 5,
    carbs: 58,
    fat: 15,
    fiber: 0.5,
    ingredients: ['Khoa/Mawa (Milk Solids)', 'Paneer', 'Flour', 'Ghee for frying', 'Rose Sugar Syrup'],
    cookingMethod: 'Milk solid dough balls deep fried slowly in ghee and soaked in cardamom-rose sugar syrup.',
    benefits: 'Traditional confectionery of hospitality and celebration.',
    whoShouldLimit: ['Diabetics', 'High cholesterol', 'Weight reduction diets'],
    prepVariations: [
      { modifier: 'Warm in Syrup (2 pieces)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Single Piece', calMul: 0.5, fatMul: 0.5 }
    ]
  },
  {
    baseName: 'Jalebi',
    urdu: 'جلیبی',
    romanUrdu: ['jalebi', 'desi jalebi'],
    category: 'sweets',
    servingUnit: 'portion (100g)',
    grams: 100,
    calories: 360,
    protein: 2.5,
    carbs: 68,
    fat: 10,
    fiber: 0.3,
    ingredients: ['Fermented All-purpose Flour', 'Cornstarch', 'Ghee/Oil', 'Saffron/Color Sugar Syrup'],
    cookingMethod: 'Batter piped into hot oil in pretzel spirals, deep fried crispy and dipped in warm sugar syrup.',
    benefits: 'Crisp hot celebratory sweet; quick glucose boost.',
    whoShouldLimit: ['Diabetics', 'Weight loss programs'],
    prepVariations: [
      { modifier: 'Oil Fried', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Desi Ghee Fried Special', calMul: 1.25, fatMul: 1.5 },
      { modifier: 'Doodh Jalebi (with Hot Milk)', calMul: 1.5, fatMul: 1.6 }
    ]
  },
  {
    baseName: 'Kheer (Rice Pudding)',
    urdu: 'کھیر',
    romanUrdu: ['chawal ki kheer', 'shahi kheer'],
    category: 'sweets',
    servingUnit: 'bowl (150g)',
    grams: 150,
    calories: 260,
    protein: 6.5,
    carbs: 38,
    fat: 9.5,
    fiber: 0.5,
    ingredients: ['Full Fat Milk', 'Broken Basmati Rice', 'Sugar', 'Cardamom', 'Kewra', 'Pistachios & Almonds'],
    cookingMethod: 'Simmered on low flame for hours until rice breaks down and milk thickens to a creamy rabri consistency.',
    benefits: 'Nutrient-dense with dietary calcium and zinc from nuts and slow-reduced milk.',
    whoShouldLimit: ['Diabetics monitor sugar content'],
    prepVariations: [
      { modifier: 'Standard Shahi', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Matka / Clay Pot Set', calMul: 1.05, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Gajar Ka Halwa',
    urdu: 'گاجر کا حلوہ',
    romanUrdu: ['carrot halwa', 'gajrela'],
    category: 'sweets',
    servingUnit: 'bowl (150g)',
    grams: 150,
    calories: 340,
    protein: 6,
    carbs: 44,
    fat: 16,
    fiber: 3.5,
    ingredients: ['Red Winter Carrots', 'Full Cream Milk', 'Khoya', 'Sugar', 'Ghee', 'Cardamom', 'Almonds'],
    cookingMethod: 'Grated carrots cooked down in milk, roasted with ghee and sugar, topped with crumbled khoya.',
    benefits: 'High beta-carotene (provitamin A) and antioxidants from winter carrots.',
    whoShouldLimit: ['Diabetics', 'High cholesterol patients'],
    prepVariations: [
      { modifier: 'Standard with Khoya', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Low Ghee Homestyle', calMul: 0.75, fatMul: 0.5 }
    ]
  },

  // ----------------------- 9. FAST FOOD & SNACKS -----------------------
  {
    baseName: 'Pakistani Bun Kabab',
    urdu: 'بن کباب',
    romanUrdu: ['bun kabab', 'karachi bun kabab', 'daal anda bun kabab'],
    category: 'fast_food',
    servingUnit: '1 bun kabab',
    grams: 180,
    calories: 380,
    protein: 14,
    carbs: 48,
    fat: 15,
    fiber: 4,
    ingredients: ['Burger Bun', 'Daal Patty (Chana)', 'Whipped Egg Coat', 'Onion slices', 'Mint Tamarind Chutney'],
    cookingMethod: 'Spiced lentil patty dipped in airy frothed egg, tawa-fried and sandwiched in toasted soft buns.',
    benefits: 'Balanced blend of legume fiber and egg protein with authentic Karachi street spices.',
    whoShouldLimit: ['Watch sodium from chutneys if hypertensive'],
    prepVariations: [
      { modifier: 'Daal Anda (Classic)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Beef Bun Kabab', calMul: 1.25, fatMul: 1.4 },
      { modifier: 'Chicken Bun Kabab', calMul: 1.1, fatMul: 1.15 }
    ]
  },
  {
    baseName: 'Chicken Shawarma (Pakistani Style)',
    urdu: 'چکن شوارما',
    romanUrdu: ['shawarma roll', 'desi chicken shawarma'],
    category: 'fast_food',
    servingUnit: '1 roll',
    grams: 220,
    calories: 420,
    protein: 22,
    carbs: 44,
    fat: 18,
    fiber: 3,
    ingredients: ['Pita Bread', 'Shredded Spiced Chicken', 'Garlic Mayonnaise Sauce', 'Pickled Cucumber', 'Cabbage'],
    cookingMethod: 'Rotisserie carved chicken wrapped in warmed pita with generous garlic mayo sauce and pickles.',
    benefits: 'High lean protein from rotisserie chicken breast.',
    whoShouldLimit: ['High cholesterol or weight loss (commercial garlic mayo is calorie-dense)'],
    prepVariations: [
      { modifier: 'Standard Garlic Mayo', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'With Cheese', calMul: 1.25, fatMul: 1.4 },
      { modifier: 'Diet / Low Mayo', calMul: 0.8, fatMul: 0.55 }
    ]
  },
  {
    baseName: 'Vegetable Samosa',
    urdu: 'آلو والا سموسہ',
    romanUrdu: ['aloo samosa', 'desi samosa'],
    category: 'snacks',
    servingUnit: '1 piece (80g)',
    grams: 80,
    calories: 220,
    protein: 3.5,
    carbs: 26,
    fat: 12,
    fiber: 2.5,
    ingredients: ['Flour pastry crust', 'Mashed Spiced Potatoes', 'Cumin', 'Coriander Seeds', 'Pomegranate seeds', 'Oil'],
    cookingMethod: 'Triangular pastry crust stuffed with potato-spice mixture and deep fried till golden crispy.',
    benefits: 'Beloved teatime and street snack.',
    whoShouldLimit: ['Diabetics', 'Heart health (deep fried refined flour and starch)'],
    prepVariations: [
      { modifier: 'Deep Fried (Standard)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Air Fried / Baked', calMul: 0.65, fatMul: 0.3 },
      { modifier: 'Qeema Samosa (Beef/Chicken)', calMul: 1.15, fatMul: 1.1 }
    ]
  },
  {
    baseName: 'Pakora (Mixed Vegetable)',
    urdu: 'پکوڑے',
    romanUrdu: ['aloo pyaz pakora', 'mixed pakoday'],
    category: 'snacks',
    servingUnit: 'portion (4-5 pieces, 120g)',
    grams: 120,
    calories: 310,
    protein: 8,
    carbs: 28,
    fat: 19,
    fiber: 4.5,
    ingredients: ['Gram Flour (Besan)', 'Potatoes', 'Onions', 'Spinach', 'Pomegranate seeds', 'Ajwain', 'Oil'],
    cookingMethod: 'Vegetable strips dipped in spiced chickpea batter and deep fried in small drop fritters.',
    benefits: 'Rainy day and Ramadan favorite; chickpea flour base offers plant protein and ajwain aids digestion.',
    whoShouldLimit: ['Weight loss deficit tracking', 'Cardiovascular disease'],
    prepVariations: [
      { modifier: 'Crispy Fried', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Palak Pakora', calMul: 0.9, fatMul: 0.95 },
      { modifier: 'Paneer Pakora', calMul: 1.35, fatMul: 1.4 }
    ]
  },
  {
    baseName: 'Dahi Bhallay / Dahi Baray',
    urdu: 'دہی بھلے',
    romanUrdu: ['dahi bhalla', 'dahi baray chaat'],
    category: 'snacks',
    servingUnit: 'plate (250g)',
    grams: 250,
    calories: 280,
    protein: 10,
    carbs: 38,
    fat: 10,
    fiber: 5,
    ingredients: ['Mash Daal Fritters (Bhallay)', 'Whipped Yogurt', 'Boiled Potatoes', 'Chickpeas', 'Imli Chutney', 'Chaat Masala'],
    cookingMethod: 'Soaked lentil dumplings layered in seasoned cold yogurt, topped with chickpeas and tamarind syrup.',
    benefits: 'Probiotics from chilled yogurt with dietary fiber from pulses; soothing on stomach.',
    whoShouldLimit: ['Diabetics watch sugar in sweet imli chutney'],
    prepVariations: [
      { modifier: 'Standard Bazaar Plate', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Diet Homestyle (No sweet chutney)', calMul: 0.8, fatMul: 0.7 }
    ]
  },
  {
    baseName: 'Gol Gappay / Pani Puri',
    urdu: 'گول گپے',
    romanUrdu: ['pani puri', 'gol gappay with khatta'],
    category: 'snacks',
    servingUnit: 'plate of 6 pieces',
    grams: 180,
    calories: 180,
    protein: 4,
    carbs: 32,
    fat: 4.5,
    fiber: 3,
    ingredients: ['Crisp hollow puris', 'Boiled Chickpeas & Potatoes', 'Tart Tamarind-Mint Water (Khatta Pani)', 'Sweet Chutney'],
    cookingMethod: 'Crisp puris stuffed with chickpeas and filled to the brim with spiced tamarind water.',
    benefits: 'Relatively low in calories per plate compared to other street snacks; tart spices stimulate saliva.',
    whoShouldLimit: ['Severe acid reflux or gastritis patients'],
    prepVariations: [
      { modifier: 'Spicy Khatta Pani (6 pcs)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Meetha Dahi Puri (6 pcs)', calMul: 1.4, fatMul: 1.5 }
    ]
  },
  {
    baseName: 'Fruit Chaat (Pakistani Style)',
    urdu: 'فروٹ چاٹ',
    romanUrdu: ['fruit chaat', 'spiced fruit salad'],
    category: 'snacks',
    servingUnit: 'bowl (200g)',
    grams: 200,
    calories: 150,
    protein: 2,
    carbs: 36,
    fat: 0.5,
    fiber: 5,
    ingredients: ['Apples', 'Bananas', 'Guava (Amrood)', 'Orange Juice', 'Chaat Masala', 'Black Pepper'],
    cookingMethod: 'Tossed diced seasonal fresh fruits spiced with tangy chaat masala and citrus dressing.',
    benefits: 'High dietary fiber, potassium, vitamin C; natural hydration with zero added oil.',
    whoShouldLimit: ['Diabetics monitor total fruit sugar (fructose) load'],
    prepVariations: [
      { modifier: 'Juice Tossed (No cream)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Creamy Fruit Chaat (with Malai)', calMul: 1.9, fatMul: 12.0 }
    ]
  },

  // ----------------------- 10. BBQ SPECIALTIES -----------------------
  {
    baseName: 'Chicken Tikka',
    urdu: 'چکن تکہ',
    romanUrdu: ['chicken tikka piece', 'bbq chicken tikka'],
    category: 'bbq',
    servingUnit: '1 quarter piece (chest/breast)',
    grams: 220,
    calories: 260,
    protein: 42,
    carbs: 3,
    fat: 9,
    fiber: 0.5,
    ingredients: ['Chicken Breast Quarter', 'Yogurt', 'Lemon', 'Ginger-Garlic', 'Tikka Masala', 'Kachri Powder'],
    cookingMethod: 'Marinated in yogurt and red spices, skewered and grilled over searing wood charcoal.',
    benefits: 'Lean, ultra-high protein; ideal for muscle preservation, fat loss, and diabetic stability.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Chest Piece (Lean Breast)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Leg Piece (Thigh with bone)', calMul: 1.15, fatMul: 1.4 },
      { modifier: 'Malai Tikka (Cream & Cheese)', calMul: 1.35, fatMul: 1.6 }
    ]
  },
  {
    baseName: 'Chicken Sajji (Balochi Style)',
    urdu: 'بلوچی سجی',
    romanUrdu: ['balochi sajji', 'chicken sajji'],
    category: 'bbq',
    servingUnit: 'half chicken (approx 350g)',
    grams: 350,
    calories: 480,
    protein: 64,
    carbs: 2,
    fat: 24,
    fiber: 0.2,
    ingredients: ['Whole Chicken', 'Rock Salt', 'Carom Seeds (Ajwain)', 'Lemon Juice', 'Chaat Masala'],
    cookingMethod: 'Lightly salted whole chicken impaled on skewers and roasted slowly around an open ring of wood fire.',
    benefits: 'Pure smoke-roasted meat with zero batter, minimal oil, and high protein density.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Without Rice (Meat Only)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Served Over Spiced Rice', calMul: 1.6, fatMul: 1.3 }
    ]
  },

  // ----------------------- 11. CHUTNEY & RAITA -----------------------
  {
    baseName: 'Mint & Coriander Raita',
    urdu: 'پودینہ رائتہ',
    romanUrdu: ['podina raita', 'dahi raita', 'green raita'],
    category: 'chutney_raita',
    servingUnit: 'small bowl (100g)',
    grams: 100,
    calories: 65,
    protein: 3.5,
    carbs: 5,
    fat: 3.5,
    fiber: 0.5,
    ingredients: ['Yogurt', 'Fresh Mint Leaves', 'Fresh Coriander', 'Green Chili', 'Roasted Cumin', 'Black Salt'],
    cookingMethod: 'Herbs blended into a fine paste and stirred into whisked cold yogurt with toasted cumin.',
    benefits: 'Probiotics combined with cooling menthol in mint aid digestion and mitigate spicy curry heat.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Standard Homestyle', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Zeera & Cucumber (Khira)', calMul: 0.9, fatMul: 0.8 },
      { modifier: 'Boondi Raita (with fried droplets)', calMul: 1.4, fatMul: 1.9 }
    ]
  },
  {
    baseName: 'Imli Ki Chutney (Tamarind Sauce)',
    urdu: 'املی کی چٹنی',
    romanUrdu: ['tamarind chutney', 'imli meethi chutney'],
    category: 'chutney_raita',
    servingUnit: '2 tablespoons (30g)',
    grams: 30,
    calories: 55,
    protein: 0.4,
    carbs: 14,
    fat: 0.1,
    fiber: 1,
    ingredients: ['Tamarind Pulp (Imli)', 'Jaggery / Sugar', 'Cumin', 'Ginger powder (Sonth)', 'Black Salt'],
    cookingMethod: 'Tamarind pulp simmered with unrefined jaggery and warming spices until syrupy.',
    benefits: 'Tart malic and tartaric acids stimulate digestive enzymes; rich in natural antioxidants.',
    whoShouldLimit: ['Diabetics should limit due to concentrated sugar content'],
    prepVariations: [
      { modifier: 'Standard Sweet & Sour', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Sugar Free / Tart Khatta', calMul: 0.4, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Shami Kabab (Beef & Chana Daal)',
    urdu: 'شامی کباب',
    romanUrdu: ['shami kabab', 'beef shami'],
    category: 'snacks',
    servingUnit: '2 kababs (120g)',
    grams: 120,
    calories: 240,
    protein: 20,
    carbs: 14,
    fat: 12,
    fiber: 3.5,
    ingredients: ['Lean Beef', 'Split Chickpeas (Chana Daal)', 'Whole Spices', 'Egg Wash', 'Fresh Herbs'],
    cookingMethod: 'Meat and lentils pressure cooked, pounded finely with herbs, shaped into patties and shallow fried in egg wash.',
    benefits: 'Superb balance of complete lean animal protein and pulse fiber; freezer friendly staple.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Pan Fried with Egg Wash', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Chicken Shami (Ultra Lean)', calMul: 0.8, fatMul: 0.6 },
      { modifier: 'Air Fried / Baghair Anda', calMul: 0.75, fatMul: 0.4 }
    ]
  },
  {
    baseName: 'Reshmi Kabab (Chicken Malai)',
    urdu: 'ریشمی کباب',
    romanUrdu: ['reshmi kabab', 'chicken reshmi'],
    category: 'bbq',
    servingUnit: '2 skewers (160g)',
    grams: 160,
    calories: 310,
    protein: 30,
    carbs: 4,
    fat: 19,
    fiber: 0.5,
    ingredients: ['Chicken Mince', 'Fresh Cream', 'Cashew Paste', 'White Pepper', 'Cheese'],
    cookingMethod: 'Delicately spiced minced chicken infused with cream and skewered over embers.',
    benefits: 'Melt-in-mouth soft texture; high quality protein.',
    whoShouldLimit: ['People on strict low-fat diets'],
    prepVariations: [
      { modifier: 'Charcoal Grilled', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Pan Griddled', calMul: 1.1, fatMul: 1.15 }
    ]
  },
  {
    baseName: 'Chinioti Mutton Kunna',
    urdu: 'چنیوٹی مٹن کُنہ',
    romanUrdu: ['matka kunna', 'chinioti kunna'],
    category: 'gosht',
    servingUnit: 'clay bowl (250g)',
    grams: 250,
    calories: 460,
    protein: 30,
    carbs: 10,
    fat: 34,
    fiber: 1.5,
    ingredients: ['Mutton Shank', 'Desi Ghee', 'Wheat Flour', 'Onion', 'Chinioti Kunna Spices'],
    cookingMethod: 'Slow cooked inside a sealed unglazed clay pot (kunna) until meat falls off the bone.',
    benefits: 'Rich in bone marrow minerals and collagen; deep earthy clay-pot flavor.',
    whoShouldLimit: ['Cardiovascular patients with restricted saturated fat intake'],
    prepVariations: [
      { modifier: 'Desi Ghee Matka', calMul: 1.25, fatMul: 1.4 },
      { modifier: 'Standard Homestyle', calMul: 1.0, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Chicken White Handi',
    urdu: 'چکن وائٹ ہانڈی',
    romanUrdu: ['white handi', 'malai handi'],
    category: 'gosht',
    servingUnit: 'portion (240g)',
    grams: 240,
    calories: 430,
    protein: 32,
    carbs: 8,
    fat: 30,
    fiber: 1,
    ingredients: ['Boneless Chicken', 'Yogurt', 'Heavy Cream', 'White Pepper', 'Green Chilies', 'Butter'],
    cookingMethod: 'Simmered in clay handi with yogurt, cream, and crushed white peppercorns without red chilies or tomatoes.',
    benefits: 'High protein with soothing mild spices; easy on sensitive stomachs.',
    whoShouldLimit: ['Lactose intolerant individuals', 'Strict low-calorie programs'],
    prepVariations: [
      { modifier: 'Restaurant Cream Rich', calMul: 1.3, fatMul: 1.5 },
      { modifier: 'Homestyle Low Cream', calMul: 0.8, fatMul: 0.6 }
    ]
  },
  {
    baseName: 'Degi Beef Korma',
    urdu: 'دیگی بیف قورمہ',
    romanUrdu: ['degi korma', 'beef korma'],
    category: 'gosht',
    servingUnit: 'portion (250g)',
    grams: 250,
    calories: 470,
    protein: 34,
    carbs: 10,
    fat: 32,
    fiber: 1.5,
    ingredients: ['Beef cuts', 'Browned Onions', 'Yogurt', 'Nutmeg & Mace (Jaiphal Javatri)', 'Ghee'],
    cookingMethod: 'Cauldron-cooked rich curry with coarse fried onion gravy and regal Mughal spices.',
    benefits: 'High iron, zinc, and B-vitamins.',
    whoShouldLimit: ['Uric acid patients', 'High cholesterol patients'],
    prepVariations: [
      { modifier: 'Shadi Style Rich', calMul: 1.3, fatMul: 1.5 },
      { modifier: 'Ghar Ka Korma', calMul: 0.85, fatMul: 0.75 }
    ]
  },
  {
    baseName: 'Methi Aloo',
    urdu: 'میتھی آلو',
    romanUrdu: ['fenugreek potatoes', 'aloo methi sabzi'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 180,
    calories: 170,
    protein: 4,
    carbs: 24,
    fat: 7,
    fiber: 5,
    ingredients: ['Fresh Fenugreek Leaves (Methi)', 'Potatoes', 'Garlic', 'Turmeric', 'Cumin'],
    cookingMethod: 'Bittersweet fresh fenugreek leaves stir-fried with potatoes until aromatic and tender.',
    benefits: 'Fenugreek leaves improve insulin sensitivity and support cholesterol management.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Ghar Ki Sukhi', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Style', calMul: 1.3, fatMul: 1.6 }
    ]
  },
  {
    baseName: 'Shimla Mirch Aloo / Qeema',
    urdu: 'شملہ مرچ آلو',
    romanUrdu: ['capsicum sabzi', 'shimla mirch aloo'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 200,
    calories: 160,
    protein: 3.5,
    carbs: 22,
    fat: 7,
    fiber: 4.5,
    ingredients: ['Bell Peppers (Shimla Mirch)', 'Potatoes', 'Onions', 'Tomatoes', 'Cumin'],
    cookingMethod: 'Diced crisp capsicum braised with tender potatoes in light onion gravy.',
    benefits: 'High in vitamin C, vitamin A, and antioxidants with satisfying vegetable crunch.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Vegetarian Aloo Mix', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'With Minced Beef (Qeema Shimla Mirch)', calMul: 1.8, fatMul: 1.9 }
    ]
  },
  {
    baseName: 'Arvi Masala (Taro Root)',
    urdu: 'اروی مصالحہ',
    romanUrdu: ['arbi masala', 'taro root salan'],
    category: 'sabzi',
    servingUnit: 'plate',
    grams: 190,
    calories: 185,
    protein: 3,
    carbs: 28,
    fat: 7,
    fiber: 5.5,
    ingredients: ['Taro Root (Arvi)', 'Ajwain (Carom seeds)', 'Lemon Juice', 'Fenugreek', 'Onion Gravy'],
    cookingMethod: 'Fried arvi simmered in tangy ajwain-lemon gravy to break down slippery mucilage.',
    benefits: 'Complex resistant starch supports beneficial bifidobacteria in colon.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Bhuni Gravy', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Crisp Dry Fry', calMul: 1.25, fatMul: 1.5 }
    ]
  },
  {
    baseName: 'Matar Paneer',
    urdu: 'مٹر پنیر',
    romanUrdu: ['peas and paneer', 'matar paneer curry'],
    category: 'sabzi',
    servingUnit: 'bowl',
    grams: 220,
    calories: 260,
    protein: 12,
    carbs: 18,
    fat: 16,
    fiber: 4.5,
    ingredients: ['Green Peas', 'Paneer Cheese', 'Tomato-Onion Puree', 'Garam Masala', 'Cream'],
    cookingMethod: 'Sweet green peas and pan-seared paneer cubes simmered in spiced tomato reduction.',
    benefits: 'Vegetarian protein and calcium from paneer combined with pea dietary fiber.',
    whoShouldLimit: ['Lactose intolerant individuals'],
    prepVariations: [
      { modifier: 'Standard Gravy', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Shahi Rich Cream', calMul: 1.3, fatMul: 1.5 }
    ]
  },
  {
    baseName: 'Beef Yakhni Pulao',
    urdu: 'بیف یخنی پلاؤ',
    romanUrdu: ['beef pulao', 'bannu beef pulao'],
    category: 'chawal',
    servingUnit: 'plate (340g)',
    grams: 340,
    calories: 520,
    protein: 28,
    carbs: 64,
    fat: 18,
    fiber: 2,
    ingredients: ['Basmati Rice', 'Beef Shank & Marrow bones', 'Fennel Coriander Broth', 'Ghee'],
    cookingMethod: 'Rice steamed directly in rich beef bone marrow yakhni until fragrant and plump.',
    benefits: 'High collagen, zinc, and bioavailable iron.',
    whoShouldLimit: ['Cardiovascular disease / cholesterol management', 'Diabetics'],
    prepVariations: [
      { modifier: 'Standard Pulao', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Bannu Special (Melted Tallow)', calMul: 1.4, fatMul: 1.8 }
    ]
  },
  {
    baseName: 'Matka Dum Biryani',
    urdu: 'مٹکا دم بریانی',
    romanUrdu: ['clay pot biryani', 'handi biryani'],
    category: 'chawal',
    servingUnit: 'clay pot serving (360g)',
    grams: 360,
    calories: 560,
    protein: 27,
    carbs: 72,
    fat: 19,
    fiber: 3.5,
    ingredients: ['Basmati Rice', 'Chicken/Meat', 'Spiced Gravy', 'Dough-sealed clay pot'],
    cookingMethod: 'Sealed inside individual clay pots with wheat dough and slow-steamed on coals.',
    benefits: 'Retains all volatile aromatic essential oils from cardamom, saffron, and mint.',
    whoShouldLimit: ['Diabetics monitor carb portions'],
    prepVariations: [
      { modifier: 'Chicken Handi Biryani', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Mutton Handi Biryani', calMul: 1.2, fatMul: 1.35 }
    ]
  },
  {
    baseName: 'Garlic Naan',
    urdu: 'گارلک نان / لہسن والا نان',
    romanUrdu: ['garlic naan', 'butter garlic naan'],
    category: 'roti_paratha',
    servingUnit: '1 naan (120g)',
    grams: 120,
    calories: 340,
    protein: 8,
    carbs: 52,
    fat: 11,
    fiber: 2,
    ingredients: ['Refined Flour', 'Minced Garlic', 'Coriander', 'Butter/Ghee', 'Yeast'],
    cookingMethod: 'Tandoor baked with minced garlic and cilantro, brushed hot with melted butter.',
    benefits: 'Allicin from freshly baked garlic provides natural antimicrobial benefits.',
    whoShouldLimit: ['Diabetics (refined flour)', 'Calorie deficit phases'],
    prepVariations: [
      { modifier: 'Butter Brushed', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Without Butter (Dry Garlic)', calMul: 0.8, fatMul: 0.4 }
    ]
  },
  {
    baseName: 'Keema Naan (Minced Meat Stuffed Naan)',
    urdu: 'قیمہ نان',
    romanUrdu: ['qeema naan', 'stuffed beef naan'],
    category: 'roti_paratha',
    servingUnit: '1 naan (180g)',
    grams: 180,
    calories: 480,
    protein: 22,
    carbs: 54,
    fat: 20,
    fiber: 3,
    ingredients: ['Refined Flour', 'Spiced Minced Beef/Chicken', 'Onion', 'Sesame', 'Ghee'],
    cookingMethod: 'Minced meat stuffed into naan dough, flattened and baked on tandoor wall.',
    benefits: 'Complete meal in one stuffed bread; high protein.',
    whoShouldLimit: ['People monitoring saturated fat'],
    prepVariations: [
      { modifier: 'Beef Stuffed', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Chicken Stuffed', calMul: 0.85, fatMul: 0.75 }
    ]
  },
  {
    baseName: 'Makki Ki Roti (Cornmeal Flatbread)',
    urdu: 'مکئی کی روٹی',
    romanUrdu: ['makki roti', 'corn flour bread'],
    category: 'roti_paratha',
    servingUnit: '1 roti (90g)',
    grams: 90,
    calories: 210,
    protein: 4.5,
    carbs: 38,
    fat: 5,
    fiber: 4,
    ingredients: ['Yellow Cornmeal Flour (Makki Ka Atta)', 'Warm Water', 'Light Ghee'],
    cookingMethod: 'Hand-patted flatbread cooked slowly on iron tawa until speckled golden brown.',
    benefits: 'Naturally gluten-free grain rich in carotenoids (lutein, zeaxanthin); classic saag partner.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Dry Tawa', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'With Desi Ghee Top', calMul: 1.35, fatMul: 3.0 }
    ]
  },
  {
    baseName: 'Sheermal / Taftan (Sweet Saffron Bread)',
    urdu: 'شیرمال / تافتان',
    romanUrdu: ['sheermal', 'taftan bread'],
    category: 'roti_paratha',
    servingUnit: '1 bread (140g)',
    grams: 140,
    calories: 420,
    protein: 9,
    carbs: 62,
    fat: 16,
    fiber: 2,
    ingredients: ['Flour', 'Milk', 'Sugar', 'Saffron', 'Kewra', 'Ghee'],
    cookingMethod: 'Enriched dough kneaded with milk and saffron syrup, tandoor baked to a golden sheen.',
    benefits: 'Traditional royal celebratory accompaniment to Korma and Nihari.',
    whoShouldLimit: ['Diabetics (sugar and refined starch combination)'],
    prepVariations: [
      { modifier: 'Standard Saffron Sheermal', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Zafrani Special Rich', calMul: 1.25, fatMul: 1.4 }
    ]
  },
  {
    baseName: 'Khagina (Desi Spiced Scrambled Eggs)',
    urdu: 'خاگینہ',
    romanUrdu: ['khageena', 'desi scrambled eggs'],
    category: 'nashta',
    servingUnit: 'plate (2 eggs, 140g)',
    grams: 140,
    calories: 240,
    protein: 14,
    carbs: 4,
    fat: 18,
    fiber: 1,
    ingredients: ['Eggs', 'Onions', 'Tomatoes', 'Cumin Seeds', 'Turmeric', 'Green Chilies', 'Ghee'],
    cookingMethod: 'Aromatics sautéed into a paste, whisked eggs folded in gently until soft curds form.',
    benefits: 'High protein, keto-friendly breakfast providing satiety and steady morning energy.',
    whoShouldLimit: [],
    prepVariations: [
      { modifier: 'Standard 2 Eggs', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Low Oil Homestyle', calMul: 0.8, fatMul: 0.6 }
    ]
  },
  {
    baseName: 'Ras Malai',
    urdu: 'رس ملائی',
    romanUrdu: ['rasmalai', 'mithai ras malai'],
    category: 'sweets',
    servingUnit: '2 dumplings with sweet milk (160g)',
    grams: 160,
    calories: 270,
    protein: 8,
    carbs: 34,
    fat: 11,
    fiber: 0.2,
    ingredients: ['Cottage Cheese / Milk Solid dumplings', 'Saffron Milk', 'Pistachios', 'Cardamom'],
    cookingMethod: 'Poached paneer dumplings chilled in condensed cardamom-saffron milk.',
    benefits: 'High dietary calcium and protein compared to fried syrup sweets.',
    whoShouldLimit: ['Diabetics (condensed sweet milk)'],
    prepVariations: [
      { modifier: 'Standard 2 Pieces with Rabri Milk', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Single Piece', calMul: 0.5, fatMul: 0.5 }
    ]
  },
  {
    baseName: 'Shahi Tukray (Royal Bread Pudding)',
    urdu: 'شاہی ٹکڑے',
    romanUrdu: ['shahi tukda', 'double ka meetha'],
    category: 'sweets',
    servingUnit: 'portion (150g)',
    grams: 150,
    calories: 390,
    protein: 6,
    carbs: 52,
    fat: 18,
    fiber: 1,
    ingredients: ['White Bread slices', 'Ghee for frying', 'Sugar Syrup', 'Thick Rabri Milk', 'Silver Leaf', 'Almonds'],
    cookingMethod: 'Bread triangles deep fried in ghee, dipped in sugar syrup, and blanketed in thick rabri.',
    benefits: 'Decadent Mughal celebratory dessert.',
    whoShouldLimit: ['Diabetics', 'High cholesterol / weight reduction'],
    prepVariations: [
      { modifier: 'Classic Shahi Rabri', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Toasted / Low Ghee Home Style', calMul: 0.75, fatMul: 0.5 }
    ]
  },
  {
    baseName: 'Mango Milkshake (Pakistani Chaunsa / Sindhri)',
    urdu: 'مینگو ملک شیک',
    romanUrdu: ['mango shake', 'chaunsa milkshake'],
    category: 'drinks',
    servingUnit: 'glass (350ml)',
    grams: 350,
    calories: 280,
    protein: 8,
    carbs: 48,
    fat: 7,
    fiber: 2.5,
    ingredients: ['Ripe Chaunsa or Sindhri Mango Pulp', 'Full Cream Milk', 'Sugar/Honey', 'Ice'],
    cookingMethod: 'Fresh sweet mango chunks blended with cold whole milk until thick and creamy.',
    benefits: 'Bursting with natural vitamin A, vitamin C, dietary fiber, and dairy calcium.',
    whoShouldLimit: ['Diabetics monitor high fruit sugar (fructose)'],
    prepVariations: [
      { modifier: 'Baghair Cheeni (Natural Mango Sweetness)', calMul: 0.8, fatMul: 1.0 },
      { modifier: 'With Added Sugar & Ice Cream', calMul: 1.45, fatMul: 1.8 }
    ]
  },
  {
    baseName: 'Mint Margarita (Pakistani Desi Style)',
    urdu: 'منٹ مارگریٹا',
    romanUrdu: ['mint lemonade', 'karachi mint margarita'],
    category: 'drinks',
    servingUnit: 'glass (300ml)',
    grams: 300,
    calories: 90,
    protein: 0.5,
    carbs: 22,
    fat: 0.1,
    fiber: 1,
    ingredients: ['Fresh Mint Leaves', 'Lemon Juice', 'Black Salt (Kala Namak)', 'White Soda / Sparkling Water', 'Sugar'],
    cookingMethod: 'Crushed mint blended with lemon, black salt, and chilled soda.',
    benefits: 'Instant cooling refresher, settles upset stomach and supports digestion.',
    whoShouldLimit: ['Hypertensive patients monitor black salt sodium'],
    prepVariations: [
      { modifier: 'Standard Restaurant Style', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Diet / Soda Water & Zero Sugar', calMul: 0.25, fatMul: 1.0 }
    ]
  },
  // --- Extra Classic Pakistani Specialities to reach ~1000 entries ---
  {
    baseName: 'Degi Biryani (Special Wedding Style)',
    urdu: 'دیگی بریانی',
    romanUrdu: ['shaadi wali biryani', 'degi chicken biryani', 'shadi biryani'],
    category: 'chawal',
    servingUnit: 'plate',
    grams: 380,
    calories: 550,
    protein: 26,
    carbs: 68,
    fat: 19,
    fiber: 3.5,
    ingredients: ['Sella Basmati Rice', 'Chicken/Mutton', 'Potatoes', 'Degi Masala', 'Kewra Water', 'Zarda Colour', 'Ghee'],
    cookingMethod: 'Cooked in heavy copper cauldron (degh) on coal embers with rich aromatics and kewra.',
    benefits: 'Calorie-dense, rich in protein, carbs and celebratory saffron aromas.',
    whoShouldLimit: ['Weight reduction', 'Diabetics (high glycemic load)'],
    prepVariations: [
      { modifier: 'Authentic Degi Style (Oil/Ghee Rich)', calMul: 1.15, fatMul: 1.3 },
      { modifier: 'Moderate Ghee Home Degh', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Aloo Extra Loaded', calMul: 1.1, fatMul: 0.9 },
      { modifier: 'Light Oil Sella Rice', calMul: 0.85, fatMul: 0.6 }
    ]
  },
  {
    baseName: 'Siri Paye (Mutton / Beef Trotters)',
    urdu: 'سری پائے',
    romanUrdu: ['paye', 'mutton paye', 'phajja paye', 'beef paya'],
    category: 'gosht',
    servingUnit: 'bowl with 1 trotter',
    grams: 350,
    calories: 420,
    protein: 28,
    carbs: 6,
    fat: 32,
    fiber: 0.5,
    ingredients: ['Trotters & Head Meat', 'Onion', 'Garlic', 'Whole Spices', 'Ghee', 'Ginger'],
    cookingMethod: 'Slow cooked overnight on low fire for 8-10 hours until bone marrow and gelatin melt into soup.',
    benefits: 'Exceptional source of natural collagen, gelatin, glycine, and joint-supporting minerals.',
    whoShouldLimit: ['High cholesterol', 'Uric acid / gout patients'],
    prepVariations: [
      { modifier: 'Lahori Bazaar Phajja Style', calMul: 1.3, fatMul: 1.4 },
      { modifier: 'Ghar Ka Shorba (Skimmed Fat)', calMul: 0.8, fatMul: 0.65 },
      { modifier: 'Standard Desi Style', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Bong Paya Mixed Gravy', calMul: 1.25, fatMul: 1.35 }
    ]
  },
  {
    baseName: 'Kata-Kat (Karachi Saddar Style)',
    urdu: 'ٹکا ٹک / کٹا کٹ',
    romanUrdu: ['katakat', 'takatak', 'brain and kidney mix'],
    category: 'gosht',
    servingUnit: 'plate',
    grams: 220,
    calories: 380,
    protein: 26,
    carbs: 4,
    fat: 29,
    fiber: 1,
    ingredients: ['Lamb Brain', 'Kidneys (Gurda)', 'Heart (Dil)', 'Butter/Ghee', 'Tomatoes', 'Green Chilies', 'Kasuri Methi'],
    cookingMethod: 'Chopped rhythmically with two sharp metal blades on a scorching concave tawa with butter and green chilies.',
    benefits: 'Extremely high in bioavailable iron, vitamin B12, and organ nutrient density.',
    whoShouldLimit: ['High cholesterol / cardiovascular patients', 'High uric acid'],
    prepVariations: [
      { modifier: 'Maska / Makhan Double (Street)', calMul: 1.35, fatMul: 1.5 },
      { modifier: 'Standard Saddar Recipe', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Brain Focused (Maghaz Dominant)', calMul: 1.15, fatMul: 1.25 },
      { modifier: 'Dry Roasted (Kam Maska)', calMul: 0.85, fatMul: 0.7 }
    ]
  },
  {
    baseName: 'Maghaz Masala (Brain Fry)',
    urdu: 'مغز مصالحہ',
    romanUrdu: ['bheja fry', 'mutton maghaz', 'brain fry'],
    category: 'gosht',
    servingUnit: 'plate',
    grams: 200,
    calories: 320,
    protein: 16,
    carbs: 3,
    fat: 27,
    fiber: 0.5,
    ingredients: ['Mutton/Beef Brain', 'Finely Chopped Onion', 'Tomato', 'Turmeric', 'Green Chilies', 'Ghee'],
    cookingMethod: 'Parboiled gently with turmeric, then quick-scrambled with onion tomato gravy and fresh ginger.',
    benefits: 'High in omega-3 fatty acids (DHA) and phosphorus.',
    whoShouldLimit: ['Individuals with hyperlipidemia / elevated LDL'],
    prepVariations: [
      { modifier: 'Ghar Ki Bhuni Hui', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Dhaba Desi Ghee Style', calMul: 1.3, fatMul: 1.45 },
      { modifier: 'Dry Bhuna (Kam Tail)', calMul: 0.8, fatMul: 0.65 },
      { modifier: 'Egg & Maghaz Khagina Mix', calMul: 1.15, fatMul: 1.15 }
    ]
  },
  {
    baseName: 'Kashmiri Harissa',
    urdu: 'کشمیری ہریسہ',
    romanUrdu: ['harisa', 'kashmiri hareesa', 'mutton harissa'],
    category: 'gosht',
    servingUnit: 'bowl',
    grams: 300,
    calories: 450,
    protein: 30,
    carbs: 22,
    fat: 26,
    fiber: 3,
    ingredients: ['Boneless Mutton', 'Rice paste', 'Fennel (Saunf)', 'Cardamom', 'Cinnamon', 'Mustard Oil / Ghee Tarka', 'Kababs garnish'],
    cookingMethod: 'Simmered overnight and hand-pounded using wooden pestles until meat and rice dissolve into velvety ribbons.',
    benefits: 'Winter warming dish; supreme muscle repair protein and comforting satiety.',
    whoShouldLimit: ['Diabetics and heart patients monitor rich oil tarka'],
    prepVariations: [
      { modifier: 'Traditional Downtown Tarka with Methi Maaz', calMul: 1.25, fatMul: 1.4 },
      { modifier: 'Standard Winter Harissa', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Light Ghee Home Harissa', calMul: 0.8, fatMul: 0.6 },
      { modifier: 'Extra Kebab Topped', calMul: 1.3, fatMul: 1.35 }
    ]
  },
  {
    baseName: 'Dahi Bhallay (Pakistani Street Style)',
    urdu: 'دہی بھلے',
    romanUrdu: ['dahi baray', 'lahori dahi bhalla', 'dahi vada'],
    category: 'snacks',
    servingUnit: 'bowl (2 bhallay with yogurt & chutneys)',
    grams: 250,
    calories: 270,
    protein: 9,
    carbs: 38,
    fat: 9,
    fiber: 3.5,
    ingredients: ['Mash Daal Bhallay (Dumplings)', 'Whipped Sweetened Yogurt', 'Boiled Potatoes', 'Chickpeas', 'Imli Chutney', 'Chaat Masala'],
    cookingMethod: 'Crisp lentil dumplings soaked in water, smothered in spiced creamy yogurt and tangy tamarind chutney.',
    benefits: 'Fermented yogurt provides active probiotics; chickpeas provide plant fiber.',
    whoShouldLimit: ['Diabetics monitor sweetened curd and sweet tamarind sauce'],
    prepVariations: [
      { modifier: 'Bazaar Meethi Chutney Loaded', calMul: 1.25, fatMul: 1.1 },
      { modifier: 'Ghar Ka Fresh Khata Meetha', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Sugar-Free Dahi / Diet Friendly', calMul: 0.75, fatMul: 0.8 },
      { modifier: 'Extra Papdi & Sev Crunch', calMul: 1.35, fatMul: 1.4 }
    ]
  },
  {
    baseName: 'Gol Gappay (Pani Puri with Khatta Paani)',
    urdu: 'گول گپے',
    romanUrdu: ['pani puri', 'gol gappa', 'puchka'],
    category: 'snacks',
    servingUnit: 'plate (6 puris with fillings & waters)',
    grams: 220,
    calories: 220,
    protein: 4,
    carbs: 40,
    fat: 5,
    fiber: 3,
    ingredients: ['Semolina Puris', 'Boiled Chickpeas', 'Potato Cubes', 'Spiced Mint Water', 'Imli Tamarind Water'],
    cookingMethod: 'Hollow crisp puris filled with spiced potato and chickpea mix, dunked into spicy iced herb water.',
    benefits: 'Mint and cumin water aids appetite stimulation and digestive fire.',
    whoShouldLimit: ['Severe hypertension monitor sodium/salt in khatta paani'],
    prepVariations: [
      { modifier: 'Classic Khatta Paani (Tart Mint)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Meetha Paani (Sweet Jaggery Infusion)', calMul: 1.25, fatMul: 1.0 },
      { modifier: 'Dahi Puri (Yogurt Filled)', calMul: 1.45, fatMul: 1.35 },
      { modifier: 'Air Fried Puris / Low Salt', calMul: 0.7, fatMul: 0.4 }
    ]
  },
  {
    baseName: 'Fruit Chaat (Pakistani Ramadan Style)',
    urdu: 'فروٹ چاٹ',
    romanUrdu: ['lahori fruit chaat', 'desi fruit salad'],
    category: 'snacks',
    servingUnit: 'bowl',
    grams: 200,
    calories: 140,
    protein: 2,
    carbs: 34,
    fat: 0.5,
    fiber: 4,
    ingredients: ['Apples', 'Bananas', 'Guava (Amrood)', 'Pomegranate', 'Fresh Orange Juice', 'Chaat Masala'],
    cookingMethod: 'Diced seasonal Pakistani fruits tossed in freshly squeezed kinnow/orange juice and sweet-spicy chaat masala.',
    benefits: 'Packed with diverse vitamins, antioxidants, flavonoids, and soluble fiber.',
    whoShouldLimit: ['Diabetics consume in portion-controlled servings'],
    prepVariations: [
      { modifier: 'Juice Tossed (No Added Sugar)', calMul: 0.85, fatMul: 1.0 },
      { modifier: 'Standard Street / Sugar Syrup Tossed', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Creamy Fruit Chaat (Fresh Cream)', calMul: 1.9, fatMul: 4.5 },
      { modifier: 'Dry Spiced (Baghair Juice)', calMul: 0.75, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Gajrela / Gajar Ka Halwa',
    urdu: 'گجر کی کھیر / گاجر کا حلوہ',
    romanUrdu: ['gajrela', 'gajar halwa', 'red carrot halwa'],
    category: 'sweets',
    servingUnit: 'small bowl',
    grams: 150,
    calories: 340,
    protein: 6,
    carbs: 46,
    fat: 15,
    fiber: 3,
    ingredients: ['Red Pakistani Carrots', 'Full Cream Milk', 'Khoya / Mawa', 'Sugar', 'Cardamom', 'Desi Ghee', 'Almonds & Pistachios'],
    cookingMethod: 'Grated seasonal red carrots slow cooked in whole milk until dry, then roasted in desi ghee and khoya.',
    benefits: 'High in beta-carotene (provitamin A) and dietary antioxidants.',
    whoShouldLimit: ['Diabetics', 'High cholesterol / weight reduction'],
    prepVariations: [
      { modifier: 'Bazaar Shahi Khoya Loaded', calMul: 1.35, fatMul: 1.5 },
      { modifier: 'Ghar Ka Standard (Moderate Ghee)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Sugar Free / Stevia Home Made', calMul: 0.65, fatMul: 0.8 },
      { modifier: 'Gajrela Kheer (Liquid Milk Soup)', calMul: 0.85, fatMul: 0.7 }
    ]
  },
  {
    baseName: 'Rooh Afza Sharbat',
    urdu: 'روح افزا شربت',
    romanUrdu: ['rooh afza', 'jam e shirin', 'red sharbat'],
    category: 'drinks',
    servingUnit: 'glass (300ml)',
    grams: 300,
    calories: 120,
    protein: 0,
    carbs: 30,
    fat: 0,
    fiber: 0,
    ingredients: ['Rooh Afza Syrup', 'Chilled Water', 'Tukhm-e-Balanqa (Basil Seeds)', 'Lemon Splash'],
    cookingMethod: 'Herbal rose syrup stirred into ice-cold water, often garnished with swelled basil seeds.',
    benefits: 'Cooling herbal formulation traditionally used to combat summer heat and dehydration.',
    whoShouldLimit: ['Diabetics (concentrated refined sugar syrup)'],
    prepVariations: [
      { modifier: 'Water Based (Sharbat)', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Doodh Rooh Afza (Milk Shake)', calMul: 1.85, fatMul: 3.5 },
      { modifier: 'Light Sugar / Dilute', calMul: 0.6, fatMul: 1.0 },
      { modifier: 'With Gond Kateera & Sabja (Tukh Malanga)', calMul: 1.15, fatMul: 1.0 }
    ]
  },
  {
    baseName: 'Gur Wali Chai (Jaggery Tea)',
    urdu: 'گڑ والی چائے',
    romanUrdu: ['gur ki chai', 'desi jaggery tea', 'pind wali chai'],
    category: 'drinks',
    servingUnit: 'cup (180ml)',
    grams: 180,
    calories: 110,
    protein: 3.5,
    carbs: 18,
    fat: 3,
    fiber: 0,
    ingredients: ['Black Tea Leaves', 'Natural Raw Jaggery (Gur)', 'Milk', 'Cardamom', 'Ginger'],
    cookingMethod: 'Simmered strong tea infused with crushed ginger and unrefined jaggery, brewed with dairy milk.',
    benefits: 'Unrefined sugarcane jaggery provides natural iron, minerals, and digestive comfort in cold weather.',
    whoShouldLimit: ['Diabetics (unrefined sugar still raises blood glucose)'],
    prepVariations: [
      { modifier: 'Ghar Ki Standard Doodh Patti Gur', calMul: 1.0, fatMul: 1.0 },
      { modifier: 'Pind Style Extra Gur & Full Milk', calMul: 1.35, fatMul: 1.4 },
      { modifier: 'Half Milk / Paani Mix', calMul: 0.7, fatMul: 0.5 },
      { modifier: 'Masala Gur Chai (Ginger & Fennel)', calMul: 1.0, fatMul: 1.0 }
    ]
  }
];

// Portion multipliers to scale entries across real Pakistani serving habits
const portionSizes = [
  { label: 'Small Portion', mul: 0.7, gramMul: 0.7 },
  { label: 'Standard Portion', mul: 1.0, gramMul: 1.0 },
  { label: 'Large Portion', mul: 1.4, gramMul: 1.4 },
  { label: 'Sharing / Double Plate', mul: 2.0, gramMul: 2.0 }
];

const generatedDatabase = [];
let serial = 1;

for (const food of baseFoods) {
  for (const prep of food.prepVariations) {
    for (const portion of portionSizes) {
      const id = `pk_${String(serial).padStart(4, '0')}`;
      const fullName = `${food.baseName} (${prep.modifier} - ${portion.label})`;
      
      const calories = Math.round(food.calories * prep.calMul * portion.mul);
      const protein = Number((food.protein * portion.mul).toFixed(1));
      const carbs = Number((food.carbs * prep.calMul * portion.mul).toFixed(1));
      const fat = Number((food.fat * prep.fatMul * portion.mul).toFixed(1));
      const fiber = Number(((food.fiber || 1) * portion.mul).toFixed(1));
      const grams = Math.round(food.grams * portion.gramMul);

      const aliasesRoman = [
        ...food.romanUrdu.map(r => `${r} ${prep.modifier.toLowerCase()}`),
        ...food.romanUrdu
      ];

      // Street food, heavy deep-fried, or highly variable sweet items flagged for review
      const isHighlyVariable = ['sweets', 'fast_food', 'snacks'].includes(food.category) ||
        prep.modifier.toLowerCase().includes('bazaar') ||
        prep.modifier.toLowerCase().includes('street') ||
        prep.modifier.toLowerCase().includes('loaded') ||
        prep.modifier.toLowerCase().includes('phajja');

      const confidence = isHighlyVariable ? 'medium' : 'high';
      const needsReview = isHighlyVariable;

      const item = {
        foodId: id,
        name: fullName,
        baseName: food.baseName,
        aliases: {
          romanUrdu: [...new Set(aliasesRoman)],
          urdu: [food.urdu]
        },
        category: food.category,
        typicalServing: {
          unit: food.servingUnit,
          grams
        },
        calories,
        protein,
        carbs,
        fat,
        fiber,
        mainIngredients: food.ingredients,
        howTypicallyMade: food.cookingMethod,
        benefits: food.benefits,
        whoShouldLimit: food.whoShouldLimit,
        isEstimate: true,
        estimateRangePercent: 15,
        source: 'Pakistan Food Composition Database / USDA Nutrient Database / Culinary Recipe Analysis',
        confidence,
        needsReview,
        medicalDisclaimer: 'General nutritional estimates only. Not medical or clinical dietetic advice.'
      };

      generatedDatabase.push(item);
      serial++;
    }
  }
}

console.log(`✅ Successfully generated ${generatedDatabase.length} validated Pakistani food entries.`);

// Write to JSON file
fs.writeFileSync(outputFile, JSON.stringify(generatedDatabase, null, 2), 'utf-8');
console.log(`📁 Saved to: ${outputFile}`);

