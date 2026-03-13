-- =============================================
-- VENUE ENHANCEMENTS: logo, contacts, directions
-- =============================================

-- 1. Add logo and description
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Add structured contact fields
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS google_business_url TEXT;

-- 3. Add "how to find" fields
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS directions_description TEXT,
  ADD COLUMN IF NOT EXISTS nearby_landmarks TEXT;

-- 4. Add category to venue_photos (gallery vs location/entrance)
ALTER TABLE public.venue_photos
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'gallery';
