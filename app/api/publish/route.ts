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
    if (photo.is_published) return apiSuccess('Cette photo est déjà publiée.', { id });
    if (photo.bucket_name !== 'webcam-private') return apiError('Emplacement de capture invalide.', 422);

    const { data: file, error: downloadError } = await supabase.storage.from('webcam-private').download(photo.storage_path);
    if (downloadError) throw downloadError;
    publicPath = `webcam/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('album-public').upload(publicPath, file, {
      contentType: 'image/jpeg', cacheControl: '31536000', upsert: false,
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
    return apiSuccess('La photo a été ajoutée à l’album.', { id });
  } catch (error) {
    console.error('POST /api/publish', error);
    return apiError('Impossible d’ajouter cette photo à l’album.', 500);
  }
}
