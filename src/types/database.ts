export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  humor_style: string | null;
  created_at: string;
  updated_at: string;
};

export type Video = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  video_url: string;
  thumbnail_url: string | null;
  status: 'rascunho' | 'publicado';
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
  likes_count?: number;
  comments_count?: number;
  liked_by_me?: boolean;
};

export type Comment = {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
  profiles?: Profile | null;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: Profile | null;
  receiver?: Profile | null;
};

export const HUMOR_STYLES = ['geral', 'irônico', 'nerd', 'gamer', 'politicamente incorreto', 'fofo', 'caótico', 'sarcasmo premium'];
export const CATEGORIES = ['animais', 'games', 'trabalho', 'relacionamentos', 'esportes', 'nerd', 'fails', 'brasil', 'aleatório'];
