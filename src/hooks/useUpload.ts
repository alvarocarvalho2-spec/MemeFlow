import { supabase, getPublicUrl } from '@/lib/supabase';
import { slugFileName } from '@/lib/utils';

export async function uploadUserFile(bucket: 'videos' | 'thumbnails' | 'avatars', userId: string, file: File | Blob, originalName: string) {
  // Convenção exigida pelas Storage policies: primeira pasta = auth.uid().
  const path = `${userId}/${slugFileName(originalName)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const publicUrl = getPublicUrl(bucket, path);
  if (!publicUrl) throw new Error('Falha ao gerar URL pública do arquivo enviado.');

  return { path, publicUrl };
}
