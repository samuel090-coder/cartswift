
-- Create the payment-proofs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true);

-- Create policy to allow public access to view files
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-proofs');

-- Create policy to allow anyone to upload files
CREATE POLICY "Anyone can upload payment proofs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

-- Create policy to allow anyone to update files
CREATE POLICY "Anyone can update payment proofs" ON storage.objects
FOR UPDATE USING (bucket_id = 'payment-proofs');

-- Create policy to allow anyone to delete files
CREATE POLICY "Anyone can delete payment proofs" ON storage.objects
FOR DELETE USING (bucket_id = 'payment-proofs');
