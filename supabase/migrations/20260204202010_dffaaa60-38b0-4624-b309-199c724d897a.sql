-- Allow authenticated users to upload to media-files bucket (for profile pictures)
CREATE POLICY "Authenticated users can upload media files" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'media-files');

-- Allow users to update their own media files
CREATE POLICY "Users can update their own media files" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'media-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own media files  
CREATE POLICY "Users can delete their own media files"
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'media-files' AND auth.uid()::text = (storage.foldername(name))[1]);