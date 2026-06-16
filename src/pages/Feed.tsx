import * as React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { hydrateVideos } from '@/lib/videos';
import type { Video } from '@/types/database';
import { VideoCard } from '@/components/VideoCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function Feed() {
  const { user } = useAuth();
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [active, setActive] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      const ids = (follows || []).map((f: any) => f.following_id);
      if (!ids.length) { setVideos([]); setLoading(false); return; }
      const { data, error } = await supabase.from('videos').select('*').eq('status', 'publicado').in('user_id', ids).order('created_at', { ascending: false }).limit(50);
      if (error) console.warn('[Feed] videos:', error.message);
      setVideos(await hydrateVideos(data, user.id));
      setLoading(false);
    }
    load();
  }, [user]);

  React.useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.index));
    }, { threshold: [0.55, 0.75] });
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [videos.length]);

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><div className="brand-gradient h-14 w-14 animate-pulse rounded-full" /></div>;
  if (!videos.length) return <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center"><h1 className="text-3xl font-black text-gradient">Seu feed está quieto demais 👀</h1><p className="mt-3 text-muted-foreground">Siga outros usuários para ver memes aqui. Enquanto isso, explore vídeos recentes da plataforma.</p><div className="mt-6 flex gap-3"><Link to="/explore"><Button variant="gradient">Explorar</Button></Link><Link to="/upload"><Button variant="outline">Publicar meme</Button></Link></div></div>;
  return <div className="video-scroll h-[100svh] snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth bg-black">{videos.map((video, i) => <div className="h-[100svh] snap-start snap-always" key={video.id} data-index={i} ref={(el) => { refs.current[i] = el; }}><VideoCard video={video} active={active === i} onDeleted={(id) => setVideos((v) => v.filter((x) => x.id !== id))} /></div>)}</div>;
}
