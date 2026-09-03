import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/http';
import { sameOrigin } from '@/lib/media';

export const runtime = 'nodejs';

const schema = z.object({ id: z.string().uuid() });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError('Origine non autorisée.', 403);
  if (!await getAdminUser()) return apiError('Session expirée.', 401);
  let publicPath = '';
  try {
    const { id } = schema.parse(await request.json());
    const supabase = createAdminClient();
    const { data: photo, error } = await supabase.from('photos').select('*').eq('id', id).single();
    if (error || !photo) return apiError('Cette capture n’existe plus.', 404);
    if (photo.is_published) return apiSuccess('Ce souvenir est déjà publié.', { id });
    if (photo.bucket_name !== 'webcam-private') return apiError('Emplacement de capture invalide.', 422);

    const { data: file, error: downloadError } = await supabase.storage.from('webcam-private').download(photo.storage_path);
    if (downloadError) throw downloadError;
    const extension = String(photo.storage_path).split('.').pop()?.toLowerCase();
    if (!extension || !['jpg', 'webm', 'mp4'].includes(extension)) return apiError('Format de capture invalide.', 422);
    const contentType = extension === 'jpg' ? 'image/jpeg' : extension === 'mp4' ? 'video/mp4' : 'video/webm';
    publicPath = `webcam/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('album-public').upload(publicPath, file, {
      contentType, cacheControl: '31536000', upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase.from('photos').update({
      storage_path: publicPath,
      bucket_name: 'album-public',
      is_published: true,
      published_at: new Date().toISOString(),
    }).eq('id', id);
    if (updateError) {
      await supabase.storage.from('album-public').remove([publicPath]);
      throw updateError;
    }
    await supabase.storage.from('webcam-private').remove([photo.storage_path]);
    return apiSuccess('Le souvenir a été ajouté à l’album.', { id });
  } catch (error) {
    console.error('POST /api/publish', error);
    return apiError('Impossible d’ajouter ce souvenir à l’album.', 500);
  }
}
