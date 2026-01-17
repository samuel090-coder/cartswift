-- Create user_notifications table for comprehensive in-app notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'follow', 'status_view', 'status_reaction', 'earnings', 'system', 'promo'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_emoji TEXT DEFAULT '🔔',
  link_url TEXT,
  related_user_id UUID, -- Who triggered the notification
  related_status_id UUID,
  related_item_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.user_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON public.user_notifications(user_id, is_read);
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(user_id, created_at DESC);

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_icon_emoji TEXT DEFAULT '🔔',
  p_link_url TEXT DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL,
  p_related_status_id UUID DEFAULT NULL,
  p_related_item_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.user_notifications (
    user_id, type, title, body, icon_emoji, link_url, 
    related_user_id, related_status_id, related_item_id
  )
  VALUES (
    p_user_id, p_type, p_title, p_body, p_icon_emoji, p_link_url,
    p_related_user_id, p_related_status_id, p_related_item_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create trigger to notify on new follower
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- Get follower's name
  SELECT COALESCE(full_name, 'Someone') INTO v_follower_name
  FROM public.profiles WHERE id = NEW.follower_id;
  
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

CREATE TRIGGER trigger_notify_new_follower
AFTER INSERT ON public.user_followers
FOR EACH ROW
EXECUTE FUNCTION notify_new_follower();

-- Create trigger to notify on status reaction
CREATE OR REPLACE FUNCTION notify_status_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_owner_id UUID;
  v_reactor_name TEXT;
BEGIN
  -- Get status owner
  SELECT user_id INTO v_status_owner_id
  FROM public.user_statuses WHERE id = NEW.status_id;
  
  -- Don't notify if reacting to own status
  IF v_status_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get reactor's name
  SELECT COALESCE(full_name, 'Someone') INTO v_reactor_name
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Create notification
  PERFORM create_notification(
    v_status_owner_id,
    'status_reaction',
    NEW.reaction_type || ' Reaction!',
    v_reactor_name || ' reacted to your status',
    NEW.reaction_type,
    '/profile',
    NEW.user_id,
    NEW.status_id,
    NULL
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_status_reaction
AFTER INSERT ON public.status_reactions
FOR EACH ROW
EXECUTE FUNCTION notify_status_reaction();

-- Create trigger to notify on status earnings
CREATE OR REPLACE FUNCTION notify_status_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notification for earnings
  PERFORM create_notification(
    NEW.user_id,
    'earnings',
    '💰 You earned $' || ROUND(NEW.amount::numeric, 3)::text || '!',
    CASE 
      WHEN NEW.earning_type = 'view' THEN 'Someone viewed your status'
      WHEN NEW.earning_type = 'reaction' THEN 'Someone reacted to your status'
      ELSE 'Status earnings'
    END,
    '💰',
    '/profile',
    NEW.from_user_id,
    NEW.status_id,
    NULL
  );
  
  RETURN NEW;
END;
$$;

-- Only create earnings notifications for significant amounts (bundle them)
-- We'll skip individual notifications for now to avoid spam