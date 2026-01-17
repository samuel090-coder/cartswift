-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update their own status media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own status media" ON storage.objects;

-- Create more flexible policies using the first folder as user_id
CREATE POLICY "Users can update their own status media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own status media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'status-media' AND (storage.foldername(name))[1] = auth.uid()::text);