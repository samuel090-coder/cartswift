-- Create function to notify followers when a new status is uploaded
CREATE OR REPLACE FUNCTION public.notify_new_status()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_follower_record RECORD;
BEGIN
  -- Get the status owner's name
  SELECT COALESCE(full_name, 'Someone') INTO v_user_name
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify all followers about the new status
  FOR v_follower_record IN 
    SELECT follower_id FROM public.user_followers WHERE following_id = NEW.user_id
  LOOP
    PERFORM create_notification(
      v_follower_record.follower_id,
      'status_view',
      '📸 New Status!',
      v_user_name || ' posted a new status',
      '📸',
      '/profile/' || NEW.user_id,
      NEW.user_id,
      NEW.id,
      NULL
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new status notifications
DROP TRIGGER IF EXISTS trigger_notify_new_status ON public.user_statuses;
CREATE TRIGGER trigger_notify_new_status
  AFTER INSERT ON public.user_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_status();

-- Ensure user_statuses can be viewed by followers (update the policy to be more reliable)
DROP POLICY IF EXISTS "Users can view their own statuses or if following" ON public.user_statuses;
CREATE POLICY "Users can view statuses from users they follow or their own"
  ON public.user_statuses
  FOR SELECT
  USING (
    expires_at > now() 
    AND (
      user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.user_followers 
        WHERE user_followers.follower_id = auth.uid() 
        AND user_followers.following_id = user_statuses.user_id
      )
    )
  );

-- Add policy to allow viewing expired statuses for the owner
CREATE POLICY "Users can view all their own statuses including expired"
  ON public.user_statuses
  FOR SELECT
  USING (user_id = auth.uid());

-- Ensure follow functionality works properly - update policies
DROP POLICY IF EXISTS "Users can follow others" ON public.user_followers;
CREATE POLICY "Authenticated users can follow others"
  ON public.user_followers
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id AND auth.uid() != following_id);

-- Add a policy to prevent duplicate follows
CREATE OR REPLACE FUNCTION public.check_not_already_following()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_followers 
    WHERE follower_id = NEW.follower_id AND following_id = NEW.following_id
  ) THEN
    RAISE EXCEPTION 'Already following this user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS prevent_duplicate_follow ON public.user_followers;
CREATE TRIGGER prevent_duplicate_follow
  BEFORE INSERT ON public.user_followers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_not_already_following();

-- Update profile follower counts on follow/unfollow
CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment followers count for the followed user
    UPDATE public.profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE id = NEW.following_id;
    -- Increment following count for the follower
    UPDATE public.profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement followers count for the unfollowed user
    UPDATE public.profiles SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) WHERE id = OLD.following_id;
    -- Decrement following count for the unfollower
    UPDATE public.profiles SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_follower_counts_trigger ON public.user_followers;
CREATE TRIGGER update_follower_counts_trigger
  AFTER INSERT OR DELETE ON public.user_followers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follower_counts();