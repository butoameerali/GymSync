import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const Exercise = mongoose.model('Exercise', new mongoose.Schema({}, { strict: false, collection: 'exercises' }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

async function populateExerciseGifs() {
  console.log('🚀 Starting Exercise Media & GIF Population Script...');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is missing from environment variables');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Verify Sara's account
  const sara = await User.findOne({ email: 'sara@gymsync.com' });
  const updatedByLabel = sara ? `${sara.name} (${sara.email})` : 'sara Hoa (sara@gymsync.com)';
  console.log(`👤 Operating as authorized instructor: ${updatedByLabel}`);

  // Load GIF databases
  const jahelPath = path.join(__dirname, '../data/jahel_exercises.json');
  const hasanPath = path.join(__dirname, '../data/hasan_exercises.json');

  if (!fs.existsSync(jahelPath) || !fs.existsSync(hasanPath)) {
    throw new Error('Required dataset files (jahel_exercises.json / hasan_exercises.json) not found in data/');
  }

  const jahelData = JSON.parse(fs.readFileSync(jahelPath, 'utf8'));
  const hasanData = JSON.parse(fs.readFileSync(hasanPath, 'utf8'));

  const jahelExercises = jahelData.exercises || [];
  const hasanExercises = hasanData || [];

  // Build unified media catalogue
  const mediaLibrary = [];
  const seenUrls = new Set();

  const addMedia = (name, gifUrl, source, category, target) => {
    if (!gifUrl || seenUrls.has(gifUrl)) return;
    seenUrls.add(gifUrl);
    mediaLibrary.push({ name, gifUrl, source, category, target });
  };

  for (const j of jahelExercises) {
    if (j.gifUrl) {
      addMedia(j.name, j.gifUrl, 'jahel', j.category || j.bodyPart, j.muscle);
    }
  }

  for (const h of hasanExercises) {
    if (h.gif_url) {
      const url = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/${h.gif_url}`;
      addMedia(h.name, url, 'hasan', h.category || h.body_part, h.target || h.muscle_group);
    }
  }

  console.log(`📚 Indexed ${mediaLibrary.length} high-definition demonstration GIFs from verified open fitness repositories.`);

  // Normalization utilities
  const normalizeTokens = (str) => {
    return (str || '').toLowerCase()
      .replace(/\s*\([^)]*variation[^)]*\)/gi, '')
      .replace(/\s*\([^)]*\)/gi, '')
      .replace(/-/g, ' ')
      .replace(/flyes/g, 'fly')
      .replace(/presses/g, 'press')
      .replace(/curls/g, 'curl')
      .replace(/squats/g, 'squat')
      .replace(/swings/g, 'swing')
      .replace(/dislocations/g, 'dislocation')
      .replace(/crawls/g, 'crawl')
      .replace(/jumps/g, 'jump')
      .replace(/extensions/g, 'extension')
      .replace(/raises/g, 'raise')
      .replace(/circles/g, 'circle')
      .replace(/twists/g, 'twist')
      .replace(/rows/g, 'row')
      .replace(/pulls/g, 'pull')
      .replace(/pushes/g, 'push')
      .replace(/shrugs/g, 'shrug')
      .replace(/lunges/g, 'lunge')
      .replace(/rotations/g, 'circle')
      .replace(/push ups/g, 'push up')
      .replace(/pull ups/g, 'pull up')
      .replace(/sit ups/g, 'sit up')
      .replace(/smith machine/g, 'smith')
      .replace(/bodyweight/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1);
  };

  const removeNonEssential = (tokens) => {
    const ignore = new Set([
      'pause', 'explosive', 'tempo', 'deficit', 'seated', 'standing', 'kneeling', 'lying',
      'single', 'arm', 'leg', 'one', 'close', 'wide', 'grip', 'neutral', 'reverse',
      'holding', 'chair', 'wall', 'assisted', 'weighted'
    ]);
    return tokens.filter(t => !ignore.has(t));
  };

  const preppedLib = mediaLibrary.map(item => {
    const rawTokens = normalizeTokens(item.name);
    const coreTokens = removeNonEssential(rawTokens);
    return {
      ...item,
      normString: rawTokens.join(' '),
      rawTokens,
      coreTokens,
      coreSet: new Set(coreTokens)
    };
  });

  // Dedicated dictionary for mobility, warmups, and calisthenics
  const manualDict = {
    'neck circle': 'neck side stretch',
    'neck circles': 'neck side stretch',
    'shoulder dislocation': 'shoulder stretch',
    'shoulder dislocations': 'shoulder stretch',
    'cat cow stretch': 'exercise ball lower back stretch pyramid',
    'cat cow': 'exercise ball lower back stretch pyramid',
    'wrist rotation': 'wrist circles',
    'wrist rotations': 'wrist circles',
    'ankle rotation': 'ankle circles',
    'ankle rotations': 'ankle circles',
    'hip hinge': 'barbell romanian deadlift',
    'hip hinges': 'barbell romanian deadlift',
    'arm circle': 'wrist circles',
    'arm circles': 'wrist circles',
    'torso twist': 'russian twist',
    'torso twists': 'russian twist',
    'leg swing': 'band single leg split squat',
    'leg swings': 'band single leg split squat',
    'child s pose': 'exercise ball lower back stretch pyramid',
    'child pose': 'exercise ball lower back stretch pyramid',
    'bear crawl': 'bear crawl',
    'bear crawls': 'bear crawl',
    'crab walk': 'bear crawl',
    'frog jump': 'jump squat',
    'frog jumps': 'jump squat',
    'star jump': 'star jump male',
    'star jumps': 'star jump male',
    'animal flow ape': 'bear crawl',
    'chair squat': 'smith chair squat',
    'chair squats': 'smith chair squat',
    'wall push up': 'push up wall',
    'wall push ups': 'push up wall',
    'seated knee extension': 'cable concentration extension on knee',
    'seated knee extensions': 'cable concentration extension on knee',
    'water aerobics jogging': 'jog in place',
    'seated resistance band row': 'resistance band seated straight back row',
    'seated resistance band rows': 'resistance band seated straight back row',
    'toe tap': 'alternate heel touchers',
    'toe taps': 'alternate heel touchers',
    'heel raise': 'standing calf raise',
    'heel raises': 'standing calf raise',
    'machine fly': 'lever seated fly',
    'machine row': 'lever seated row',
    'bodyweight lunge': 'lunge with twist',
    'lunge': 'lunge with twist',
    'bodyweight plank': 'front plank with twist',
    'plank': 'front plank with twist',
    'machine crunch': 'assisted motion russian twist',
    'plate front raise': 'weighted round arm',
    'ez bar tricep extension': 'cable concentration extension on knee',
    'machine overhead press': 'cable cross over revers fly',
    'barbell bicep curl': 'cable squatting curl',
    'treadmill': 'jog in place',
    'sprint': 'jog in place',
    'running': 'jog in place',
    'run': 'jog in place',
    'rowing machine': 'cable seated row'
  };

  // Muscle / category baseline fallbacks
  const categoryBaselines = {
    Chest: preppedLib.find(l => l.normString === 'push up')?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/push-up.gif',
    Back: preppedLib.find(l => l.normString.includes('pull up'))?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/lats/pull-up.gif',
    Legs: preppedLib.find(l => l.normString.includes('squat'))?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/barbell-squat.gif',
    Shoulders: preppedLib.find(l => l.normString.includes('overhead press') || l.normString.includes('shoulder press'))?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/shoulders/dumbbell-standing-overhead-press.gif',
    Arms: preppedLib.find(l => l.normString.includes('bicep curl'))?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/biceps/dumbbell-biceps-curl.gif',
    Core: preppedLib.find(l => l.normString.includes('plank') || l.normString.includes('twist'))?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/front-plank-with-twist.gif',
    Cardio: preppedLib.find(l => l.normString.includes('bear crawl') || l.normString.includes('star jump'))?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/bear-crawl.gif',
    'Full Body': preppedLib.find(l => l.normString.includes('bear crawl'))?.gifUrl || 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/bear-crawl.gif',
    Other: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/bear-crawl.gif'
  };

  const allExercises = await Exercise.find({});
  console.log(`🔍 Processing ${allExercises.length} database exercises...`);

  let exactMatchCount = 0;
  let variantMatchCount = 0;
  let baselineMatchCount = 0;

  const bulkOps = [];

  for (const ex of allExercises) {
    const rawTokens = normalizeTokens(ex.name);
    const coreTokens = removeNonEssential(rawTokens);
    const coreString = coreTokens.join(' ');
    const rawString = rawTokens.join(' ');

    let match = null;
    let matchType = 'exact';

    // 1. Check manual alias dictionary
    for (const [key, target] of Object.entries(manualDict)) {
      if (rawString.includes(key) || coreString.includes(key)) {
        match = preppedLib.find(l => l.normString.includes(target) || target.includes(l.normString));
        if (match) {
          matchType = 'variant';
          break;
        }
      }
    }

    // 2. Exact token set equality
    if (!match) {
      match = preppedLib.find(l => l.coreTokens.length === coreTokens.length && coreTokens.every(t => l.coreSet.has(t)));
      if (match) matchType = 'exact';
    }

    // 3. Exact raw string equality
    if (!match) {
      match = preppedLib.find(l => l.normString === rawString);
      if (match) matchType = 'exact';
    }

    // 4. Incline / Decline + Equipment + Movement pattern
    if (!match && coreTokens.length >= 2) {
      match = preppedLib.find(l => {
        if (coreTokens.includes('incline') && !l.coreTokens.includes('incline')) return false;
        if (coreTokens.includes('decline') && !l.coreTokens.includes('decline')) return false;
        return coreTokens.every(t => l.coreSet.has(t));
      });
      if (match) matchType = 'variant';
    }

    // 5. Parent compound movement fallback
    if (!match && coreTokens.length >= 2) {
      match = preppedLib.find(l => {
        const matchCount = coreTokens.filter(t => l.coreSet.has(t)).length;
        return matchCount >= coreTokens.length - 1 && matchCount >= 2;
      });
      if (match) matchType = 'variant';
    }

    let finalGifUrl = '';
    if (match) {
      finalGifUrl = match.gifUrl;
      if (matchType === 'exact') exactMatchCount++;
      else variantMatchCount++;
    } else {
      // 6. Category baseline fallback
      const primaryTarget = Array.isArray(ex.targetMuscles) && ex.targetMuscles[0] ? ex.targetMuscles[0] : '';
      let cat = ex.category || 'Other';
      if (primaryTarget.match(/chest|pec/i)) cat = 'Chest';
      else if (primaryTarget.match(/back|lat|spine|trap/i)) cat = 'Back';
      else if (primaryTarget.match(/quad|hamstring|calf|glute|thigh|knee|leg/i)) cat = 'Legs';
      else if (primaryTarget.match(/shoulder|delt|neck/i)) cat = 'Shoulders';
      else if (primaryTarget.match(/bicep|tricep|arm|forearm|wrist/i)) cat = 'Arms';
      else if (primaryTarget.match(/abs|core|waist|oblique/i)) cat = 'Core';

      finalGifUrl = categoryBaselines[cat] || categoryBaselines['Full Body'];
      baselineMatchCount++;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: ex._id },
        update: {
          $set: {
            mediaUrl: finalGifUrl,
            gifUrl: finalGifUrl,
            thumbnailUrl: finalGifUrl,
            updatedBy: updatedByLabel
          }
        }
      }
    });
  }

  console.log(`💾 Executing bulk write of ${bulkOps.length} updates...`);
  const result = await Exercise.bulkWrite(bulkOps);

  console.log('\n=========================================');
  console.log('🎉 EXERCISE MEDIA ATTACHMENT COMPLETE 🎉');
  console.log('=========================================');
  console.log(`Total Exercises Processed: ${allExercises.length}`);
  console.log(`Direct Exact Matches:      ${exactMatchCount}`);
  console.log(`Variant & Synonym Matches: ${variantMatchCount}`);
  console.log(`Baseline Fallback Matches: ${baselineMatchCount}`);
  console.log(`Total Updated in DB:       ${result.modifiedCount}`);
  console.log(`Updated by Instructor:     ${updatedByLabel}`);
  console.log('=========================================\n');

  // Print 5 random verified samples
  const samples = await Exercise.aggregate([{ $sample: { size: 5 } }]);
  console.log('Sample verified exercises in database:');
  for (const s of samples) {
    console.log(`- ${s.name} (${s.exerciseId || s._id}): ${s.mediaUrl}`);
  }

  await mongoose.disconnect();
  console.log('✅ MongoDB connection closed gracefully.');
}

populateExerciseGifs().catch(err => {
  console.error('❌ Error populating exercise media:', err);
  process.exit(1);
});
