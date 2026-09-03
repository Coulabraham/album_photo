import { fileTypeFromBuffer } from 'file-type';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/http';
import { sameOrigin, WEBCAM_VIDEO_LIMIT } from '@/lib/media';

export const runtime = 'nodejs';

const attempts = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= 5) return true;
  recent.push(now); attempts.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError('Origine non autorisée.', 403);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(ip)) return apiError('Trop de captures. Réessayez plus tard.', 429);
  let storagePath = '';
  try {
    const formData = await request.formData();
    const video = formData.get('video');
    if (!(video instanceof File)) return apiError('Vidéo invalide.', 422);
    if (video.size < 100 || video.size > WEBCAM_VIDEO_LIMIT) return apiError('Vidéo invalide ou trop volumineuse.', 422);
    const declaredMime = video.type.split(';')[0];
    if (!['video/webm', 'video/mp4'].includes(declaredMime)) return apiError('Format vidéo non autorisé.', 422);
    const buffer = Buffer.from(await video.arrayBuffer());
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !['video/webm', 'video/mp4'].includes(detected.mime) || detected.mime !== declaredMime) {
      return apiError('Le contenu reçu n’est pas une vidéo valide.', 422);
    }

    const supabase = createAdminClient();
    const extension = detected.mime === 'video/mp4' ? 'mp4' : 'webm';
    const filename = `souvenir-${crypto.randomUUID()}.${extension}`;
    storagePath = `pending/${filename}`;
    const { error: uploadError } = await supabase.storage.from('webcam-private').upload(storagePath, buffer, {
      contentType: detected.mime, cacheControl: '3600', upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data, error } = await supabase.from('photos').insert({
      storage_path: storagePath,
      bucket_name: 'webcam-private',
      filename,
      media_type: 'video',
      title: 'Le jour où tu as ouvert cet album',
      description: 'Trois secondes spontanées, enregistrées avec ton accord.',
      source: 'webcam',
      is_published: false,
    }).select('id').single();
    if (error) {
      await supabase.storage.from('webcam-private').remove([storagePath]);
      throw error;
    }
    return apiSuccess('Vidéo enregistrée.', { id: data.id }, 201);
  } catch (error) {
    console.error('POST /api/webcam', error);
    return apiError('Une erreur est survenue pendant l’enregistrement.', 500);
  }
}
