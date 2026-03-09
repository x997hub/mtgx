-- Create venue-images storage bucket (public for read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated venue owners/admins to upload photos
CREATE POLICY "venue_images_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'venue-images'
  AND EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id::text = (storage.foldername(name))[1]
    AND (venues.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  )
);

-- Allow public read access to venue images
CREATE POLICY "venue_images_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'venue-images');

-- Allow venue owners/admins to delete photos
CREATE POLICY "venue_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'venue-images'
  AND EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id::text = (storage.foldername(name))[1]
    AND (venues.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  )
);
