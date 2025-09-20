-- Add foreign key constraints for proper relations
ALTER TABLE public.flash_sales ADD CONSTRAINT fk_flash_sales_item_id 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE public.item_popularity ADD CONSTRAINT fk_item_popularity_item_id 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE public.collection_items ADD CONSTRAINT fk_collection_items_collection_id 
FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;

ALTER TABLE public.collection_items ADD CONSTRAINT fk_collection_items_item_id 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE public.wishlists ADD CONSTRAINT fk_wishlists_item_id 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ADD CONSTRAINT fk_reviews_item_id 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

ALTER TABLE public.social_shares ADD CONSTRAINT fk_social_shares_item_id 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;