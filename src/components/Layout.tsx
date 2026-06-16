import * as React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Home, LogOut, Menu, MessageCircle, Moon, PlusCircle, Search, Sun, User, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Sheet } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';

const nav = [
  { to: '/', label: 'Feed', icon: Home },
  { to: '/explore', label: 'Explorar', icon: Compass },
  { to: '/upload', label: 'Publicar', icon: PlusCircle, central: true },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/me', label: 'Perfil', icon: User },
];

export function Layout() {
  const { user, profile } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isFullscreenFeed = location.pathname === '/';
  const profileUrl = profile?.username ? `/profile/${profile.username}` : '/profile/edit';
  const mappedNav = nav.map((n) => (n.to === '/me' ? { ...n, to: profileUrl } : n));
  async function logout() { await supabase.auth.signOut(); navigate('/login'); }
  const NavItems = ({ mobile = false }: { mobile?: boolean }) => <>{mappedNav.filter((n) => !mobile || !n.central).map(({ to, label, icon: Icon }) => <NavLink key={to + label} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-primary text-white shadow' : 'hover:bg-muted'}`} onClick={() => setOpen(false)}><Icon className="h-5 w-5" /> {label}</NavLink>)}</>;
  return (
    <div className="min-h-screen bg-background">
      <header className={isFullscreenFeed ? 'fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/25 text-white backdrop-blur-xl' : 'sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl'}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2"><div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg"><Video className="h-6 w-6" /></div><div><p className="text-xl font-black text-gradient">MemeFlow</p><p className="hidden text-xs text-muted-foreground sm:block">humor em loop infinito</p></div></Link>
          <nav className="hidden items-center gap-1 md:flex"><NavItems /></nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">{resolvedTheme === 'dark' ? <Sun className="h-5 w-5 text-accent" /> : <Moon className="h-5 w-5 text-primary" />}</Button>
            {user ? <DropdownMenu trigger={<Avatar src={profile?.avatar_url} fallback={(profile?.username || user.email || '?').slice(0, 1).toUpperCase()} />}><DropdownMenuItem onClick={() => navigate(profileUrl)}><User className="h-4 w-4" /> Perfil</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/explore')}><Search className="h-4 w-4" /> Explorar</DropdownMenuItem><DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="h-4 w-4" /> Sair</DropdownMenuItem></DropdownMenu> : <Button onClick={() => navigate('/login')} variant="gradient">Entrar</Button>}
            <Button className="md:hidden" variant="ghost" size="icon" onClick={() => setOpen(true)}><Menu /></Button>
          </div>
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen} side="left"><div className="mt-10 flex flex-col gap-2"><NavItems mobile /></div></Sheet>
      <main className={isFullscreenFeed ? 'w-full px-0' : 'mx-auto max-w-6xl px-0 pb-20 md:px-4 md:pb-8'}><Outlet /></main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">{mappedNav.map(({ to, label, icon: Icon, central }) => <NavLink key={to + label} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold ${central ? '-mt-6' : ''} ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{central ? <span className="brand-gradient flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl shadow-primary/30"><Icon className="h-7 w-7" /></span> : <Icon className="h-6 w-6" />}<span>{label}</span></NavLink>)}</div>
      </nav>
    </div>
  );
}
