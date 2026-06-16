export type VideoProvider = 'direct' | 'youtube' | 'vimeo' | 'tiktok' | 'instagram' | 'unknown';

const DIRECT_VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

export function getVideoProvider(url?: string | null): VideoProvider {
  if (!url) return 'unknown';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'youtube';
    if (host === 'vimeo.com' || host.endsWith('vimeo.com')) return 'vimeo';
    if (host === 'tiktok.com' || host.endsWith('tiktok.com') || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return 'tiktok';
    if (host === 'instagram.com' || host.endsWith('instagram.com')) return 'instagram';
    if (DIRECT_VIDEO_EXT.test(parsed.pathname) || parsed.pathname.includes('/storage/v1/object/public/')) return 'direct';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/').filter(Boolean)[1] || null;
    if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/').filter(Boolean)[1] || null;
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

export function getVimeoId(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part)) || null;
  } catch {
    return null;
  }
}

export function getTikTokId(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const videoIndex = parts.indexOf('video');
    if (videoIndex >= 0 && parts[videoIndex + 1]) return parts[videoIndex + 1];
    if (parts[0] === 'embed' && parts[1] === 'v2' && parts[2]) return parts[2];
    return null;
  } catch {
    return null;
  }
}

export function getInstagramEmbedPath(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const kind = parts.find((part) => ['p', 'reel', 'tv'].includes(part));
    if (!kind) return null;
    const idx = parts.indexOf(kind);
    const shortcode = parts[idx + 1];
    if (!shortcode) return null;
    return `/${kind}/${shortcode}/embed`;
  } catch {
    return null;
  }
}

export function getEmbedUrl(url: string, autoplay = false) {
  const provider = getVideoProvider(url);
  if (provider === 'youtube') {
    const id = getYouTubeId(url);
    if (!id) return null;
    const params = new URLSearchParams({ playsinline: '1', rel: '0', modestbranding: '1' });
    if (autoplay) {
      params.set('autoplay', '1');
    }
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }
  if (provider === 'vimeo') {
    const id = getVimeoId(url);
    if (!id) return null;
    const params = new URLSearchParams({ playsinline: '1', title: '0', byline: '0', portrait: '0' });
    if (autoplay) {
      params.set('autoplay', '1');
    }
    return `https://player.vimeo.com/video/${id}?${params.toString()}`;
  }
  if (provider === 'tiktok') {
    const id = getTikTokId(url);
    if (!id) return null;
    return `https://www.tiktok.com/embed/v2/${id}`;
  }
  if (provider === 'instagram') {
    const path = getInstagramEmbedPath(url);
    if (!path) return null;
    return `https://www.instagram.com${path}`;
  }
  return null;
}

export function getExternalThumbnail(url?: string | null) {
  if (!url) return null;
  if (getVideoProvider(url) === 'youtube') {
    const id = getYouTubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }
  return null;
}

export function isDirectPlayableVideo(url?: string | null) {
  return getVideoProvider(url) === 'direct';
}

export function isEmbeddableProvider(url?: string | null) {
  const provider = getVideoProvider(url);
  return provider === 'youtube' || provider === 'vimeo' || provider === 'tiktok' || provider === 'instagram';
}
