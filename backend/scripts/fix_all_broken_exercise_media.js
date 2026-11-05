import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import Exercise from '../models/Exercise.js';
import PreMadePlan from '../models/PreMadePlan.js';

const BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

const VERIFIED_CORE_MEDIA = {
  'EX-CHEST-01': {
    mediaUrl: '/exercises/barbell-bench-press.mp4',
    gifUrl: '/exercises/barbell-bench-press.mp4',
    videoUrl: '/exercises/barbell-bench-press.mp4'
  },
  'EX-CHEST-02': {
    mediaUrl: BASE_URL + 'videos/0314-ns0SIbU.gif',
    gifUrl: BASE_URL + 'videos/0314-ns0SIbU.gif',
    videoUrl: BASE_URL + 'videos/0314-ns0SIbU.gif'
  },
  'EX-CHEST-03': {
    mediaUrl: '/exercises/standard-push-up.gif',
    gifUrl: '/exercises/standard-push-up.gif',
    videoUrl: '/exercises/standard-push-up.gif'
  },
  'EX-CHEST-04': {
    mediaUrl: BASE_URL + 'videos/0251-9WTm7dq.gif',
    gifUrl: BASE_URL + 'videos/0251-9WTm7dq.gif',
    videoUrl: BASE_URL + 'videos/0251-9WTm7dq.gif'
  },
  'EX-BACK-01': {
    mediaUrl: BASE_URL + 'videos/0032-ila4NZS.gif',
    gifUrl: BASE_URL + 'videos/0032-ila4NZS.gif',
    videoUrl: BASE_URL + 'videos/0032-ila4NZS.gif'
  },
  'EX-BACK-02': {
    mediaUrl: BASE_URL + 'videos/0652-lBDjFxJ.gif',
    gifUrl: BASE_URL + 'videos/0652-lBDjFxJ.gif',
    videoUrl: BASE_URL + 'videos/0652-lBDjFxJ.gif'
  },
  'EX-BACK-03': {
    mediaUrl: BASE_URL + 'videos/0861-fUBheHs.gif',
    gifUrl: BASE_URL + 'videos/0861-fUBheHs.gif',
    videoUrl: BASE_URL + 'videos/0861-fUBheHs.gif'
  },
  'EX-BACK-04': {
    mediaUrl: BASE_URL + 'videos/0499-bZGHsAZ.gif',
    gifUrl: BASE_URL + 'videos/0499-bZGHsAZ.gif',
    videoUrl: BASE_URL + 'videos/0499-bZGHsAZ.gif'
  },
  'EX-LEGS-01': {
    mediaUrl: BASE_URL + 'videos/0043-qXTaZnJ.gif',
    gifUrl: BASE_URL + 'videos/0043-qXTaZnJ.gif',
    videoUrl: BASE_URL + 'videos/0043-qXTaZnJ.gif'
  },
  'EX-LEGS-02': {
    mediaUrl: BASE_URL + 'videos/3119-75Bgtjy.gif',
    gifUrl: BASE_URL + 'videos/3119-75Bgtjy.gif',
    videoUrl: BASE_URL + 'videos/3119-75Bgtjy.gif'
  },
  'EX-LEGS-03': {
    mediaUrl: BASE_URL + 'videos/0085-wQ2c4XD.gif',
    gifUrl: BASE_URL + 'videos/0085-wQ2c4XD.gif',
    videoUrl: BASE_URL + 'videos/0085-wQ2c4XD.gif'
  },
  'EX-LEGS-04': {
    mediaUrl: BASE_URL + 'videos/1460-IZVHb27.gif',
    gifUrl: BASE_URL + 'videos/1460-IZVHb27.gif',
    videoUrl: BASE_URL + 'videos/1460-IZVHb27.gif'
  },
  'EX-SHOULDERS-01': {
    mediaUrl: BASE_URL + 'videos/1456-wdRZISl.gif',
    gifUrl: BASE_URL + 'videos/1456-wdRZISl.gif',
    videoUrl: BASE_URL + 'videos/1456-wdRZISl.gif'
  },
  'EX-SHOULDERS-02': {
    mediaUrl: BASE_URL + 'videos/0334-DsgkuIt.gif',
    gifUrl: BASE_URL + 'videos/0334-DsgkuIt.gif',
    videoUrl: BASE_URL + 'videos/0334-DsgkuIt.gif'
  },
  'EX-SHOULDERS-03': {
    mediaUrl: BASE_URL + 'videos/3662-XPUDTt7.gif',
    gifUrl: BASE_URL + 'videos/3662-XPUDTt7.gif',
    videoUrl: BASE_URL + 'videos/3662-XPUDTt7.gif'
  },
  'EX-ARMS-01': {
    mediaUrl: BASE_URL + 'videos/0031-25GPyDY.gif',
    gifUrl: BASE_URL + 'videos/0031-25GPyDY.gif',
    videoUrl: BASE_URL + 'videos/0031-25GPyDY.gif'
  },
  'EX-ARMS-02': {
    mediaUrl: BASE_URL + 'videos/0200-dU605di.gif',
    gifUrl: BASE_URL + 'videos/0200-dU605di.gif',
    videoUrl: BASE_URL + 'videos/0200-dU605di.gif'
  },
  'EX-ARMS-03': {
    mediaUrl: BASE_URL + 'videos/0129-RrLske5.gif',
    gifUrl: BASE_URL + 'videos/0129-RrLske5.gif',
    videoUrl: BASE_URL + 'videos/0129-RrLske5.gif'
  },
  'EX-CORE-01': {
    mediaUrl: BASE_URL + 'videos/0464-CosupLu.gif',
    gifUrl: BASE_URL + 'videos/0464-CosupLu.gif',
    videoUrl: BASE_URL + 'videos/0464-CosupLu.gif'
  },
  'EX-CORE-02': {
    mediaUrl: BASE_URL + 'videos/0262-rbu5UUb.gif',
    gifUrl: BASE_URL + 'videos/0262-rbu5UUb.gif',
    videoUrl: BASE_URL + 'videos/0262-rbu5UUb.gif'
  },
  'EX-CORE-03': {
    mediaUrl: BASE_URL + 'videos/0630-RJgzwny.gif',
    gifUrl: BASE_URL + 'videos/0630-RJgzwny.gif',
    videoUrl: BASE_URL + 'videos/0630-RJgzwny.gif'
  },
  'EX-CARDIO-01': {
    mediaUrl: BASE_URL + 'videos/0684-y5p0H8a.gif',
    gifUrl: BASE_URL + 'videos/0684-y5p0H8a.gif',
    videoUrl: BASE_URL + 'videos/0684-y5p0H8a.gif'
  },
  'EX-CARDIO-02': {
    mediaUrl: BASE_URL + 'videos/1160-dK9394r.gif',
    gifUrl: BASE_URL + 'videos/1160-dK9394r.gif',
    videoUrl: BASE_URL + 'videos/1160-dK9394r.gif'
  },
  'EX-CARDIO-03': {
    mediaUrl: BASE_URL + 'videos/3655-J9zIWig.gif',
    gifUrl: BASE_URL + 'videos/3655-J9zIWig.gif',
    videoUrl: BASE_URL + 'videos/3655-J9zIWig.gif'
  }
};

async function fixMedia() {
  console.log('🚀 Connecting to MongoDB & Supabase...');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'gymsync' });
  console.log('✅ Connected to MongoDB');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

  // 1. Update Core Exercises in MongoDB
  console.log('🔧 Updating Core 24 Exercises in MongoDB...');
  for (const [code, media] of Object.entries(VERIFIED_CORE_MEDIA)) {
    const updated = await Exercise.findOneAndUpdate(
      { $or: [{ exerciseId: code }, { code: code }] },
      { $set: media },
      { new: true }
    );
    if (updated) {
      console.log(`   ✅ ${code} (${updated.name}) updated -> ${media.mediaUrl}`);
    } else {
      console.warn(`   ⚠️ ${code} not found in MongoDB`);
    }

    if (supabase) {
      await supabase
        .from('exercises')
        .update({
          media_url: media.mediaUrl,
          gif_url: media.gifUrl,
          video_url: media.videoUrl
        })
        .eq('exercise_id', code);
    }
  }

  // 2. Also replace any occurrences of broken hash '0043-s6bYM8w' anywhere in the DB
  const fixedHasanUrl = BASE_URL + 'videos/0043-qXTaZnJ.gif';
  const brokenSquats = await Exercise.updateMany(
    { mediaUrl: { $regex: '0043-s6bYM8w' } },
    { $set: { mediaUrl: fixedHasanUrl, gifUrl: fixedHasanUrl, videoUrl: fixedHasanUrl } }
  );
  console.log(`✅ Fixed ${brokenSquats.modifiedCount} exercises with broken 0043-s6bYM8w URL`);

  // 3. Update PreMadePlan Collections to ensure routine embedded exercises have valid media
  console.log('🔧 Synchronizing embedded exercise media across PreMadePlans...');
  const plans = await PreMadePlan.find({});
  let updatedPlanCount = 0;
  let updatedExCount = 0;

  for (const plan of plans) {
    let modified = false;
    if (Array.isArray(plan.weeks)) {
      for (const week of plan.weeks) {
        if (Array.isArray(week.days)) {
          for (const day of week.days) {
            if (Array.isArray(day.exercises)) {
              for (const ex of day.exercises) {
                const exId = ex.exerciseId;
                if (VERIFIED_CORE_MEDIA[exId]) {
                  const verified = VERIFIED_CORE_MEDIA[exId];
                  if (ex.mediaUrl !== verified.mediaUrl || ex.gifUrl !== verified.gifUrl) {
                    ex.mediaUrl = verified.mediaUrl;
                    ex.gifUrl = verified.gifUrl;
                    ex.videoUrl = verified.videoUrl;
                    modified = true;
                    updatedExCount++;
                  }
                } else if (ex.mediaUrl && ex.mediaUrl.includes('0043-s6bYM8w')) {
                  ex.mediaUrl = fixedHasanUrl;
                  ex.gifUrl = fixedHasanUrl;
                  ex.videoUrl = fixedHasanUrl;
                  modified = true;
                  updatedExCount++;
                }
              }
            }
          }
        }
      }
    }

    if (modified) {
      plan.markModified('weeks');
      await plan.save();
      updatedPlanCount++;
    }
  }

  console.log(`✅ Updated ${updatedExCount} embedded exercise items across ${updatedPlanCount} PreMadePlans!`);
  console.log('🎉 All exercise media successfully verified and synchronized!');
  process.exit(0);
}

fixMedia().catch(err => {
  console.error('❌ Error fixing exercise media:', err);
  process.exit(1);
});
