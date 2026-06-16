import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message, Profile } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble } from '@/components/ChatBubble';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';

export function ChatRoom() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [other, setOther] = React.useState<Profile | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [content, setContent] = React.useState('');
  const bottomRef = React.useRef<HTMLDivElement>(null);

  async function load() {
    if (!user || !userId) return;
    const { data } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`).order('created_at', { ascending: true });
    setMessages((data || []) as Message[]);
  }
  React.useEffect(() => { if (userId) supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => setOther(data)); load(); }, [userId, user?.id]);
  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  React.useEffect(() => {
    if (!user || !userId) return;
    const ch = supabase.channel(`dm-${user.id}-${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const m = payload.new as Message;
      const belongs = (m.sender_id === user.id && m.receiver_id === userId) || (m.sender_id === userId && m.receiver_id === user.id);
      if (belongs) setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, userId]);
  async function send() {
    if (!user || !userId || !content.trim()) return;
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: userId, content: content.trim() });
    if (error) return toast.error(error.message);
    setContent('');
  }
  return <div className="mx-auto flex h-[calc(100svh-4rem)] max-w-3xl flex-col p-4"><div className="mb-3 flex items-center gap-3 rounded-2xl border bg-card p-3"><Avatar src={other?.avatar_url} fallback={(other?.username || '?').slice(0, 1).toUpperCase()} /><div><p className="font-bold">@{other?.username || 'usuário'}</p>{other?.username && <Link className="text-xs text-primary hover:underline" to={`/profile/${other.username}`}>Ver perfil</Link>}</div></div><div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-muted/30 p-4">{messages.map((m) => <ChatBubble key={m.id} message={m} own={m.sender_id === user?.id} />)}<div ref={bottomRef} /></div><form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}><Input placeholder="Digite sua mensagem..." value={content} onChange={(e) => setContent(e.target.value)} /><Button variant="gradient"><Send className="h-4 w-4" /></Button></form></div>;
}
