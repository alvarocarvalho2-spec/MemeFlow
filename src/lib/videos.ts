import { supabase } from '@/lib/supabase';
import type { Profile, Video } from '@/types/database';

/**
 * Enriquece linhas de videos sem depender de embedded joins do PostgREST.
 *
 * Motivo: em projetos Supabase já existentes, a relação inferida `profiles(*)`
 * pode não existir, pode ter nome diferente, ou o schema pode ter sido criado
 * antes do FK correto. Nesses casos `select('*, profiles(*)')` falha e as
 * páginas ficam vazias. Aqui buscamos `videos`, `profiles`, `likes` e
 * `comments` em consultas separadas, usando apenas colunas estáveis.
 */
export async function hydrateVideos(rows: any[] | null, userId?: string | null): Promise<Video[]> {
  const videos = (rows || []) as Video[];
  if (!videos.length) return [];

  const ids = videos.map((v) => v.id);
  const userIds = [...new Set(videos.map((v) => v.user_id).filter(Boolean))];

  const [likesResult, commentsResult, myLikesResult, profilesResult] = await Promise.all([
    supabase.from('likes').select('video_id').in('video_id', ids),
    supabase.from('comments').select('video_id').in('video_id', ids),
    userId
      ? supabase.from('likes').select('video_id').eq('user_id', userId).in('video_id', ids)
      : Promise.resolve({ data: [] as any[], error: null }),
    userIds.length
      ? supabase.from('profiles').select('*').in('id', userIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (likesResult.error) console.warn('[hydrateVideos] likes:', likesResult.error.message);
  if (commentsResult.error) console.warn('[hydrateVideos] comments:', commentsResult.error.message);
  if (myLikesResult.error) console.warn('[hydrateVideos] myLikes:', myLikesResult.error.message);
  if (profilesResult.error) console.warn('[hydrateVideos] profiles:', profilesResult.error.message);

  const lc = new Map<string, number>();
  likesResult.data?.forEach((l: any) => lc.set(l.video_id, (lc.get(l.video_id) || 0) + 1));

  const cc = new Map<string, number>();
  commentsResult.data?.forEach((c: any) => cc.set(c.video_id, (cc.get(c.video_id) || 0) + 1));

  const mine = new Set((myLikesResult.data || []).map((l: any) => l.video_id));
  const profiles = new Map<string, Profile>((profilesResult.data || []).map((p: Profile) => [p.id, p]));

  return videos.map((v) => ({
    ...v,
    profiles: v.profiles || profiles.get(v.user_id) || null,
    likes_count: lc.get(v.id) || 0,
    comments_count: cc.get(v.id) || 0,
    liked_by_me: mine.has(v.id),
  }));
}
