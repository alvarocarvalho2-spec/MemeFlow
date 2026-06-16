import * as React from 'react';
import { cn } from '@/lib/utils';

type Ctx = { value: string; setValue: (v: string) => void };
const TabsContext = React.createContext<Ctx | null>(null);
export function Tabs({ defaultValue, value, onValueChange, children, className }: { defaultValue: string; value?: string; onValueChange?: (v: string) => void; children: React.ReactNode; className?: string }) {
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  const setValue = (v: string) => { setInner(v); onValueChange?.(v); };
  return <TabsContext.Provider value={{ value: current, setValue }}><div className={className}>{children}</div></TabsContext.Provider>;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('inline-flex h-11 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground', className)} {...props} />; }
export function TabsTrigger({ value, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)!;
  return <button className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow', className)} data-state={ctx.value === value ? 'active' : 'inactive'} onClick={() => ctx.setValue(value)} {...props} />;
}
export function TabsContent({ value, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div className={cn('mt-4', className)} {...props} />;
}
