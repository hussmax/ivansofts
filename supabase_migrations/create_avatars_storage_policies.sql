-- Policy for authenticated users to upload their own avatars
CREATE POLICY "Allow authenticated users to upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for authenticated users to update their own avatars
CREATE POLICY "Allow authenticated users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for all users to read avatars (if the user ID matches the folder name)
-- This allows anyone to view an avatar if they know the user ID.
CREATE POLICY "Allow all users to read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy for authenticated users to delete their own avatars
CREATE POLICY "Allow authenticated users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);