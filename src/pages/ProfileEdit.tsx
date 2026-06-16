import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadUserFile } from '@/hooks/useUpload';
import { fileToDataUrl } from '@/lib/utils';
import { HUMOR_STYLES } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { toast } from '@/components/ui/sonner';

export function ProfileEdit() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState(profile?.full_name || '');
  const [username, setUsername] = React.useState(profile?.username || '');
  const [bio, setBio] = React.useState(profile?.bio || '');
  const [humor, setHumor] = React.useState(profile?.humor_style || 'geral');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState(profile?.avatar_url || '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { setFullName(profile?.full_name || ''); setUsername(profile?.username || ''); setBio(profile?.bio || ''); setHumor(profile?.humor_style || 'geral'); setAvatarPreview(profile?.avatar_url || ''); }, [profile]);
  async function pick(file?: File) { if (!file) return; setAvatarFile(file); setAvatarPreview(await fileToDataUrl(file)); }
  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url || null;
      if (avatarFile) avatar_url = (await uploadUserFile('avatars', user.id, avatarFile, avatarFile.name)).publicUrl;
      const payload = { id: user.id, username, full_name: fullName, avatar_url, bio, humor_style: humor };
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) throw error;
      await refreshProfile();
      toast.success('Perfil salvo!');
      navigate(`/profile/${username}`);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  return <div className="mx-auto max-w-2xl p-4"><Card><CardHeader><CardTitle className="text-3xl text-gradient">Editar perfil</CardTitle><CardDescription>Personalize sua identidade de humor.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex items-center gap-5"><Avatar className="h-24 w-24" src={avatarPreview} fallback={(username || '?').slice(0, 1).toUpperCase()} /><label className="cursor-pointer rounded-xl border border-dashed px-4 py-3 text-sm font-semibold hover:bg-muted"><Camera className="mr-2 inline h-4 w-4" /> Trocar avatar<input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label></div><div><label className="text-sm font-semibold">Username</label><Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /></div><div><label className="text-sm font-semibold">Nome</label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div><div><label className="text-sm font-semibold">Bio</label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} /></div><div><label className="text-sm font-semibold">Estilo de humor favorito</label><select className="h-11 w-full rounded-xl border bg-background px-3" value={humor} onChange={(e) => setHumor(e.target.value)}>{HUMOR_STYLES.map((h) => <option key={h}>{h}</option>)}</select></div><Button variant="gradient" size="lg" disabled={saving} onClick={save}>{saving ? 'Salvando...' : 'Salvar alterações'}</Button></CardContent></Card></div>;
}
