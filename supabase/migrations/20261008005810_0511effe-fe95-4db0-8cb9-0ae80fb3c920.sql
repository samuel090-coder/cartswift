ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Backfill usernames from the email local-part, keeping them unique
WITH base AS (
  SELECT id,
         lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9._-]', '', 'g')) AS local_part
  FROM public.profiles
  WHERE email IS NOT NULL
),
numbered AS (
  SELECT id,
         CASE WHEN local_part = '' THEN 'user' ELSE local_part END AS local_part,
         ROW_NUMBER() OVER (PARTITION BY CASE WHEN local_part = '' THEN 'user' ELSE local_part END ORDER BY id) AS rn
  FROM base
)
UPDATE public.profiles p
SET username = CASE WHEN n.rn = 1 THEN n.local_part ELSE n.local_part || n.rn::text END
FROM numbered n
WHERE p.id = n.id AND p.username IS NULL;

-- Fallback for any profile without an email
UPDATE public.profiles
SET username = 'user' || substr(id::text, 1, 6)
WHERE username IS NULL;

ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);

-- Auto-assign username for new profiles
CREATE OR REPLACE FUNCTION public.assign_profile_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  i int := 0;
BEGIN
  IF NEW.username IS NOT NULL AND NEW.username <> '' THEN
    RETURN NEW;
  END IF;
  base := lower(regexp_replace(split_part(coalesce(NEW.email, ''), '@', 1), '[^a-z0-9._-]', '', 'g'));
  IF base = '' THEN
    base := 'user' || substr(NEW.id::text, 1, 6);
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate AND id <> NEW.id) LOOP
    i := i + 1;
    candidate := base || i::text;
  END LOOP;
  NEW.username := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_profile_username_trigger ON public.profiles;
CREATE TRIGGER assign_profile_username_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_profile_username();