import * as React from 'react';
import { AlertTriangle, ExternalLink, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEmbedUrl, getVideoProvider, isDirectPlayableVideo } from '@/lib/videoUrl';

type MediaPlayerProps = {
  src: string;
  poster?: string | null;
  active?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onClick?: () => void;
  onToggleMuted?: (next: boolean) => void;
  /**
   * Social embeds (Instagram/TikTok) capturam wheel/touch e muitas vezes têm altura
   * interna maior que a viewport. No feed isso quebra o snap scroll. Por padrão,
   * eles viram um preview clicável; no modal fullscreen passamos true.
   */
  interactiveEmbeds?: boolean;
};

function ProviderPreview({ src, poster, provider, onClick, className }: { src: string; poster?: string | null; provider: string; onClick?: () => void; className?: string }) {
  const label = provider === 'tiktok' ? 'TikTok' : provider === 'instagram' ? 'Instagram' : 'vídeo externo';
  return (
    <button type="button" onClick={onClick} className={cn('relative flex h-full w-full items-center justify-center overflow-hidden bg-black text-center text-white', className)}>
      {poster ? <img src={poster} alt="thumbnail" className="absolute inset-0 h-full w-full object-cover opacity-50" /> : <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-secondary/40 to-black" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/35" />
      <div className="relative z-10 mx-6 max-w-xs rounded-3xl border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          <Play className="ml-1 h-8 w-8 fill-white" />
        </div>
        <p className="text-lg font-black">Assistir no player do {label}</p>
        <p className="mt-2 text-sm text-white/75">Toque para abrir em tela cheia. Mantemos o feed sem iframe para preservar a rolagem estilo Reels.</p>
        <a href={src} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white underline-offset-4 hover:underline">
          Link original <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </button>
  );
}

export function MediaPlayer({ src, poster, active = true, muted = true, loop = true, controls = false, className, videoRef, onClick, interactiveEmbeds = false, onToggleMuted }: MediaPlayerProps) {
  const provider = getVideoProvider(src);
  // Gerar URL de embed com autoplay quando `active`.
  // Para garantir autoplay no feed sem interação, adicionamos params de
  // mute ao embed quando estiver ativo e mutado.
  let embedUrl = getEmbedUrl(src, active);
  if (embedUrl && active && muted) {
    try {
      const u = new URL(embedUrl);
      u.searchParams.set('autoplay', '1');
      u.searchParams.set('mute', '1');
      u.searchParams.set('muted', '1');
      embedUrl = u.toString();
    } catch {
      // fallback: append query params
      embedUrl = `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&muted=1`;
    }
  }
  const [failed, setFailed] = React.useState(false);
  const isSocialEmbed = provider === 'tiktok' || provider === 'instagram';

  React.useEffect(() => setFailed(false), [src]);

  if (isDirectPlayableVideo(src) || provider === 'unknown') {
    if (failed) {
      return (
        <div className={cn('relative flex h-full w-full flex-col items-center justify-center bg-black p-6 text-center text-white', className)}>
          {poster ? <img src={poster} alt="thumbnail" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
          <div className="relative z-10 max-w-xs rounded-2xl bg-black/60 p-4 backdrop-blur">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-accent" />
            <p className="font-bold">Este link não pôde ser reproduzido pelo player HTML5</p>
            <p className="mt-2 text-sm text-white/75">Use URL direta de arquivo de vídeo (.mp4/.webm) ou links de players com embed.</p>
            <a href={src} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-accent underline">Abrir link original</a>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('relative h-full w-full', className)}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={src}
          poster={poster || undefined}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          onClick={onClick}
          onError={() => setFailed(true)}
          autoPlay={active}
        />
        {muted && active && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const el = videoRef?.current;
              onToggleMuted?.(false);
              if (el) {
                try {
                  el.muted = false;
                  await el.play();
                } catch {
                  // ignore
                }
              }
            }}
            className="absolute right-4 bottom-4 z-30 rounded-full bg-black/60 p-3 text-white backdrop-blur"
            aria-label="Ativar som"
          >
            ▶︎ Som
          </button>
        )}
      </div>
    );
  }

  if (embedUrl) {
    if (isSocialEmbed && !interactiveEmbeds) {
      return <ProviderPreview src={src} poster={poster} provider={provider} onClick={onClick} className={className} />;
    }

    const iframe = (
      <iframe
        title="player externo"
        src={embedUrl}
        className="block h-full w-full border-0"
        scrolling="no"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
      />
    );

    if (isSocialEmbed) {
      return (
        <div className={cn('flex h-full w-full items-center justify-center overflow-hidden bg-black p-0', className)}>
          <div className="h-[100svh] max-h-[100svh] w-full max-w-[460px] overflow-hidden bg-black sm:aspect-[9/16] sm:h-auto sm:max-h-[96svh]">
            {iframe}
          </div>
        </div>
      );
    }

    return (
      <div className={cn('relative h-full w-full overflow-hidden bg-black', className)}>
        {!active && poster ? (
          <>
            <img src={poster} alt="thumbnail" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-white/20 p-5 text-white backdrop-blur">
                <Play className="h-9 w-9 fill-white" />
              </div>
            </div>
          </>
        ) : iframe}
      </div>
    );
  }

  return (
    <div className={cn('relative flex h-full w-full flex-col items-center justify-center bg-black p-6 text-center text-white', className)}>
      {poster ? <img src={poster} alt="thumbnail" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
      <div className="relative z-10 max-w-xs rounded-2xl bg-black/60 p-4 backdrop-blur">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-accent" />
        <p className="font-bold">Link externo não reproduzível diretamente</p>
        <p className="mt-2 text-sm text-white/75">
          Use uma URL direta de vídeo (.mp4/.webm) ou um provedor com embed oficial. Alguns sites bloqueiam reprodução fora da origem.
        </p>
        <a href={src} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-accent underline">
          Abrir link original
        </a>
      </div>
    </div>
  );
}
