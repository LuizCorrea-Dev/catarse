-- ==============================================================================
-- 1. ENABLE REALTIME PUBLICATION (SAFE MODE)
-- ==============================================================================
DO $$
BEGIN
  -- 1. POSTS
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;

  -- 2. COMMENTS
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  END IF;

  -- 3. LIKES
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE likes;
  END IF;

  -- 4. PRIVATE MESSAGES
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'private_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
  END IF;

  -- 5. CHANNEL MESSAGES
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'channel_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE channel_messages;
  END IF;

  -- 6. ATRIO ITEMS (Novo)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'atrio_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE atrio_items;
  END IF;
  
  -- 7. PROFILES (Para saldo em tempo real)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;

-- ==============================================================================
-- 2. ADD COUNTER COLUMNS
-- ==============================================================================
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.atrio_items ADD COLUMN IF NOT EXISTS vibes_count INTEGER DEFAULT 0;

-- Backfill counts
UPDATE public.posts 
SET likes_count = (SELECT COUNT(*) FROM public.likes WHERE public.likes.post_id = public.posts.id),
    comments_count = (SELECT COUNT(*) FROM public.comments WHERE public.comments.post_id = public.posts.id);

UPDATE public.comments
SET likes_count = (SELECT COUNT(*) FROM public.likes WHERE public.likes.comment_id = public.comments.id);

-- ==============================================================================
-- 3. TRIGGERS FOR POST/COMMENT COUNTERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    END IF;
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE public.comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
DROP TRIGGER IF EXISTS on_comment_change ON public.comments;

CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

CREATE TRIGGER on_comment_change
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- ==============================================================================
-- 4. MISSING FUNCTIONS FOR ATRIO
-- ==============================================================================

CREATE OR REPLACE FUNCTION increment_atrio_vibes(item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.atrio_items
  SET vibes_count = vibes_count + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
