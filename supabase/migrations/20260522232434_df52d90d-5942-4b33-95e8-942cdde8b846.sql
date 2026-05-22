
-- AI support settings (singleton)
CREATE TABLE public.ai_support_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  ai_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ai_support_settings (id, ai_enabled) VALUES (true, true);
ALTER TABLE public.ai_support_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai support settings"
ON public.ai_support_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update ai support settings"
ON public.ai_support_settings FOR UPDATE
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- Per-user support chat
CREATE TABLE public.support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_user int NOT NULL DEFAULT 0,
  unread_admin int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own support chat"
ON public.support_chats FOR SELECT
USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Users create own support chat"
ON public.support_chats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins update support chat"
ON public.support_chats FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','ai','admin')),
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_messages_chat ON public.support_messages(chat_id, created_at);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see support messages"
ON public.support_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_chats c
    WHERE c.id = chat_id AND (c.user_id = auth.uid() OR public.is_admin_user(auth.uid()))
  )
);

CREATE POLICY "Participants insert support messages"
ON public.support_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_chats c
    WHERE c.id = chat_id AND (
      (sender = 'user' AND c.user_id = auth.uid()) OR
      (sender IN ('admin','ai') AND public.is_admin_user(auth.uid()))
    )
  )
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_support_settings;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_chats REPLICA IDENTITY FULL;
