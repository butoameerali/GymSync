-- ==============================================================================
-- GymSync Supabase RLS (Row Level Security) Migration
-- Resolves Supabase Database Linter Warning: rls_disabled_in_public (lint=0013)
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all 5 public tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exercise_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_progress ENABLE ROW LEVEL SECURITY;

-- 2. Exercises Table Policy:
-- Allow public read-only access (anyone can browse the exercise database)
DROP POLICY IF EXISTS "Allow Public Read on Exercises" ON public.exercises;
CREATE POLICY "Allow Public Read on Exercises"
ON public.exercises FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Posts Table Policy:
-- Allow public read access only to published community posts
DROP POLICY IF EXISTS "Allow Public Read on Published Posts" ON public.posts;
CREATE POLICY "Allow Public Read on Published Posts"
ON public.posts FOR SELECT
TO anon, authenticated
USING (approval_status = 'published');

-- 4. User Profiles, Exercise Records, and Workout Progress:
-- By enabling RLS without anon SELECT/INSERT/UPDATE policies, direct external PostgREST
-- access is blocked (default deny). The GymSync Node.js backend connects using
-- SUPABASE_SECRET_KEY (service_role), which automatically bypasses RLS with full CRUD access.

-- 5. Storage Objects Hardening:
-- Resolves Supabase Database Linter Warning: public_bucket_allows_listing
-- When a bucket is configured as public (public = true), public object URLs remain accessible
-- directly without needing a SELECT policy on storage.objects.
-- Removing the SELECT policy on storage.objects prevents unauthorized anonymous listing of the bucket.
-- Dropping permissive INSERT/DELETE policies ensures only the backend (service_role) can upload/remove assets.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Access on gymsync-media" ON storage.objects;
    DROP POLICY IF EXISTS "Allow Upload Access on gymsync-media" ON storage.objects;
    DROP POLICY IF EXISTS "Allow Delete Access on gymsync-media" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Storage policy cleanup notice: %', SQLERRM;
END $$;

