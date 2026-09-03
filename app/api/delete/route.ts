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
  try {
    const { id } = schema.parse(await request.json());
    const supabase = createAdminClient();
    const { data: photo, error } = await supabase.from('photos').select('storage_path,bucket_name').eq('id', id).single();
    if (error || !photo) return apiError('Ce souvenir n’existe plus.', 404);
    const { error: storageError } = await supabase.storage.from(photo.bucket_name).remove([photo.storage_path]);
    if (storageError) throw storageError;
    const { error: deleteError } = await supabase.from('photos').delete().eq('id', id);
    if (deleteError) throw deleteError;
    return apiSuccess('Souvenir supprimé.', { id });
  } catch (error) {
    console.error('POST /api/delete', error);
    return apiError('Impossible de supprimer ce souvenir.', 500);
  }
}
