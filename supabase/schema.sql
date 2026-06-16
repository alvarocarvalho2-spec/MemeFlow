-- MemeFlow - schema final Supabase (Database + RLS + Storage + Realtime)
-- Execute no SQL Editor do Supabase em um projeto novo.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Perfis vinculados à auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,30}$'),
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  humor_style TEXT DEFAULT 'geral',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vídeos/memes
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 3),
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Curtidas
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

-- Comentários
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seguidores
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Mensagens diretas
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_videos_user_created ON public.videos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_public_recent ON public.videos(created_at DESC) WHERE status = 'publicado';
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.videos(category);
CREATE INDEX IF NOT EXISTS idx_likes_video ON public.likes(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_created ON public.comments(video_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair_created ON public.messages(sender_id, receiver_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created ON public.messages(receiver_id, created_at DESC);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS videos_set_updated_at ON public.videos;
CREATE TRIGGER videos_set_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cria perfil automaticamente no cadastro. O Register envia username/full_name em user_metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user'), '[^a-z0-9_]', '_', 'g'));
  IF length(base_username) < 3 THEN
    base_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  base_username := substr(base_username, 1, 24);
  final_username := base_username;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := substr(base_username, 1, 20) || '_' || substr(NEW.id::text, 1, 8);
  END IF;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (NEW.id, final_username, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies idempotentes
DROP POLICY IF EXISTS "Perfis visíveis para todos" ON public.profiles;
DROP POLICY IF EXISTS "Usuário insere próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza próprio perfil" ON public.profiles;
CREATE POLICY "Perfis visíveis para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuário insere próprio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Vídeos publicados ou do dono visíveis" ON public.videos;
DROP POLICY IF EXISTS "Usuário insere próprio vídeo" ON public.videos;
DROP POLICY IF EXISTS "Usuário atualiza próprio vídeo" ON public.videos;
DROP POLICY IF EXISTS "Usuário deleta próprio vídeo" ON public.videos;
CREATE POLICY "Vídeos publicados ou do dono visíveis" ON public.videos FOR SELECT USING (status = 'publicado' OR user_id = auth.uid());
CREATE POLICY "Usuário insere próprio vídeo" ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário atualiza próprio vídeo" ON public.videos FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário deleta próprio vídeo" ON public.videos FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Likes visíveis para todos" ON public.likes;
DROP POLICY IF EXISTS "Usuário insere próprio like" ON public.likes;
DROP POLICY IF EXISTS "Usuário remove próprio like" ON public.likes;
CREATE POLICY "Likes visíveis para todos" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Usuário insere próprio like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário remove próprio like" ON public.likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comentários visíveis para todos" ON public.comments;
DROP POLICY IF EXISTS "Usuário insere próprio comentário" ON public.comments;
DROP POLICY IF EXISTS "Usuário deleta próprio comentário" ON public.comments;
CREATE POLICY "Comentários visíveis para todos" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Usuário insere próprio comentário" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário deleta próprio comentário" ON public.comments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Seguidores visíveis para todos" ON public.follows;
DROP POLICY IF EXISTS "Usuário segue alguém" ON public.follows;
DROP POLICY IF EXISTS "Usuário deixa de seguir" ON public.follows;
CREATE POLICY "Seguidores visíveis para todos" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Usuário segue alguém" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
CREATE POLICY "Usuário deixa de seguir" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Usuário vê suas mensagens" ON public.messages;
DROP POLICY IF EXISTS "Usuário envia mensagem" ON public.messages;
CREATE POLICY "Usuário vê suas mensagens" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Usuário envia mensagem" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND sender_id <> receiver_id);

-- Realtime para mensagens, curtidas, comentários, seguidores e vídeos.
-- REPLICA IDENTITY FULL melhora payloads em UPDATE/DELETE e filtros realtime.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.likes REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.follows REPLICA IDENTITY FULL;
ALTER TABLE public.videos REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

-- Storage buckets. A app salva arquivos como: {auth.uid()}/nome-do-arquivo.ext
-- storage.foldername(name)[1] continua compatível no Supabase atual para extrair a primeira pasta do objeto.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('videos', 'videos', true, 104857600, ARRAY['video/mp4','video/webm','video/quicktime','video/x-matroska']),
  ('thumbnails', 'thumbnails', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies Storage - videos
DROP POLICY IF EXISTS "Vídeos públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Upload de vídeo por dono da pasta" ON storage.objects;
DROP POLICY IF EXISTS "Usuário atualiza próprio vídeo" ON storage.objects;
DROP POLICY IF EXISTS "Usuário deleta próprio vídeo" ON storage.objects;
CREATE POLICY "Vídeos públicos para leitura" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Upload de vídeo por dono da pasta" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuário atualiza próprio vídeo" ON storage.objects FOR UPDATE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuário deleta próprio vídeo" ON storage.objects FOR DELETE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies Storage - thumbnails
DROP POLICY IF EXISTS "Thumbnails públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Upload de thumbnail por dono da pasta" ON storage.objects;
DROP POLICY IF EXISTS "Usuário atualiza própria thumbnail" ON storage.objects;
DROP POLICY IF EXISTS "Usuário deleta própria thumbnail" ON storage.objects;
CREATE POLICY "Thumbnails públicos para leitura" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Upload de thumbnail por dono da pasta" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuário atualiza própria thumbnail" ON storage.objects FOR UPDATE USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuário deleta própria thumbnail" ON storage.objects FOR DELETE USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policies Storage - avatars (necessário para edição de perfil)
DROP POLICY IF EXISTS "Avatares públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Upload de avatar por dono da pasta" ON storage.objects;
DROP POLICY IF EXISTS "Usuário atualiza próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuário deleta próprio avatar" ON storage.objects;
CREATE POLICY "Avatares públicos para leitura" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload de avatar por dono da pasta" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuário atualiza próprio avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuário deleta próprio avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
