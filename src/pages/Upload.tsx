import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, UploadCloud, Wand2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateVideoThumbnail, generateVideoThumbnailFromUrl } from '@/lib/utils';
import { uploadUserFile } from '@/hooks/useUpload';
import { CATEGORIES } from '@/types/database';
import { getExternalThumbnail } from '@/lib/videoUrl';
import { MediaPlayer } from '@/components/MediaPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.string().min(1),
  status: z.enum(['rascunho', 'publicado']),
  externalUrl: z.string().url().optional().or(z.literal('')),
});
type Form = z.infer<typeof schema>;
type VideoStatus = 'rascunho' | 'publicado';

export function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [thumbFile, setThumbFile] = React.useState<File | null>(null);
  const [videoPreview, setVideoPreview] = React.useState('');
  const [thumbPreview, setThumbPreview] = React.useState('');
  const [existingVideo, setExistingVideo] = React.useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { category: CATEGORIES[0], status: 'publicado' },
  });

  React.useEffect(() => {
    if (!editId) return;
    supabase
      .from('videos')
      .select('*')
      .eq('id', editId)
      .single()
      .then(({ data, error }) => {
        if (error) return toast.error(error.message);
        setExistingVideo(data);
        setValue('title', data.title);
        setValue('description', data.description || '');
        setValue('category', data.category);
        setValue('status', data.status);
        setValue('externalUrl', data.video_url || '');
        setVideoPreview(data.video_url);
        setThumbPreview(data.thumbnail_url || '');
      });
  }, [editId, setValue]);

  React.useEffect(() => {
    if (!videoFile) return;
    const url = URL.createObjectURL(videoFile);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  React.useEffect(() => {
    if (!thumbFile) return;
    const url = URL.createObjectURL(thumbFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbFile]);

  async function autoThumb() {
    const url = externalUrl || existingVideo?.video_url || '';

    const providerThumb = getExternalThumbnail(url);
    if (!videoFile && providerThumb) {
      setThumbPreview(providerThumb);
      toast.success('Thumbnail externa detectada automaticamente.');
      return;
    }

    if (!videoFile && !url) return toast.info('Selecione um arquivo de vídeo ou informe uma URL primeiro.');

    try {
      const blob = videoFile ? await generateVideoThumbnail(videoFile) : await generateVideoThumbnailFromUrl(url);
      const file = new File([blob], 'thumbnail-gerada.jpg', { type: 'image/jpeg' });
      setThumbFile(file);
      toast.success('Thumbnail gerada automaticamente.');
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function saveVideo(values: Form, forcedStatus?: VideoStatus) {
    if (!user) return;
    const finalStatus = forcedStatus ?? values.status;

    try {
      let videoUrl = values.externalUrl || existingVideo?.video_url || '';
      let thumbnailUrl = existingVideo?.thumbnail_url || getExternalThumbnail(videoUrl) || '';

      if (videoFile) {
        const up = await uploadUserFile('videos', user.id, videoFile, videoFile.name);
        videoUrl = up.publicUrl;
      }

      if (thumbFile) {
        const up = await uploadUserFile('thumbnails', user.id, thumbFile, thumbFile.name);
        thumbnailUrl = up.publicUrl;
      } else if (videoFile && !thumbnailUrl) {
        try {
          const blob = await generateVideoThumbnail(videoFile);
          const up = await uploadUserFile('thumbnails', user.id, blob, 'thumbnail-gerada.jpg');
          thumbnailUrl = up.publicUrl;
        } catch {
          // Thumbnail é opcional. O vídeo continua publicável.
        }
      } else if (!videoFile && videoUrl && !thumbnailUrl) {
        thumbnailUrl = getExternalThumbnail(videoUrl) || '';
        if (!thumbnailUrl) {
          try {
            const blob = await generateVideoThumbnailFromUrl(videoUrl);
            const up = await uploadUserFile('thumbnails', user.id, blob, 'thumbnail-gerada.jpg');
            thumbnailUrl = up.publicUrl;
          } catch {
            // URLs externas frequentemente bloqueiam captura por CORS; thumbnail segue opcional.
          }
        }
      }

      if (!thumbnailUrl) thumbnailUrl = getExternalThumbnail(videoUrl) || '';
      if (!videoUrl) throw new Error('Informe uma URL externa ou faça upload do vídeo.');

      const payload = {
        user_id: user.id,
        title: values.title,
        description: values.description || '',
        category: values.category,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || null,
        status: finalStatus,
      };

      const { data, error } = editId
        ? await supabase.from('videos').update(payload).eq('id', editId).select('id').single()
        : await supabase.from('videos').insert(payload).select('id').single();

      if (error) throw error;
      toast.success(finalStatus === 'publicado' ? 'Meme publicado!' : 'Rascunho salvo!');
      navigate(`/video/${data.id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const selectedStatus = watch('status');
  const externalUrl = watch('externalUrl');

  React.useEffect(() => {
    if (videoFile) return;
    setVideoPreview(externalUrl || existingVideo?.video_url || '');
    if (!thumbFile) setThumbPreview(getExternalThumbnail(externalUrl || existingVideo?.video_url) || existingVideo?.thumbnail_url || '');
  }, [externalUrl, videoFile, thumbFile, existingVideo]);

  return (
    <div className="mx-auto max-w-4xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-gradient">{editId ? 'Editar meme' : 'Publicar novo meme'}</CardTitle>
          <CardDescription>
            Use URL externa ou upload direto. Arquivos sobem como <code>{'{user_id}/arquivo.ext'}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6 md:grid-cols-[1fr_.85fr]" onSubmit={handleSubmit((values) => saveVideo(values, 'publicado'))}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Título</label>
                <Input {...register('title')} placeholder="Aquele meme que salvou meu dia" />
                <p className="text-xs text-destructive">{errors.title?.message}</p>
              </div>

              <div>
                <label className="text-sm font-semibold">Descrição</label>
                <Textarea {...register('description')} placeholder="Conte o contexto do meme..." />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Categoria</label>
                  <select className="h-11 w-full rounded-xl border bg-background px-3" {...register('category')}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">Status atual</label>
                  <select className="h-11 w-full rounded-xl border bg-background px-3" {...register('status')}>
                    <option value="publicado">publicado</option>
                    <option value="rascunho">rascunho</option>
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    O botão Publicar sempre salva como publicado; Salvar rascunho preserva rascunho.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">URL externa do vídeo</label>
                <Input {...register('externalUrl')} placeholder="https://.../video.mp4" disabled={Boolean(videoFile)} />
              </div>

              <div className="rounded-2xl border border-dashed p-4">
                <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                  <UploadCloud className="h-8 w-8 text-primary" />
                  <span className="font-semibold">Upload direto de vídeo</span>
                  <span className="text-xs text-muted-foreground">MP4/WebM recomendado</span>
                  <input className="hidden" type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                </label>
                {videoFile && <p className="mt-2 text-center text-sm text-muted-foreground">{videoFile.name}</p>}
              </div>

              <div className="rounded-2xl border border-dashed p-4">
                <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                  <ImagePlus className="h-8 w-8 text-secondary" />
                  <span className="font-semibold">Thumbnail manual</span>
                  <input className="hidden" type="file" accept="image/*" onChange={(e) => setThumbFile(e.target.files?.[0] || null)} />
                </label>
                <Button className="mt-3 w-full" type="button" variant="accent" onClick={autoThumb}>
                  <Wand2 className="h-4 w-4" /> Gerar automaticamente
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={handleSubmit((values) => saveVideo(values, 'rascunho'))}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar rascunho'}
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">Status selecionado no formulário: {selectedStatus}</p>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-[2rem] border bg-black">
                <div className="aspect-[9/16]">
                  {videoPreview ? (
                    <MediaPlayer src={videoPreview} poster={thumbPreview || undefined} controls muted active className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center text-white/70">Prévia do vídeo</div>
                  )}
                </div>
              </div>
              {thumbPreview && <img src={thumbPreview} className="h-40 w-full rounded-2xl object-cover" alt="thumbnail" />}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
