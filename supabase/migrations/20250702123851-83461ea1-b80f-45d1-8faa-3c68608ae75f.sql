-- Add star_rating and discount_percentage columns to items table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'star_rating') THEN
        ALTER TABLE public.items ADD COLUMN star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'discount_percentage') THEN
        ALTER TABLE public.items ADD COLUMN discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
    END IF;
END $$;

-- Create payment-proofs storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for payment-proofs bucket
CREATE POLICY "Anyone can upload payment proofs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone can view payment proofs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Admins can delete payment proofs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'payment-proofs');