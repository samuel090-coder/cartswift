-- Add star_rating and discount_percentage columns to items table
ALTER TABLE public.items 
ADD COLUMN star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
ADD COLUMN discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100);