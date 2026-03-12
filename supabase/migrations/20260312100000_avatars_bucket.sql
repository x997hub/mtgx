-- Create avatars storage bucket (public for read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
-- Path convention: <user_id>/<uuid>.<ext>
CREATE POLICY "avatars_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all avatars
CREATE POLICY "avatars_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "avatars_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "avatars_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
