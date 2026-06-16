import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export function DropdownMenu({ trigger, children, className }: { trigger: React.ReactNode; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideWrapper = wrapperRef.current && wrapperRef.current.contains(target);
      const insideMenu = menuRef.current && menuRef.current.contains(target);
      if (!insideWrapper && !insideMenu) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  React.useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 8, left: rect.right + window.scrollX });
  }, [open]);

  const menu = open && pos && (
    createPortal(
      <div
        ref={menuRef}
        className={cn('z-40 min-w-48 animate-float-up rounded-xl border bg-card p-1 shadow-xl', className)}
        style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
      >
        {children}
      </div>,
      document.body,
    )
  );

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button type="button" ref={buttonRef} onClick={() => setOpen((v) => !v)}>{trigger}</button>
      {menu}
    </div>
  );
}
export function DropdownMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-muted', className)} {...props} />;
}
