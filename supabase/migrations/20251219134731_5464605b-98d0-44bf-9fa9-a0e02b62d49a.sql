-- Drop the problematic trigger on order_items that references non-existent event_type field
DROP TRIGGER IF EXISTS update_order_items_popularity ON public.order_items;

-- Create a corrected trigger function specifically for order_items
CREATE OR REPLACE FUNCTION public.update_item_popularity_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update popularity data for purchases
  INSERT INTO public.item_popularity (item_id, purchase_count, trending_score, last_updated)
  VALUES (
    NEW.item_id,
    COALESCE(NEW.quantity, 1),
    COALESCE(NEW.quantity, 1) * 5,
    now()
  )
  ON CONFLICT (item_id) DO UPDATE SET
    purchase_count = item_popularity.purchase_count + COALESCE(NEW.quantity, 1),
    trending_score = (
      item_popularity.view_count * 1 +
      item_popularity.share_count * 3 +
      item_popularity.wishlist_count * 2 +
      (item_popularity.purchase_count + COALESCE(NEW.quantity, 1)) * 5
    ),
    last_updated = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the corrected trigger
CREATE TRIGGER update_order_items_popularity
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_item_popularity_on_purchase();