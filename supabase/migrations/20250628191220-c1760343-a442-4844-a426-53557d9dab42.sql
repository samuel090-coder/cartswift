
-- Create enum for item categories
CREATE TYPE public.item_category AS ENUM ('Fashion', 'Animals', 'Tools', 'Vehicles', 'Books');

-- Create enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('cryptocurrency', 'bank_transfer', 'credit_card', 'paypal', 'gift_card', 'cash_app');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

-- Create items table
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY key,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category item_category NOT NULL,
  estimated_delivery_days INTEGER DEFAULT 7,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reactions table for item likes
CREATE TABLE public.item_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, session_id)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  email TEXT,
  full_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  delivery_instructions TEXT,
  payment_method payment_method NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_time DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin users table for authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for items (public read, admin write)
CREATE POLICY "Anyone can view items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Only admins can insert items" ON public.items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Only admins can update items" ON public.items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Only admins can delete items" ON public.items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for item reactions (public)
CREATE POLICY "Anyone can view reactions" ON public.item_reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can add reactions" ON public.item_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete their own reactions" ON public.item_reactions FOR DELETE USING (true);

-- RLS Policies for orders (public create, admin view all)
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view their own orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for order items
CREATE POLICY "Anyone can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));

-- RLS Policies for admin users
CREATE POLICY "Admins can view admin users" ON public.admin_users FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can manage admin users" ON public.admin_users FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Storage policies for item images
CREATE POLICY "Anyone can view item images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "Admins can upload item images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'item-images' AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can update item images" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'item-images' AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can delete item images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'item-images' AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_admin = true));

-- Function to handle new admin user creation
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.admin_users (user_id, is_admin)
  VALUES (NEW.id, false);
  RETURN NEW;
END;
$$;

-- Trigger for new admin users
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- Insert some sample data
INSERT INTO public.items (title, description, price, category, estimated_delivery_days, images) VALUES
('Wireless Bluetooth Headphones', 'Premium quality wireless headphones with noise cancellation', 89.99, 'Tools', 3, ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500']),
('Leather Jacket', 'Genuine leather jacket with modern design', 199.99, 'Fashion', 5, ARRAY['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500']),
('Golden Retriever Plush Toy', 'Soft and cuddly golden retriever stuffed animal', 24.99, 'Animals', 2, ARRAY['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500']),
('Electric Drill Set', 'Professional cordless drill with multiple bits', 149.99, 'Tools', 4, ARRAY['https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500']),
('Vintage Motorcycle Model', 'Detailed die-cast motorcycle collectible', 79.99, 'Vehicles', 6, ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500']),
('Programming Fundamentals Book', 'Complete guide to modern programming languages', 49.99, 'Books', 3, ARRAY['https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500']);
