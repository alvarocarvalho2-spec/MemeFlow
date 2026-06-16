import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date?: string | null) {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

export function timeAgo(date?: string | null) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  return formatDate(date).split(',')[0];
}

export function slugFileName(name: string) {
  const safe = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  return `${crypto.randomUUID()}-${safe}`;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function captureVideoFrame(video: HTMLVideoElement, cleanup: () => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, Math.max(0, (video.duration || 2) / 4));
    };
    video.onseeked = () => {
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponível'));
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          cleanup();
          if (!blob) return reject(new Error('Falha ao gerar thumbnail'));
          resolve(blob);
        }, 'image/jpeg', 0.82);
      } catch {
        cleanup();
        reject(new Error('O servidor do vídeo bloqueou captura de thumbnail por CORS.'));
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Vídeo inválido para gerar thumbnail'));
    };
  });
}

export async function generateVideoThumbnail(file: File): Promise<Blob> {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  return captureVideoFrame(video, () => URL.revokeObjectURL(url));
}

export async function generateVideoThumbnailFromUrl(url: string): Promise<Blob> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  return captureVideoFrame(video, () => undefined);
}
