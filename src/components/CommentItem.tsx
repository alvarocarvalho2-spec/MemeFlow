import { Trash2 } from 'lucide-react';
import type { Comment } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function CommentItem({ comment, onDelete }: { comment: Comment; onDelete: (id: string) => void }) {
  const { user } = useAuth();
  const own = user?.id === comment.user_id;
  return <div className="flex gap-3 rounded-2xl bg-muted/50 p-3"><Avatar src={comment.profiles?.avatar_url} fallback={(comment.profiles?.username || '?').slice(0, 1).toUpperCase()} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold">@{comment.profiles?.username || 'usuário'}</p><span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span></div><p className="whitespace-pre-wrap text-sm">{comment.content}</p></div>{own && <Button variant="ghost" size="icon" onClick={() => onDelete(comment.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>;
}
