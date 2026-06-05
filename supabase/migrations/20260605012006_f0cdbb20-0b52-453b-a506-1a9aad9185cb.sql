CREATE POLICY "Allowed admins can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'item-images'
  AND public.is_allowed_admin((auth.jwt() ->> 'email'))
);

CREATE POLICY "Allowed admins can update item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'item-images'
  AND public.is_allowed_admin((auth.jwt() ->> 'email'))
);

CREATE POLICY "Allowed admins can delete item images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'item-images'
  AND public.is_allowed_admin((auth.jwt() ->> 'email'))
);