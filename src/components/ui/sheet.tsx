import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Sheet({ open, onOpenChange, children, side = 'right' }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode; side?: 'left' | 'right' }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onMouseDown={() => onOpenChange(false)}><div onMouseDown={(e) => e.stopPropagation()} className={cn('fixed top-0 h-full w-80 max-w-[85vw] animate-float-up border bg-card p-5 shadow-2xl', side === 'right' ? 'right-0' : 'left-0')}><Button className="absolute right-3 top-3" variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>{children}</div></div>;
}
