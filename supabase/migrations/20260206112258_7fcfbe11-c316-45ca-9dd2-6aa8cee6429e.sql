-- Fix the notify_new_follower function to handle missing profiles
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- Get follower's name, with proper fallback if profile doesn't exist
  SELECT COALESCE(full_name, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE id = NEW.follower_id;
  
  -- If no profile found at all, use default
  IF v_follower_name IS NULL THEN
    v_follower_name := 'Someone';
  END IF;
  
  -- Create notification for the followed user
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    '👤 New Follower!',
    v_follower_name || ' started following you',
    '👤',
    '/profile/' || NEW.follower_id,
    NEW.follower_id,
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$;

-- Also fix notify_new_status function with same safety
CREATE OR REPLACE FUNCTION public.notify_new_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_follower_record RECORD;
BEGIN
  -- Get the status owner's name with proper fallback
  SELECT COALESCE(full_name, 'Someone') INTO v_user_name
  FROM public.profiles WHERE id = NEW.user_id;
  
  IF v_user_name IS NULL THEN
    v_user_name := 'Someone';
  END IF;
  
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
$$;