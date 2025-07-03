-- Enable realtime for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Create admin_notifications table to track notification status
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  admin_user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin notifications
CREATE POLICY "Admins can view their own notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_admin = true AND user_id = admin_user_id
  )
);

CREATE POLICY "Admins can update their own notifications" 
ON public.admin_notifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_admin = true AND user_id = admin_user_id
  )
);

CREATE POLICY "System can insert admin notifications" 
ON public.admin_notifications 
FOR INSERT 
WITH CHECK (true);

-- Function to create notifications for all admins when new order is placed
CREATE OR REPLACE FUNCTION public.create_admin_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for each admin user
  INSERT INTO public.admin_notifications (order_id, admin_user_id)
  SELECT NEW.id, admin_users.user_id
  FROM public.admin_users
  WHERE admin_users.is_admin = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new orders
CREATE TRIGGER create_admin_notifications_trigger
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_admin_notifications();