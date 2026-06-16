import * as React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Message, Profile } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function ChatList() {
  const { user } = useAuth();
  const [items, setItems] = React.useState<{ profile: Profile; last: Message }[]>([]);
  async function load() {
    if (!user) return;
    const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false });
    const latest = new Map<string, Message>();
    (data || []).forEach((m: any) => { const other = m.sender_id === user.id ? m.receiver_id : m.sender_id; if (!latest.has(other)) latest.set(other, m); });
    const ids = [...latest.keys()];
    if (!ids.length) return setItems([]);
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
    setItems((profiles || []).map((p: any) => ({ profile: p, last: latest.get(p.id)! })).sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime()));
  }
  React.useEffect(() => { load(); }, [user?.id]);
  React.useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`chat-list-${user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, load).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);
  return <div className="mx-auto max-w-2xl p-4"><h1 className="mb-5 text-3xl font-black text-gradient">Mensagens</h1>{items.length ? <div className="space-y-3">{items.map(({ profile, last }) => <Link key={profile.id} to={`/chat/${profile.id}`}><Card className="mb-3 flex items-center gap-3 p-4 transition hover:scale-[1.01] hover:shadow-lg"><Avatar src={profile.avatar_url} fallback={profile.username.slice(0, 1).toUpperCase()} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><p className="font-bold">@{profile.username}</p><span className="text-xs text-muted-foreground">{timeAgo(last.created_at)}</span></div><p className="truncate text-sm text-muted-foreground">{last.content}</p></div></Card></Link>)}</div> : <p className="rounded-2xl border p-8 text-center text-muted-foreground">Nenhuma conversa ainda. Abra o perfil de alguém e chame no chat.</p>}</div>;
}
