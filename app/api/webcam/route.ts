import { fileTypeFromBuffer } from 'file-type';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, apiSuccess } from '@/lib/http';
import { IMAGE_LIMIT, sameOrigin } from '@/lib/media';

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
    const body = await request.json();
    if (typeof body.image !== 'string') return apiError('Capture invalide.', 422);
    const match = body.image.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=\r\n]+)$/);
    if (!match) return apiError('Format de capture invalide.', 422);
    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.length < 100 || buffer.length > IMAGE_LIMIT) return apiError('Capture invalide ou trop volumineuse.', 422);
    const detected = await fileTypeFromBuffer(buffer);
    if (detected?.mime !== 'image/jpeg') return apiError('Le contenu reçu n’est pas un JPEG valide.', 422);

    const supabase = createAdminClient();
    const filename = `souvenir-${crypto.randomUUID()}.jpg`;
    storagePath = `pending/${filename}`;
    const { error: uploadError } = await supabase.storage.from('webcam-private').upload(storagePath, buffer, {
      contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data, error } = await supabase.from('photos').insert({
      storage_path: storagePath,
      bucket_name: 'webcam-private',
      filename,
      media_type: 'image',
      title: 'Le jour où tu as ouvert cet album',
      description: 'Un instant spontané, capturé avec ton accord.',
      source: 'webcam',
      is_published: false,
    }).select('id').single();
    if (error) {
      await supabase.storage.from('webcam-private').remove([storagePath]);
      throw error;
    }
    return apiSuccess('Photo enregistrée.', { id: data.id }, 201);
  } catch (error) {
    console.error('POST /api/webcam', error);
    return apiError('Une erreur est survenue pendant l’enregistrement.', 500);
  }
}
