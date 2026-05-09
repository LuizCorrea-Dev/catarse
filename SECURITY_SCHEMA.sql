-- ==============================================================================
-- ⚠️ SCRIPT DE SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- Execute este script no SQL Editor do Supabase após criar as tabelas.
-- ==============================================================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_channel_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atrio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atrio_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atrio_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS BÁSICAS (LEITURA PÚBLICA, ESCRITA/EDIÇÃO PARA O PRÓPRIO USUÁRIO)

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- POSTS
DROP POLICY IF EXISTS "Public posts are viewable by everyone." ON public.posts;
CREATE POLICY "Public posts are viewable by everyone." ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create posts." ON public.posts;
CREATE POLICY "Users can create posts." ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own posts." ON public.posts;
CREATE POLICY "Users can update own posts." ON public.posts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own posts." ON public.posts;
CREATE POLICY "Users can delete own posts." ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS
DROP POLICY IF EXISTS "Public comments are viewable by everyone." ON public.comments;
CREATE POLICY "Public comments are viewable by everyone." ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create comments." ON public.comments;
CREATE POLICY "Users can create comments." ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own comments." ON public.comments;
CREATE POLICY "Users can update own comments." ON public.comments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own comments." ON public.comments;
CREATE POLICY "Users can delete own comments." ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- LIKES
DROP POLICY IF EXISTS "Public likes are viewable by everyone." ON public.likes;
CREATE POLICY "Public likes are viewable by everyone." ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own likes." ON public.likes;
CREATE POLICY "Users can insert own likes." ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own likes." ON public.likes;
CREATE POLICY "Users can delete own likes." ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- COMMUNITIES
DROP POLICY IF EXISTS "Public communities are viewable by everyone." ON public.communities;
CREATE POLICY "Public communities are viewable by everyone." ON public.communities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create communities." ON public.communities;
CREATE POLICY "Users can create communities." ON public.communities FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can update their communities." ON public.communities;
CREATE POLICY "Owners can update their communities." ON public.communities FOR UPDATE USING (auth.uid() = owner_id);

-- COMMUNITY MEMBERS
DROP POLICY IF EXISTS "Public community members are viewable by everyone." ON public.community_members;
CREATE POLICY "Public community members are viewable by everyone." ON public.community_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can join communities." ON public.community_members;
CREATE POLICY "Users can join communities." ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CHANNELS & CHANNEL MESSAGES
DROP POLICY IF EXISTS "Channels are viewable by everyone." ON public.channels;
CREATE POLICY "Channels are viewable by everyone." ON public.channels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Messages are viewable by everyone." ON public.channel_messages;
CREATE POLICY "Messages are viewable by everyone." ON public.channel_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can send messages." ON public.channel_messages;
CREATE POLICY "Users can send messages." ON public.channel_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ATRIO
DROP POLICY IF EXISTS "Atrio items are viewable by everyone." ON public.atrio_items;
CREATE POLICY "Atrio items are viewable by everyone." ON public.atrio_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create atrio items." ON public.atrio_items;
CREATE POLICY "Users can create atrio items." ON public.atrio_items FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FOLLOWERS & FRIENDSHIPS
DROP POLICY IF EXISTS "Followers are viewable by everyone." ON public.followers;
CREATE POLICY "Followers are viewable by everyone." ON public.followers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Friendships are viewable by everyone." ON public.friendships;
CREATE POLICY "Friendships are viewable by everyone." ON public.friendships FOR SELECT USING (true);

-- PRIVATE MESSAGES (RESTRICTED)
DROP POLICY IF EXISTS "Users can view their own private messages." ON public.private_messages;
CREATE POLICY "Users can view their own private messages." ON public.private_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send private messages." ON public.private_messages;
CREATE POLICY "Users can send private messages." ON public.private_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
