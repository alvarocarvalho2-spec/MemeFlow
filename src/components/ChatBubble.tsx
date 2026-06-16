import type { Message } from '@/types/database';
import { cn, timeAgo } from '@/lib/utils';

export function ChatBubble({ message, own }: { message: Message; own: boolean }) {
  return <div className={cn('flex', own ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[78%] rounded-2xl px-4 py-2 shadow-sm', own ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-card border')}><p className="whitespace-pre-wrap text-sm">{message.content}</p><p className={cn('mt-1 text-[10px]', own ? 'text-white/70' : 'text-muted-foreground')}>{timeAgo(message.created_at)}</p></div></div>;
}
