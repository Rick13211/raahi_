-- ─── Dashboard Reports Table ─────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS dashboard_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dashboard_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all reports
CREATE POLICY "Anyone can read dashboard_reports"
  ON dashboard_reports
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own reports
CREATE POLICY "Users can insert own dashboard_reports"
  ON dashboard_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for filtering
CREATE INDEX idx_dashboard_reports_city ON dashboard_reports (city);
CREATE INDEX idx_dashboard_reports_state ON dashboard_reports (state);
CREATE INDEX idx_dashboard_reports_user_id ON dashboard_reports (user_id);

-- ─── Storage Bucket for Report Images ────────────────────────────────────────
-- NOTE: You need to create a storage bucket named "report-images" in the
-- Supabase dashboard (Storage → New Bucket → name: "report-images" → Public)
-- Then add this policy in SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow uploads by authenticated users
CREATE POLICY "Authenticated users can upload report images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'report-images'
    AND auth.role() = 'authenticated'
  );

-- Allow public reads
CREATE POLICY "Public access to report images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'report-images');
