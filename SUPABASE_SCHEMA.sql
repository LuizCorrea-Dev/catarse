
-- ==============================================================================
-- ⚠️ SCRIPT DE CORREÇÃO E INICIALIZAÇÃO DO BANCO DE DADOS (CATARSE)
-- ==============================================================================

-- 1. LIMPEZA DE CONFLITOS
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.transfer_vibe(uuid, integer, uuid, uuid);
DROP FUNCTION IF EXISTS public.mine_vibe();
DROP FUNCTION IF EXISTS public.refund_vibe(uuid, integer);
DROP FUNCTION IF EXISTS public.follow_user(uuid);
DROP FUNCTION IF EXISTS public.unfollow_user(uuid);
DROP FUNCTION IF EXISTS public.request_friendship(uuid);
DROP FUNCTION IF EXISTS public.accept_friendship(uuid);
DROP FUNCTION IF EXISTS public.update_channel_activity() CASCADE;

-- 2. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 3. CRIAÇÃO DAS TABELAS
-- ==============================================================================

-- 3.1 PERFIS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  status TEXT DEFAULT 'Em busca de equilíbrio.',
  phone TEXT,
  country_code TEXT,
  is_suspended BOOLEAN DEFAULT false,
  vibes INTEGER DEFAULT 10 CHECK (vibes >= 0),
  last_username_change TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.2 POSTS
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  tags TEXT[] DEFAULT '{}',
  type TEXT DEFAULT 'post', 
  community_id UUID,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.3 COMENTÁRIOS
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.4 LIKES
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT likes_unique_post UNIQUE(user_id, post_id),
  CONSTRAINT likes_unique_comment UNIQUE(user_id, comment_id),
  CONSTRAINT check_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- 3.5 COMUNIDADES
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  privacy TEXT DEFAULT 'PUBLIC',
  tags TEXT[] DEFAULT '{}',
  welcome_message TEXT,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.6 MEMBROS DA COMUNIDADE
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'MEMBER', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(community_id, user_id)
);

-- 3.7 CANAIS
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, 
  is_private BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.8 MENSAGENS DE CANAL
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  type TEXT DEFAULT 'text',
  vibes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.9 LEITURA DE CANAIS
CREATE TABLE IF NOT EXISTS public.user_channel_reads (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, channel_id)
);

-- 3.10 ÁTRIO (Itens)
CREATE TABLE IF NOT EXISTS public.atrio_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  color TEXT DEFAULT 'bg-emerald-500',
  vibes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.11 ÁTRIO (Listas)
CREATE TABLE IF NOT EXISTS public.atrio_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.12 RELAÇÃO LISTA <-> ITEM
CREATE TABLE IF NOT EXISTS public.atrio_list_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES public.atrio_lists(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.atrio_items(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(list_id, item_id)
);

-- 3.13 SEGUIDORES (Followers) - Unidirecional (Assinatura de Conteúdo)
-- Substitui a antiga 'connections' para o conceito de seguir
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  followed_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(follower_id, followed_id)
);

-- 3.14 AMIZADES (Friendships) - Bidirecional (Conexão e Chat)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  is_close_friend_requester BOOLEAN DEFAULT false, 
  is_close_friend_receiver BOOLEAN DEFAULT false, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(requester_id, receiver_id)
);

-- Removendo a tabela antiga se existir
DROP TABLE IF EXISTS public.connections; 

-- 3.15 MENSAGENS PRIVADAS
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'text',
  media_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 4. STORAGE CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Media Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Media Upload Authenticated" ON storage.objects;

CREATE POLICY "Media Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'media' );
CREATE POLICY "Media Upload Authenticated" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'media' AND auth.role() = 'authenticated' );

-- ==============================================================================
-- 5. FUNÇÕES DE NEGÓCIO (RPCs)
-- ==============================================================================

CREATE OR REPLACE FUNCTION mine_vibe() RETURNS JSON AS $$
DECLARE
    user_id UUID := auth.uid();
    current_balance INTEGER;
BEGIN
    UPDATE profiles SET vibes = vibes + 1 WHERE id = user_id RETURNING vibes INTO current_balance;
    RETURN json_build_object('success', true, 'new_balance', current_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transfer_vibe(
    recipient_id UUID,
    amount INTEGER DEFAULT 1,
    post_id UUID DEFAULT NULL,
    comment_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    sender_id UUID := auth.uid();
    sender_balance INTEGER;
    sender_new_balance INTEGER;
BEGIN
    SELECT vibes INTO sender_balance FROM profiles WHERE id = sender_id;
    
    IF sender_balance < amount THEN
        RETURN json_build_object('success', false, 'message', 'Saldo insuficiente de Vibes.');
    END IF;

    IF post_id IS NOT NULL THEN
       IF EXISTS (SELECT 1 FROM likes WHERE user_id = sender_id AND likes.post_id = transfer_vibe.post_id) THEN
          RETURN json_build_object('success', false, 'message', 'Já curtiu este post.');
       END IF;
    END IF;

    IF comment_id IS NOT NULL THEN
       IF EXISTS (SELECT 1 FROM likes WHERE user_id = sender_id AND likes.comment_id = transfer_vibe.comment_id) THEN
          RETURN json_build_object('success', false, 'message', 'Já curtiu este comentário.');
       END IF;
    END IF;

    UPDATE profiles SET vibes = vibes - amount WHERE id = sender_id RETURNING vibes INTO sender_new_balance;
    UPDATE profiles SET vibes = vibes + amount WHERE id = recipient_id;
    
    IF post_id IS NOT NULL OR comment_id IS NOT NULL THEN
        INSERT INTO likes (user_id, post_id, comment_id) 
        VALUES (sender_id, post_id, comment_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN json_build_object('success', true, 'new_balance', sender_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refund_vibe(target_id UUID, amount INTEGER) RETURNS JSON AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    UPDATE profiles SET vibes = vibes + amount WHERE id = auth.uid() RETURNING vibes INTO new_balance;
    UPDATE profiles SET vibes = vibes - amount WHERE id = target_id;
    RETURN json_build_object('success', true, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNÇÃO: SEGUIR USUÁRIO (Follow - Unidirecional - Custa 1 Vibe)
CREATE OR REPLACE FUNCTION follow_user(target_id UUID) RETURNS JSON AS $$
DECLARE
    sender_id UUID := auth.uid();
    sender_balance INTEGER;
    sender_new_balance INTEGER;
BEGIN
    IF sender_id = target_id THEN
        RETURN json_build_object('success', false, 'message', 'Você não pode seguir a si mesmo.');
    END IF;

    IF EXISTS (SELECT 1 FROM followers WHERE follower_id = sender_id AND followed_id = target_id) THEN
        RETURN json_build_object('success', false, 'message', 'Você já segue este usuário.');
    END IF;

    SELECT vibes INTO sender_balance FROM profiles WHERE id = sender_id;
    IF sender_balance < 1 THEN
        RETURN json_build_object('success', false, 'message', 'Saldo insuficiente de Vibes.');
    END IF;

    UPDATE profiles SET vibes = vibes - 1 WHERE id = sender_id RETURNING vibes INTO sender_new_balance;
    UPDATE profiles SET vibes = vibes + 1 WHERE id = target_id;

    INSERT INTO followers (follower_id, followed_id) VALUES (sender_id, target_id);

    RETURN json_build_object('success', true, 'new_balance', sender_new_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNÇÃO: DEIXAR DE SEGUIR (Unfollow - Reembolsa 1 Vibe)
CREATE OR REPLACE FUNCTION unfollow_user(target_id UUID) RETURNS JSON AS $$
DECLARE
    sender_id UUID := auth.uid();
    sender_new_balance INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM followers WHERE follower_id = sender_id AND followed_id = target_id) THEN
        RETURN json_build_object('success', false, 'message', 'Você não segue este usuário.');
    END IF;

    DELETE FROM followers WHERE follower_id = sender_id AND followed_id = target_id;

    UPDATE profiles SET vibes = vibes + 1 WHERE id = sender_id RETURNING vibes INTO sender_new_balance;
    UPDATE profiles SET vibes = vibes - 1 WHERE id = target_id;

    RETURN json_build_object('success', true, 'new_balance', sender_new_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNÇÃO: SOLICITAR AMIZADE
CREATE OR REPLACE FUNCTION request_friendship(target_id UUID) RETURNS JSON AS $$
DECLARE
    sender_id UUID := auth.uid();
BEGIN
    IF sender_id = target_id THEN
        RETURN json_build_object('success', false, 'message', 'Auto-amizade não permitida.');
    END IF;

    -- Verifica se já existe relação em qualquer direção
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE (requester_id = sender_id AND receiver_id = target_id) 
           OR (requester_id = target_id AND receiver_id = sender_id)
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Solicitação já enviada ou amizade existente.');
    END IF;

    INSERT INTO friendships (requester_id, receiver_id, status) VALUES (sender_id, target_id, 'pending');

    RETURN json_build_object('success', true, 'message', 'Solicitação enviada.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, vibes, last_username_change)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    10,
    NOW() -- Define data inicial para contar os 30 dias se quiser trocar logo de cara, ou NULL se quiser permitir troca inicial
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_channel_activity()
RETURNS trigger AS $$
BEGIN
  UPDATE public.channels 
  SET last_activity_at = NOW() 
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_channel_message_sent ON public.channel_messages;
CREATE TRIGGER on_channel_message_sent
  AFTER INSERT ON public.channel_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_channel_activity();
