import * as React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Avatar({ className, src, alt, fallback }: { className?: string; src?: string | null; alt?: string; fallback?: string }) {
  return (
    <div className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted', className)}>
      {src ? <img src={src} alt={alt || 'avatar'} className="aspect-square h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">{fallback || <User className="h-5 w-5" />}</div>}
    </div>
  );
}
