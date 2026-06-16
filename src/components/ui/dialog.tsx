import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false);
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => onOpenChange(false)}>
      <div onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-lg animate-float-up rounded-2xl border bg-card p-6 shadow-2xl">
        <Button variant="ghost" size="icon" className="absolute right-3 top-3" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
        {children}
      </div>
    </div>
  );
}
export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('mb-4 pr-10', className)} {...props} />;
export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className={cn('text-xl font-bold', className)} {...props} />;
export const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
