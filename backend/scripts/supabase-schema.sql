-- ==============================================================================
-- GymSync Supabase PostgreSQL Schema
-- Hybrid Architecture: Heavy content, social feed, exercises & progress in Supabase
-- Core security & authentication (passwords, tokens, roles) in MongoDB
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER PROFILES TABLE (Heavy User Profile, Bio & Goals)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,          -- Links to MongoDB User _id or username
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'User',
    profile_pic TEXT DEFAULT '',
    bio_data JSONB DEFAULT '{}'::jsonb,    -- Height, Weight, Fitness Goals, Calibration, Health Bio
    stats JSONB DEFAULT '{"points": 0, "streak": 0}'::jsonb,
    friends TEXT[] DEFAULT ARRAY[]::TEXT[],
    followers TEXT[] DEFAULT ARRAY[]::TEXT[],
    following TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);

-- 3. POSTS TABLE (Community Timeline, Posts, Likes & Comments)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT,                         -- Optional reference to MongoDB _id
    author_id TEXT NOT NULL,               -- MongoDB User _id
    author_name TEXT NOT NULL,
    author_role TEXT DEFAULT 'User',
    content TEXT NOT NULL,
    media_url TEXT DEFAULT '',             -- Supabase Storage Public CDN URL
    likes TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Array of usernames / user IDs who liked
    comments JSONB DEFAULT '[]'::jsonb,    -- Array of comment objects with replies
    reported_by JSONB DEFAULT '[]'::jsonb,
    report_count INTEGER DEFAULT 0,
    approval_status TEXT DEFAULT 'published',
    comment_restriction TEXT DEFAULT 'SubscribersOnly',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_name ON public.posts (author_name);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- 4. EXERCISES TABLE (Comprehensive Exercise Library & AI Models)
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id TEXT NOT NULL UNIQUE,      -- Standardized exercise identifier (e.g. EX-PUSHUP)
    name TEXT NOT NULL,
    target_muscles TEXT[] DEFAULT ARRAY[]::TEXT[],
    equipment_required TEXT DEFAULT 'Bodyweight',
    difficulty TEXT DEFAULT 'Beginner',
    fitness_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    medical_avoid_if TEXT[] DEFAULT ARRAY[]::TEXT[],
    joint_pain_avoid_if TEXT[] DEFAULT ARRAY[]::TEXT[],
    media_url TEXT DEFAULT '',             -- Video/GIF demo URL
    description TEXT DEFAULT '',
    is_ai_trackable BOOLEAN DEFAULT false,
    ai_detection JSONB DEFAULT '{"enabled": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises (name);
CREATE INDEX IF NOT EXISTS idx_exercises_exercise_id ON public.exercises (exercise_id);

-- 5. USER EXERCISE RECORDS TABLE (Individual Exercise Workout Logs & AI Detections)
CREATE TABLE IF NOT EXISTS public.user_exercise_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,                 -- MongoDB user _id or userKey
    exercise_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    day_number INTEGER DEFAULT 1,
    plan_id TEXT,
    reps_completed INTEGER DEFAULT 0,
    target_reps INTEGER DEFAULT 10,
    points_earned INTEGER DEFAULT 1,
    mode TEXT DEFAULT 'manual',            -- 'manual' | 'ai'
    ai_confidence NUMERIC DEFAULT 0.85,
    ai_result JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_exercise_records_user_id ON public.user_exercise_records (user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_records_completed_at ON public.user_exercise_records (completed_at DESC);

-- 6. USER WORKOUT PROGRESS TABLE (Plan Days Completed & Streaks)
CREATE TABLE IF NOT EXISTS public.user_workout_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    plan_id TEXT,
    completed_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    last_workout_completion_time TIMESTAMPTZ,
    streak INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_workout_progress_user_id ON public.user_workout_progress (user_id);

-- 7. STORAGE BUCKET CONFIGURATION FOR MEDIA (POSTS, AVATARS, EXERCISES)
-- Attempt to create the public storage bucket if storage extension is present
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('gymsync-media', 'gymsync-media', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Storage bucket setup notice: %', SQLERRM;
END $$;

-- STORAGE POLICIES: Allow public read access to media
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Access on gymsync-media" ON storage.objects;
    CREATE POLICY "Public Read Access on gymsync-media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'gymsync-media');

    DROP POLICY IF EXISTS "Allow Upload Access on gymsync-media" ON storage.objects;
    CREATE POLICY "Allow Upload Access on gymsync-media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'gymsync-media');

    DROP POLICY IF EXISTS "Allow Delete Access on gymsync-media" ON storage.objects;
    CREATE POLICY "Allow Delete Access on gymsync-media"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'gymsync-media');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Storage policy notice: %', SQLERRM;
END $$;

-- Schema setup completed successfully.
