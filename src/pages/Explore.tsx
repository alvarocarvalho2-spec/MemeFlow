import * as React from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hydrateVideos } from '@/lib/videos';
import type { Video } from '@/types/database';
import { CATEGORIES } from '@/types/database';
import { VideoCard } from '@/components/VideoCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export function Explore() {
  const { user } = useAuth();
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('todos');
  const [active, setActive] = React.useState(0);
  const refs = React.useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    async function load() {
      let q = supabase.from('videos').select('*').eq('status', 'publicado').order('created_at', { ascending: false }).limit(80);
      if (category !== 'todos') q = q.eq('category', category);
      if (query.trim()) q = q.ilike('title', `%${query.trim()}%`);
      const { data, error } = await q;
      if (error) console.warn('[Explore] videos:', error.message);
      setVideos(await hydrateVideos(data, user?.id));
    }
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [query, category, user?.id]);

  React.useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.index));
    }, { threshold: [0.55, 0.75] });
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [videos.length]);

  return (
    <div className="h-[calc(100svh-4rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth bg-black md:rounded-b-2xl">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-background/90 p-4 backdrop-blur-xl">
        <h1 className="text-2xl font-black text-gradient">Explorar</h1>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar por título..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mt-3 overflow-x-auto">
          <Tabs defaultValue="todos" value={category} onValueChange={setCategory}>
            <TabsList className="w-max">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              {CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {videos.length ? (
        <div>
          {videos.map((video, i) => (
            <div className="h-[100svh] snap-start snap-always" key={video.id} data-index={i} ref={(el) => { refs.current[i] = el; }}>
              <VideoCard video={video} active={active === i} onDeleted={(id) => setVideos((v) => v.filter((x) => x.id !== id))} />
            </div>
          ))}
        </div>
      ) : (
        <p className="bg-background p-8 text-center text-muted-foreground">Nenhum meme encontrado.</p>
      )}
    </div>
  );
}
