-- Create push_subscriptions table for browser push
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for campaigns
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  icon_emoji TEXT DEFAULT '🔔',
  link_url TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual, new_product, flash_sale, order_update
  trigger_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sent, cancelled
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_sent INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_settings table for auto-trigger config
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create in_app_notifications for user-specific notifications
CREATE TABLE public.in_app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_emoji TEXT DEFAULT '🔔',
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Anyone can subscribe to push notifications"
ON public.push_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own subscriptions"
ON public.push_subscriptions FOR SELECT USING (
  session_id = COALESCE(current_setting('app.session_id', true), '')
);

CREATE POLICY "Users can delete their own subscriptions"
ON public.push_subscriptions FOR DELETE USING (
  session_id = COALESCE(current_setting('app.session_id', true), '')
);

CREATE POLICY "Admins can view all subscriptions"
ON public.push_subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true)
);

-- RLS policies for notifications
CREATE POLICY "Admins can manage notifications"
ON public.notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Anyone can view sent notifications"
ON public.notifications FOR SELECT USING (status = 'sent');

-- RLS policies for notification_settings
CREATE POLICY "Admins can manage notification settings"
ON public.notification_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Anyone can view notification settings"
ON public.notification_settings FOR SELECT USING (true);

-- RLS policies for in_app_notifications
CREATE POLICY "Users can view their notifications"
ON public.in_app_notifications FOR SELECT USING (
  session_id = COALESCE(current_setting('app.session_id', true), '') OR session_id IS NULL
);

CREATE POLICY "Users can update their notifications"
ON public.in_app_notifications FOR UPDATE USING (
  session_id = COALESCE(current_setting('app.session_id', true), '') OR session_id IS NULL
);

CREATE POLICY "Admins can manage all in_app_notifications"
ON public.in_app_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_admin = true)
);

CREATE POLICY "System can insert in_app_notifications"
ON public.in_app_notifications FOR INSERT WITH CHECK (true);

-- Insert default notification settings
INSERT INTO public.notification_settings (setting_key, setting_value, is_enabled) VALUES
('new_product', '{"title_template": "🆕 New Product Alert!", "body_template": "Check out our new {{product_name}}!"}', false),
('flash_sale', '{"title_template": "🔥 Flash Sale Started!", "body_template": "{{product_name}} is now {{discount}}% off!"}', false),
('order_update', '{"title_template": "📦 Order Update", "body_template": "Your order #{{order_id}} is now {{status}}"}', true);