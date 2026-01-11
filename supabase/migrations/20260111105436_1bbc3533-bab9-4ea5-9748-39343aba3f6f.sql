-- Create wallets table for users
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  bonus_balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deposit requests table
CREATE TABLE public.deposit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create status view earnings table for tracking payments per view
CREATE TABLE public.status_view_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.user_statuses(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0.50,
  credited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (EXISTS (
  SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.is_admin = true
));

CREATE POLICY "Admins can update all wallets"
ON public.wallets FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.is_admin = true
));

-- Enable RLS on deposit_requests
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deposit requests"
ON public.deposit_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposit requests"
ON public.deposit_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposit requests"
ON public.deposit_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.is_admin = true
));

CREATE POLICY "Admins can update all deposit requests"
ON public.deposit_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid() AND admin_users.is_admin = true
));

-- Enable RLS on status_view_earnings
ALTER TABLE public.status_view_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own earnings"
ON public.status_view_earnings FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "System can insert earnings"
ON public.status_view_earnings FOR INSERT
WITH CHECK (true);

-- Add unique constraint to prevent duplicate view earnings
ALTER TABLE public.status_view_earnings ADD CONSTRAINT unique_status_viewer UNIQUE (status_id, viewer_id);