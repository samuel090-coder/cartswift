-- Drop the old problematic trigger that's still causing the event_type error
DROP TRIGGER IF EXISTS update_popularity_on_purchase ON public.order_items;