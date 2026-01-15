-- Add product linking and music support to user_statuses
ALTER TABLE public.user_statuses 
ADD COLUMN IF NOT EXISTS linked_product_id UUID REFERENCES public.seller_products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS music_url TEXT,
ADD COLUMN IF NOT EXISTS music_title TEXT,
ADD COLUMN IF NOT EXISTS music_artist TEXT,
ADD COLUMN IF NOT EXISTS stickers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS call_to_action TEXT DEFAULT 'Buy Now',
ADD COLUMN IF NOT EXISTS cta_link TEXT;

-- Create a table for music/sound library
CREATE TABLE IF NOT EXISTS public.status_music_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  audio_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration_seconds INTEGER,
  genre TEXT,
  is_trending BOOLEAN DEFAULT false,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for sticker packs
CREATE TABLE IF NOT EXISTS public.status_sticker_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for individual stickers
CREATE TABLE IF NOT EXISTS public.status_stickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID REFERENCES public.status_sticker_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  emoji_code TEXT,
  is_animated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for status purchases (when someone buys from a status)
CREATE TABLE IF NOT EXISTS public.status_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.user_statuses(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  product_id UUID,
  item_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on new tables
ALTER TABLE public.status_music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_purchases ENABLE ROW LEVEL SECURITY;

-- Public read access for music library (anyone can browse music)
CREATE POLICY "Anyone can view music library" ON public.status_music_library
  FOR SELECT USING (true);

-- Public read access for sticker packs
CREATE POLICY "Anyone can view sticker packs" ON public.status_sticker_packs
  FOR SELECT USING (true);

-- Public read access for stickers
CREATE POLICY "Anyone can view stickers" ON public.status_stickers
  FOR SELECT USING (true);

-- Status purchases policies
CREATE POLICY "Users can view their own purchases" ON public.status_purchases
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create purchases" ON public.status_purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update their sale status" ON public.status_purchases
  FOR UPDATE USING (auth.uid() = seller_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_status_purchases_status_id ON public.status_purchases(status_id);
CREATE INDEX IF NOT EXISTS idx_status_purchases_buyer_id ON public.status_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_status_purchases_seller_id ON public.status_purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_user_statuses_linked_product ON public.user_statuses(linked_product_id);
CREATE INDEX IF NOT EXISTS idx_user_statuses_linked_item ON public.user_statuses(linked_item_id);

-- Insert some sample music for the library
INSERT INTO public.status_music_library (title, artist, audio_url, genre, is_trending) VALUES
  ('Upbeat Energy', 'Status Beats', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'Pop', true),
  ('Chill Vibes', 'Relaxation Station', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'Lo-Fi', true),
  ('Party Mode', 'DJ Status', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'Electronic', false),
  ('Feel Good', 'Happy Tunes', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'Indie', true),
  ('Motivation', 'Power Up', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'Hip Hop', false),
  ('Sunset Dreams', 'Ambient Flow', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'Ambient', false)
ON CONFLICT DO NOTHING;

-- Insert sample sticker pack
INSERT INTO public.status_sticker_packs (name, description, is_premium) VALUES
  ('Essential Emojis', 'Basic emoji stickers for everyday use', false),
  ('Shop & Sell', 'Perfect stickers for product promotion', false),
  ('Celebrations', 'Party and celebration stickers', false),
  ('Premium Gold', 'Exclusive animated gold stickers', true)
ON CONFLICT DO NOTHING;