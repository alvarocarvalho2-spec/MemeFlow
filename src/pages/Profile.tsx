import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Pencil, UserMinus, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hydrateVideos } from '@/lib/videos';
import type { Profile as ProfileType, Video } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VideoCard } from '@/components/VideoCard';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

export function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<ProfileType | null>(null);
  const [videos, setVideos] = React.useState<Video[]>([]);
  const [following, setFollowing] = React.useState(false);
  const [counts, setCounts] = React.useState({ posts: 0, followers: 0, following: 0 });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<'followers' | 'following' | null>(null);
  const [listProfiles, setListProfiles] = React.useState<ProfileType[]>([]);
  const [listLoading, setListLoading] = React.useState(false);
  const [followedIds, setFollowedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    async function load() {
      if (!username) return;
      const { data: p, error } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (error) return toast.error(error.message);
      setProfile(p);
      const own = user?.id === p.id;

      const { data: vs, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', p.id)
        .in('status', own ? ['rascunho', 'publicado'] : ['publicado'])
        .order('created_at', { ascending: false });
      if (videosError) console.warn('[Profile] videos:', videosError.message);
      setVideos(await hydrateVideos(vs, user?.id));

      const [{ count: posts }, { count: followers }, { count: followingCount }, { data: f }] = await Promise.all([
        supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', p.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', p.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', p.id),
        user ? supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', p.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      setCounts({ posts: posts || 0, followers: followers || 0, following: followingCount || 0 });
      setFollowing(Boolean(f));
    }
    load();
  }, [username, user?.id]);

  async function toggleFollow() {
    if (!user) return navigate('/login');
    if (!profile || user.id === profile.id) return;
    if (following) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id);
      if (error) return toast.error(error.message);
      setFollowing(false);
      setCounts((c) => ({ ...c, followers: c.followers - 1 }));
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
      if (error) return toast.error(error.message);
      setFollowing(true);
      setCounts((c) => ({ ...c, followers: c.followers + 1 }));
    }
  }

  async function loadList(type: 'followers' | 'following') {
    if (!profile) return;
    setDialogType(type);
    setDialogOpen(true);
    setListLoading(true);
    try {
      if (type === 'followers') {
        const { data: rows } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id);
        const ids = (rows || []).map((r: any) => r.follower_id).filter(Boolean);
        if (ids.length) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
          setListProfiles(profiles || []);
          if (user) {
            const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', ids);
            setFollowedIds(new Set((myFollows || []).map((r: any) => r.following_id)));
          } else {
            setFollowedIds(new Set());
          }
        } else {
          setListProfiles([]);
          setFollowedIds(new Set());
        }
      } else {
        const { data: rows } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id);
        const ids = (rows || []).map((r: any) => r.following_id).filter(Boolean);
        if (ids.length) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
          setListProfiles(profiles || []);
          if (user) {
            const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', ids);
            setFollowedIds(new Set((myFollows || []).map((r: any) => r.following_id)));
          } else {
            setFollowedIds(new Set());
          }
        } else setListProfiles([]);
      }
    } catch (e: any) {
      console.warn('[Profile] loadList error', e);
      toast.error(e?.message || 'Erro ao carregar lista');
    } finally {
      setListLoading(false);
    }
  }

  async function toggleFollowFromList(targetId: string) {
    if (!user) return navigate('/login');
    try {
      const { data } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', targetId).maybeSingle();
      if (data) {
        const { error } = await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
        if (error) throw error;
        setFollowedIds((s) => {
          const next = new Set(s);
          next.delete(targetId);
          return next;
        });
        toast.success('Deixou de seguir');
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
        if (error) throw error;
        setFollowedIds((s) => {
          const next = new Set(s);
          next.add(targetId);
          return next;
        });
        toast.success('Seguindo');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar follow');
    }
  }

  if (!profile) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="brand-gradient h-14 w-14 animate-pulse rounded-full" />
    </div>
  );

  const own = user?.id === profile.id;

  return (
    <div className="p-4">
      <Card className="overflow-hidden">
        <div className="brand-gradient h-28" />
        <CardContent className="-mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar className="h-28 w-28 border-4 border-background" src={profile.avatar_url} fallback={profile.username.slice(0, 1).toUpperCase()} />
              <div className="pb-2">
                <h1 className="text-3xl font-black">{profile.full_name || profile.username}</h1>
                <p className="text-muted-foreground">@{profile.username} • humor {profile.humor_style}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {own ? (
                <Link to="/profile/edit"><Button><Pencil className="h-4 w-4" /> Editar perfil</Button></Link>
              ) : (
                <>
                  <Button variant={following ? 'outline' : 'gradient'} onClick={toggleFollow}>
                    {following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {following ? 'Deixar de seguir' : 'Seguir'}
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/chat/${profile.id}`)}>
                    <MessageCircle className="h-4 w-4" /> Chat
                  </Button>
                </>
              )}
            </div>
          </div>

          <p className="mt-4 max-w-2xl whitespace-pre-wrap">{profile.bio || 'Bio ainda misteriosa.'}</p>

          <div className="mt-5 grid max-w-md grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-muted p-3">
              <b>{counts.posts}</b>
              <p className="text-xs text-muted-foreground">posts</p>
            </div>
            <button onClick={() => loadList('followers')} className="rounded-2xl bg-muted p-3">
              <b>{counts.followers}</b>
              <p className="text-xs text-muted-foreground">seguidores</p>
            </button>
            <button onClick={() => loadList('following')} className="rounded-2xl bg-muted p-3">
              <b>{counts.following}</b>
              <p className="text-xs text-muted-foreground">seguindo</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 mt-8 text-2xl font-black">Vídeos</h2>
      {videos.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} compact active={false} onDeleted={(id) => setVideos((x) => x.filter((v) => v.id !== id))} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border p-8 text-center text-muted-foreground">Nenhum vídeo publicado ainda.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setListProfiles([]); setFollowedIds(new Set()); } }}>
        <DialogHeader>
          <DialogTitle>{dialogType === 'followers' ? 'Seguidores' : dialogType === 'following' ? 'Seguindo' : ''}</DialogTitle>
          <DialogDescription>{dialogType === 'followers' ? `${counts.followers} pessoas seguem ${profile.username}` : dialogType === 'following' ? `${counts.following} perfis que ${profile.username} segue` : ''}</DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-auto space-y-3">
          {listLoading ? (
            <p className="text-center p-4">Carregando...</p>
          ) : listProfiles.length ? (
            listProfiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
                <Link to={`/profile/${p.username}`} className="flex items-center gap-3">
                  <Avatar src={p.avatar_url} fallback={p.username.slice(0, 1).toUpperCase()} />
                  <div>
                    <p className="font-semibold">@{p.username}</p>
                    <p className="text-xs text-muted-foreground">{p.full_name}</p>
                  </div>
                </Link>
                {user?.id !== p.id ? (
                  <Button
                    variant={followedIds.has(p.id) ? 'outline' : 'gradient'}
                    size="sm"
                    onClick={() => toggleFollowFromList(p.id)}
                  >
                    {followedIds.has(p.id) ? 'Seguindo' : 'Seguir'}
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-center p-4 text-muted-foreground">Nenhum usuário encontrado.</p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
