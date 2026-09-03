import { z } from 'zod';
import type { Memory, MediaType } from '@/lib/types';

export const IMAGE_LIMIT = 8 * 1024 * 1024;
export const VIDEO_LIMIT = 40 * 1024 * 1024;
export const WEBCAM_VIDEO_LIMIT = 3 * 1024 * 1024;

export const allowedMedia: Record<string, { extensions: string[]; type: MediaType; max: number }> = {
  'image/jpeg': { extensions: ['jpg', 'jpeg'], type: 'image', max: IMAGE_LIMIT },
  'image/png': { extensions: ['png'], type: 'image', max: IMAGE_LIMIT },
  'image/webp': { extensions: ['webp'], type: 'image', max: IMAGE_LIMIT },
  'video/mp4': { extensions: ['mp4', 'm4v'], type: 'video', max: VIDEO_LIMIT },
  'video/webm': { extensions: ['webm'], type: 'video', max: VIDEO_LIMIT },
  'video/quicktime': { extensions: ['mov'], type: 'video', max: VIDEO_LIMIT },
  'video/x-m4v': { extensions: ['m4v'], type: 'video', max: VIDEO_LIMIT },
};

export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export const finalizeMediaSchema = uploadRequestSchema.extend({
  storagePath: z.string().regex(/^manual\/[a-f0-9-]+\.(jpg|png|webp|mp4|webm|mov|m4v)$/),
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).default(''),
  memoryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export function validateUpload(filename: string, mime: string, size: number) {
  const definition = allowedMedia[mime];
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  if (!definition || !definition.extensions.includes(extension)) throw new Error('Format de fichier non autorisé.');
  if (size < 100 || size > definition.max) throw new Error(`Le fichier dépasse la limite de ${definition.type === 'image' ? '8' : '40'} Mo.`);
  return { ...definition, extension: definition.type === 'image' && extension === 'jpeg' ? 'jpg' : extension };
}

export function toMemory(row: Record<string, unknown>, filepath: string): Memory {
  const timelineDate = String(row.memory_date || row.created_at);
  return {
    id: String(row.id),
    storage_path: String(row.storage_path),
    bucket_name: row.bucket_name as Memory['bucket_name'],
    filepath,
    filename: String(row.filename),
    media_type: row.media_type as Memory['media_type'],
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    memory_date: row.memory_date ? String(row.memory_date) : null,
    source: row.source as Memory['source'],
    is_published: Boolean(row.is_published),
    created_at: String(row.created_at),
    published_at: row.published_at ? String(row.published_at) : null,
    year: timelineDate.slice(0, 4),
  };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.get('host'); } catch { return false; }
}
