import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hydrateVideos } from '@/lib/videos';
import type { Comment, Profile, Video } from '@/types/database';
import { VideoCard } from '@/components/VideoCard';
import { CommentItem } from '@/components/CommentItem';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

export function VideoDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [video, setVideo] = React.useState<Video | null>(null);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [content, setContent] = React.useState('');

  async function loadComments() {
    if (!id) return;

    const { data, error } = await supabase.from('comments').select('*').eq('video_id', id).order('created_at', { ascending: true });
    if (error) {
      console.warn('[VideoDetail] comments:', error.message);
      setComments([]);
      return;
    }

    const rawComments = (data || []) as Comment[];
    const userIds = [...new Set(rawComments.map((comment) => comment.user_id))];
    const { data: profilesData, error: profilesError } = userIds.length
      ? await supabase.from('profiles').select('*').in('id', userIds)
      : { data: [] as Profile[], error: null };

    if (profilesError) console.warn('[VideoDetail] comment profiles:', profilesError.message);

    const profiles = new Map<string, Profile>((profilesData || []).map((profile: Profile) => [profile.id, profile]));
    setComments(rawComments.map((comment) => ({ ...comment, profiles: profiles.get(comment.user_id) || null })));
  }

  React.useEffect(() => {
    async function load() {
      if (!id) return;
      const { data, error } = await supabase.from('videos').select('*').eq('id', id).single();
      if (error) return toast.error(error.message);
      const [v] = await hydrateVideos([data], user?.id);
      setVideo(v);
      loadComments();
    }
    load();
  }, [id, user?.id]);

  async function send() {
    if (!user) return navigate('/login');
    if (!content.trim() || !id) return;
    const { error } = await supabase.from('comments').insert({ user_id: user.id, video_id: id, content: content.trim() });
    if (error) return toast.error(error.message);
    setContent('');
    loadComments();
  }

  async function del(commentId: string) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) return toast.error(error.message);
    setComments((c) => c.filter((x) => x.id !== commentId));
  }

  if (!video) return <div className="flex min-h-[70vh] items-center justify-center"><div className="brand-gradient h-14 w-14 animate-pulse rounded-full" /></div>;

  return <div className="grid gap-6 p-4 lg:grid-cols-[minmax(320px,440px)_1fr]"><VideoCard video={video} active compact onDeleted={() => navigate('/')} /><section className="min-w-0"><h1 className="text-3xl font-black">{video.title}</h1><p className="mt-2 text-muted-foreground">Comentários ordenados por data</p><div className="mt-5 flex gap-2"><Textarea className="min-h-16" placeholder="Escreva um comentário engraçado..." value={content} onChange={(e) => setContent(e.target.value)} /><Button className="h-16" variant="gradient" onClick={send}><Send className="h-4 w-4" /></Button></div><div className="mt-5 space-y-3">{comments.map((c) => <CommentItem key={c.id} comment={c} onDelete={del} />)}{!comments.length && <p className="rounded-2xl border p-6 text-center text-muted-foreground">Seja o primeiro comentário.</p>}</div></section></div>;
}
