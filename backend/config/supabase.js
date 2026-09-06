import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
export const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'gymsync-media';

let supabaseClient = null;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));
};

if (isSupabaseConfigured()) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log(`✅ Supabase Client initialized for project: ${supabaseUrl}`);
  } catch (err) {
    console.warn(`⚠️ Failed to initialize Supabase client: ${err.message}. Operating in MongoDB fallback mode.`);
    supabaseClient = null;
  }
} else {
  console.log('ℹ️ Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) not provided. Operating in MongoDB fallback mode.');
}

export const supabase = supabaseClient;

/**
 * Upload a media buffer (image/video) directly to Supabase Storage bucket.
 * Returns the public CDN URL or null if Supabase is unconfigured/fails.
 */
export const uploadToSupabaseStorage = async ({
  buffer,
  mimeType,
  originalName = 'upload',
  folder = 'posts',
  bucket = SUPABASE_STORAGE_BUCKET
}) => {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const ext = path.extname(originalName) || (mimeType.includes('png') ? '.png' : mimeType.includes('gif') ? '.gif' : mimeType.includes('mp4') ? '.mp4' : '.jpg');
    const randomHex = crypto.randomBytes(6).toString('hex');
    const fileName = `${folder}/${Date.now()}_${randomHex}${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error('[Supabase Storage Upload Error]:', error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('[Supabase Storage Error]:', err.message);
    return null;
  }
};

export default supabase;
