import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/http';
import { toMemory } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const includePrivate = request.nextUrl.searchParams.get('include_private') === '1';
    if (includePrivate && !await getAdminUser()) return apiError('Accès non autorisé.', 401);
    const supabase = createAdminClient();
    let query = supabase.from('photos').select('*').order('memory_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
    if (!includePrivate) query = query.eq('is_published', true);
    const { data, error } = await query;
    if (error) throw error;
    const photos = await Promise.all((data || []).map(async (row) => {
      if (row.bucket_name === 'album-public') {
        const { data: url } = supabase.storage.from(row.bucket_name).getPublicUrl(row.storage_path);
        return toMemory(row, url.publicUrl);
      }
      const { data: signed, error: signedError } = await supabase.storage.from(row.bucket_name).createSignedUrl(row.storage_path, 3600);
      if (signedError) throw signedError;
      return toMemory(row, signed.signedUrl);
    }));
    return apiSuccess('Souvenirs chargés.', { photos, count: photos.length });
  } catch (error) {
    console.error('GET /api/photos', error);
    return apiError('Impossible de charger les souvenirs.', 500);
  }
}
