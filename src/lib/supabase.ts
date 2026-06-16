import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('seu-projeto') && !supabaseAnonKey.includes('sua-anon-key'),
);

export const supabase = createClient(supabaseUrl || 'https://seu-projeto.supabase.co', supabaseAnonKey || 'sua-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function getPublicUrl(bucket: 'videos' | 'thumbnails' | 'avatars', path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
