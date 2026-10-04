-- ==========================================================
-- Migration: 003_create_media_assets.sql
-- Description: Creates persistent media_assets table and private source-videos storage bucket with strict RLS
-- ==========================================================

-- 1. Create media_assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'input' CHECK (category IN ('input', 'output_video', 'voiceover', 'subtitles', 'other')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_user_category ON public.media_assets(user_id, category);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON public.media_assets(user_id, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Users can insert own media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Users can update own media assets" ON public.media_assets;
DROP POLICY IF EXISTS "Users can delete own media assets" ON public.media_assets;

-- 4. Strict RLS Policies for media_assets
CREATE POLICY "Users can view own media assets"
    ON public.media_assets
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media assets"
    ON public.media_assets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media assets"
    ON public.media_assets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media assets"
    ON public.media_assets
    FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER trigger_media_assets_updated_at
    BEFORE UPDATE ON public.media_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Private Supabase Storage bucket for source videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('source-videos', 'source-videos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 7. Strict Storage RLS Policies for source-videos bucket
-- Path format: {user_id}/{unique_filename}
DROP POLICY IF EXISTS "Users can view own source videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own source videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own source videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own source videos" ON storage.objects;

CREATE POLICY "Users can view own source videos"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'source-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own source videos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'source-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own source videos"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'source-videos' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'source-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own source videos"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'source-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
