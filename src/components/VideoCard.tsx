import * as React from 'react';
import { Heart, MessageCircle, MoreHorizontal, Play, Trash2, Pencil, UserPlus, UserCheck, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn, timeAgo } from '@/lib/utils';
import { getExternalThumbnail, getVideoProvider, isDirectPlayableVideo } from '@/lib/videoUrl';
import type { Video } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { MediaPlayer } from '@/components/MediaPlayer';

export function VideoCard({ video, active = true, compact = false, onDeleted }: { video: Video; active?: boolean; compact?: boolean; onDeleted?: (id: string) => void }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = React.useState(Boolean(video.liked_by_me));
  const [likes, setLikes] = React.useState(video.likes_count || 0);
  const [commentsCount, setCommentsCount] = React.useState(video.comments_count || 0);
  const [muted, setMuted] = React.useState(true);
  const [showPlay, setShowPlay] = React.useState(false);
  const [following, setFollowing] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const owner = user?.id === video.user_id;
  const poster = video.thumbnail_url || getExternalThumbnail(video.video_url) || undefined;
  const provider = getVideoProvider(video.video_url);
  const directVideo = isDirectPlayableVideo(video.video_url) || provider === 'unknown';

  React.useEffect(() => {
    setLiked(Boolean(video.liked_by_me));
    setLikes(video.likes_count || 0);
    setCommentsCount(video.comments_count || 0);
  }, [video.id, video.liked_by_me, video.likes_count, video.comments_count]);

  React.useEffect(() => {
    async function refreshLikes() {
      const [{ count }, { data: mine }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('video_id', video.id),
        user ? supabase.from('likes').select('video_id').eq('user_id', user.id).eq('video_id', video.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setLikes(count || 0);
      setLiked(Boolean(mine));
    }

    async function refreshComments() {
      const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('video_id', video.id);
      setCommentsCount(count || 0);
    }

    const channel = supabase
      // Nome único por instância: em React StrictMode/dev ou quando o mesmo vídeo aparece em
      // mais de uma lista, reutilizar o mesmo nome pode devolver um canal já subscribed.
      // O Supabase não permite adicionar callbacks .on() depois de subscribe().
      .channel(`video-card-${video.id}-${user?.id || 'anon'}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `video_id=eq.${video.id}` }, refreshLikes)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `video_id=eq.${video.id}` }, refreshComments)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [video.id, user?.id]);

  React.useEffect(() => {
    async function loadFollow() {
      if (!user || owner) {
        setFollowing(false);
        return;
      }
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', video.user_id)
        .maybeSingle();
      setFollowing(Boolean(data));
    }
    loadFollow();

    if (!user || owner) return;
    const channel = supabase
      // Nome único por instância para evitar reaproveitar um canal já subscribed.
      .channel(`follow-card-${user.id}-${video.user_id}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${video.user_id}` }, loadFollow)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, owner, video.user_id]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !directVideo) return;
    if (active) {
      el.play().catch(() => setShowPlay(true));
    } else {
      el.pause();
    }
  }, [active, directVideo]);

  async function toggleLike() {
    if (!user) return navigate('/login');

    const previousLiked = liked;
    const previousLikes = likes;
    setLiked(!previousLiked);
    setLikes((n) => Math.max(0, n + (previousLiked ? -1 : 1)));

    if (previousLiked) {
      const { error } = await supabase.from('likes').delete().eq('user_id', user.id).eq('video_id', video.id);
      if (error) {
        setLiked(previousLiked);
        setLikes(previousLikes);
        toast.error(error.message);
      }
    } else {
      const { error } = await supabase.from('likes').upsert({ user_id: user.id, video_id: video.id }, { ignoreDuplicates: true });
      if (error) {
        setLiked(previousLiked);
        setLikes(previousLikes);
        toast.error(error.message);
      }
    }
  }

  async function toggleFollow() {
    if (!user) return navigate('/login');
    if (owner) return;

    const previous = following;
    setFollowing(!previous);

    if (previous) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', video.user_id);
      if (error) {
        setFollowing(previous);
        toast.error(error.message);
      } else {
        toast.success('Você deixou de seguir este perfil.');
      }
    } else {
      const { error } = await supabase.from('follows').upsert({ follower_id: user.id, following_id: video.user_id }, { ignoreDuplicates: true });
      if (error) {
        setFollowing(previous);
        toast.error(error.message);
      } else {
        toast.success('Seguindo!');
      }
    }
  }

  async function deleteVideo() {
    if (!confirm('Excluir este meme?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', video.id);
    if (error) return toast.error(error.message);
    toast.success('Vídeo excluído');
    onDeleted?.(video.id);
  }

  function handleMediaClick() {
    if (compact || provider === 'tiktok' || provider === 'instagram') {
      setFullscreen(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.paused ? el.play() : el.pause();
    setShowPlay(el.paused);
  }

  return (
    <>
      <article className={cn(
        'video-snap relative mx-auto flex items-center justify-center overflow-hidden bg-black shadow-2xl',
        compact
          ? 'h-[520px] w-full max-w-md rounded-[2rem] md:h-[620px]'
          : 'h-[100svh] w-full max-w-none rounded-none',
      )}>
        <MediaPlayer
          videoRef={ref}
          className="h-full w-full object-cover"
          src={video.video_url}
          poster={poster}
          muted={muted}
          active={active}
          loop
          onClick={handleMediaClick}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />
        {showPlay && directVideo && <button className="absolute z-20 rounded-full bg-white/20 p-6 text-white backdrop-blur" onClick={() => ref.current?.play().then(() => setShowPlay(false))}><Play className="h-10 w-10 fill-white" /></button>}

        <div className="absolute bottom-5 left-4 right-20 z-20 text-white">
          <Link to={`/profile/${video.profiles?.username || ''}`} className="mb-3 flex items-center gap-2">
            <Avatar src={video.profiles?.avatar_url} fallback={(video.profiles?.username || '?').slice(0, 1).toUpperCase()} />
            <div><p className="font-bold">@{video.profiles?.username || 'usuário'}</p><p className="text-xs text-white/70">{timeAgo(video.created_at)} • {video.category}</p></div>
          </Link>
          <Link to={`/video/${video.id}`} className="text-lg font-extrabold leading-tight hover:underline">{video.title}</Link>
          {video.description && <p className="mt-1 line-clamp-2 text-sm text-white/85">{video.description}</p>}
          {video.status === 'rascunho' && <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">Rascunho</span>}
        </div>

        <div className="absolute bottom-6 right-3 z-20 flex flex-col items-center gap-3 text-white">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-white/20" onClick={toggleLike}><Heart className={cn('h-7 w-7', liked && 'animate-heart-pop fill-secondary text-secondary')} /></Button>
          <span className="-mt-3 text-xs font-bold">{likes}</span>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-white/20" onClick={() => navigate(`/video/${video.id}`)}><MessageCircle className="h-7 w-7" /></Button>
          <span className="-mt-3 text-xs font-bold">{commentsCount}</span>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-white/20" onClick={() => setMuted((v) => !v)}>{muted ? <VolumeX /> : <Volume2 />}</Button>
          {compact && <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-white/20" onClick={() => setFullscreen(true)}><Maximize2 /></Button>}
          {!owner && <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-white/20" onClick={toggleFollow}>{following ? <UserCheck className="text-accent" /> : <UserPlus />}</Button>}
          {owner && <DropdownMenu trigger={<MoreHorizontal className="h-7 w-7" />} className="text-foreground"><DropdownMenuItem onClick={() => navigate(`/upload?edit=${video.id}`)}><Pencil className="h-4 w-4" /> Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={deleteVideo}><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem></DropdownMenu>}
        </div>
      </article>

      {fullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 z-20 rounded-full bg-black/60 text-2xl text-white hover:bg-white/20" onClick={() => setFullscreen(false)}>×</Button>
          <MediaPlayer src={video.video_url} poster={poster} active controls muted={false} interactiveEmbeds className="h-full w-full object-contain" />
        </div>
      )}
    </>
  );
}
