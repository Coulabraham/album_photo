import { createAdminClient } from '@/lib/supabase/admin';
import { fileTypeFromBuffer } from 'file-type';
import { getAdminUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/http';
import { finalizeMediaSchema, sameOrigin, toMemory, validateUpload } from '@/lib/media';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError('Origine non autorisée.', 403);
  if (!await getAdminUser()) return apiError('Session expirée.', 401);
  let storagePath = '';
  try {
    const input = finalizeMediaSchema.parse(await request.json());
    storagePath = input.storagePath;
    const declared = validateUpload(input.filename, input.mime, input.size);
    const supabase = createAdminClient();
    const [folder, objectName] = storagePath.split('/');
    const { data: objects, error: listError } = await supabase.storage.from('album-public').list(folder, { search: objectName, limit: 10 });
    if (listError) throw listError;
    const object = objects?.find((item) => item.name === objectName);
    const actualSize = Number(object?.metadata?.size || 0);
    const actualMime = String(object?.metadata?.mimetype || input.mime);
    if (!object || actualSize !== input.size || actualMime !== input.mime) throw new Error('Le fichier transféré ne correspond pas aux informations annoncées.');
    const { data: publicUrl } = supabase.storage.from('album-public').getPublicUrl(storagePath);
    const signatureResponse = await fetch(publicUrl.publicUrl, { headers: { Range: 'bytes=0-4095' }, cache: 'no-store' });
    if (!signatureResponse.ok) throw new Error('Impossible de vérifier le contenu du fichier.');
    const detected = await fileTypeFromBuffer(new Uint8Array(await signatureResponse.arrayBuffer()));
    if (!detected) throw new Error('Signature de fichier inconnue.');
    const definition = validateUpload(input.filename, detected.mime, input.size);
    if (definition.type !== declared.type) throw new Error('Le contenu réel ne correspond pas au type annoncé.');

    const { data, error } = await supabase.from('photos').insert({
      storage_path: storagePath,
      bucket_name: 'album-public',
      filename: input.filename,
      media_type: definition.type,
      title: input.title,
      description: input.description,
      memory_date: input.memoryDate || null,
      source: 'upload',
      is_published: true,
      published_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;
    return apiSuccess('Le souvenir a rejoint l’album.', { photo: toMemory(data, publicUrl.publicUrl) }, 201);
  } catch (error) {
    if (storagePath) await createAdminClient().storage.from('album-public').remove([storagePath]);
    console.error('POST /api/media', error);
    return apiError(error instanceof Error ? error.message : 'Impossible d’ajouter ce média.', 422);
  }
}
