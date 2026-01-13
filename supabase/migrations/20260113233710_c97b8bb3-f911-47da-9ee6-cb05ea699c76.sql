-- Create status-media storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('status-media', 'status-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for status-media bucket
CREATE POLICY "Authenticated users can upload status media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view status media"
ON storage.objects FOR SELECT
USING (bucket_id = 'status-media');

CREATE POLICY "Users can delete their own status media"
ON storage.objects FOR DELETE
USING (bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow updating user_statuses for view count
CREATE POLICY "Users can update view count on statuses"
ON public.user_statuses FOR UPDATE
USING (true)
WITH CHECK (true);

-- Update user_statuses RLS to only allow followers to view (except owner)
DROP POLICY IF EXISTS "Users can view non-expired statuses" ON public.user_statuses;

CREATE POLICY "Users can view their own statuses or if following"
ON public.user_statuses FOR SELECT
USING (
  (expires_at > now()) AND (
    -- Owner can always see their statuses
    (user_id = auth.uid()) OR
    -- Followers can see statuses
    (EXISTS (
      SELECT 1 FROM user_followers
      WHERE user_followers.follower_id = auth.uid()
      AND user_followers.following_id = user_statuses.user_id
    ))
  )
);

-- Function to update follower counts
CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE profiles SET followers_count = COALESCE(followers_count, 0) + 1
    WHERE id = NEW.following_id;
    -- Increment following count for the follower
    UPDATE profiles SET following_count = COALESCE(following_count, 0) + 1
    WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE profiles SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
    WHERE id = OLD.following_id;
    -- Decrement following count for the unfollower
    UPDATE profiles SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
    WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for follower counts
DROP TRIGGER IF EXISTS update_follower_counts_trigger ON public.user_followers;
CREATE TRIGGER update_follower_counts_trigger
AFTER INSERT OR DELETE ON public.user_followers
FOR EACH ROW
EXECUTE FUNCTION public.update_follower_counts();