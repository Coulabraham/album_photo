import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/http';
import { sameOrigin, uploadRequestSchema, validateUpload } from '@/lib/media';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError('Origine non autorisée.', 403);
  if (!await getAdminUser()) return apiError('Session expirée.', 401);
  try {
    const input = uploadRequestSchema.parse(await request.json());
    const definition = validateUpload(input.filename, input.mime, input.size);
    const storagePath = `manual/${crypto.randomUUID()}.${definition.extension}`;
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from('album-public').createSignedUploadUrl(storagePath);
    if (error) throw error;
    return apiSuccess('URL créée.', { storagePath, token: data.token });
  } catch (error) {
    console.error('POST /api/upload-url', error);
    return apiError(error instanceof Error ? error.message : 'Fichier invalide.', 422);
  }
}
