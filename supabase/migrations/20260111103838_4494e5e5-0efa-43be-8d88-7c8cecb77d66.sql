-- Create user_statuses table for WhatsApp/Instagram-like stories
CREATE TABLE public.user_statuses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video', 'voice')),
    content_url TEXT,
    text_content TEXT,
    background_color TEXT DEFAULT '#FF69B4',
    caption TEXT,
    visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'selected', 'except')),
    visible_to UUID[] DEFAULT '{}',
    hidden_from UUID[] DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create status_views table to track who viewed a status
CREATE TABLE public.status_views (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    status_id UUID NOT NULL REFERENCES public.user_statuses(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reacted_with TEXT,
    UNIQUE(status_id, viewer_id)
);

-- Create status_reactions table for quick replies/reactions
CREATE TABLE public.status_reactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    status_id UUID NOT NULL REFERENCES public.user_statuses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add followers count to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Create followers table
CREATE TABLE public.user_followers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_statuses
CREATE POLICY "Users can create their own statuses" ON public.user_statuses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view non-expired statuses" ON public.user_statuses
    FOR SELECT USING (
        expires_at > now() AND (
            user_id = auth.uid() OR
            visibility = 'all' OR
            (visibility = 'selected' AND auth.uid() = ANY(visible_to)) OR
            (visibility = 'except' AND NOT (auth.uid() = ANY(hidden_from)))
        )
    );

CREATE POLICY "Users can delete their own statuses" ON public.user_statuses
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for status_views
CREATE POLICY "Users can record their views" ON public.status_views
    FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Status owners can view who viewed" ON public.status_views
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_statuses WHERE id = status_id AND user_id = auth.uid())
        OR viewer_id = auth.uid()
    );

-- RLS Policies for status_reactions
CREATE POLICY "Users can add reactions" ON public.status_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view reactions on their statuses" ON public.status_reactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_statuses WHERE id = status_id AND user_id = auth.uid())
        OR user_id = auth.uid()
    );

-- RLS Policies for user_followers
CREATE POLICY "Anyone can view followers" ON public.user_followers
    FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.user_followers
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.user_followers
    FOR DELETE USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX idx_user_statuses_user_id ON public.user_statuses(user_id);
CREATE INDEX idx_user_statuses_expires_at ON public.user_statuses(expires_at);
CREATE INDEX idx_status_views_status_id ON public.status_views(status_id);
CREATE INDEX idx_user_followers_following ON public.user_followers(following_id);
CREATE INDEX idx_user_followers_follower ON public.user_followers(follower_id);