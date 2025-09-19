-- Fix the update_item_popularity function to set proper search_path
CREATE OR REPLACE FUNCTION public.update_item_popularity()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert or update popularity data
  INSERT INTO public.item_popularity (item_id, view_count, share_count, wishlist_count, purchase_count, trending_score, last_updated)
  VALUES (
    COALESCE(NEW.item_id, OLD.item_id),
    CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE(NEW.quantity, 0) ELSE 0 END,
    0, -- Will be calculated in update
    now()
  )
  ON CONFLICT (item_id) DO UPDATE SET
    view_count = item_popularity.view_count + CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END,
    share_count = item_popularity.share_count + CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END,
    wishlist_count = item_popularity.wishlist_count + CASE 
      WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 
      WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'DELETE' THEN -1 
      ELSE 0 END,
    purchase_count = item_popularity.purchase_count + CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE(NEW.quantity, 0) ELSE 0 END,
    trending_score = (
      (item_popularity.view_count + CASE WHEN TG_TABLE_NAME = 'share_analytics' AND NEW.event_type = 'view' THEN 1 ELSE 0 END) * 1 +
      (item_popularity.share_count + CASE WHEN TG_TABLE_NAME = 'social_shares' THEN 1 ELSE 0 END) * 3 +
      (item_popularity.wishlist_count + CASE 
        WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'INSERT' THEN 1 
        WHEN TG_TABLE_NAME = 'wishlists' AND TG_OP = 'DELETE' THEN -1 
        ELSE 0 END) * 2 +
      (item_popularity.purchase_count + CASE WHEN TG_TABLE_NAME = 'order_items' THEN COALESCE(NEW.quantity, 0) ELSE 0 END) * 5
    ),
    last_updated = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;