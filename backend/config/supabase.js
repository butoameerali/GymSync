import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import WebSocket from 'ws';

// Ensure WebSocket is available globally for Supabase in Node 20
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
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

/**
 * Delete a media file from Supabase Storage by public URL or relative path.
 * Helps prevent orphan file accumulation and protects the 1 GB quota.
 */
export const deleteFromSupabaseStorage = async ({
  fileUrlOrPath,
  bucket = SUPABASE_STORAGE_BUCKET
}) => {
  if (!isSupabaseConfigured() || !supabase || !fileUrlOrPath) {
    return false;
  }

  try {
    let storagePath = fileUrlOrPath;
    if (typeof fileUrlOrPath === 'string' && fileUrlOrPath.startsWith('http')) {
      const bucketMarker = `/${bucket}/`;
      const idx = fileUrlOrPath.indexOf(bucketMarker);
      if (idx !== -1) {
        storagePath = fileUrlOrPath.substring(idx + bucketMarker.length);
      } else {
        const parts = fileUrlOrPath.split('/');
        storagePath = parts.slice(-2).join('/');
      }
    }

    // Clean any URL query parameters if present
    storagePath = storagePath.split('?')[0];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);

    if (error) {
      console.warn('[Supabase Storage Deletion Warning]:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase Storage Deletion Error]:', err.message);
    return false;
  }
};

/**
 * Generate a short-lived direct signed upload URL from Supabase Storage.
 * Allows client browser to upload large videos directly to Supabase CDN,
 * bypassing Node.js server RAM completely.
 */
export const createDirectSignedUploadUrl = async ({
  folder = 'media',
  fileName = 'upload',
  contentType = 'image/jpeg',
  bucket = SUPABASE_STORAGE_BUCKET
}) => {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const ext = path.extname(fileName) || (contentType.includes('png') ? '.png' : contentType.includes('mp4') ? '.mp4' : '.jpg');
    const randomHex = crypto.randomBytes(6).toString('hex');
    const storagePath = `${folder}/${Date.now()}_${randomHex}${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('[Supabase createSignedUploadUrl Error]:', error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path || storagePath,
      publicUrl: publicUrlData?.publicUrl || null,
      bucket
    };
  } catch (err) {
    console.error('[Supabase Direct Signed URL Error]:', err.message);
    return null;
  }
};

export default supabase;

