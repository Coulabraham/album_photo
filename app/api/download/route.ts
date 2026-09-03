import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid();

export async function GET(request: NextRequest) {
  if (!await getAdminUser()) return apiError('Session expirée.', 401);
  const result = idSchema.safeParse(request.nextUrl.searchParams.get('id'));
  if (!result.success) return apiError('Souvenir invalide.', 422);

  try {
    const supabase = createAdminClient();
    const { data: media, error } = await supabase
      .from('photos')
      .select('storage_path,bucket_name,filename')
      .eq('id', result.data)
      .single();
    if (error || !media) return apiError('Ce souvenir n’existe plus.', 404);

    const safeFilename = String(media.filename).replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 180) || 'souvenir';
    const { data, error: signedError } = await supabase.storage
      .from(media.bucket_name)
      .createSignedUrl(media.storage_path, 60, { download: safeFilename });
    if (signedError) throw signedError;
    return NextResponse.redirect(data.signedUrl, 307);
  } catch (error) {
    console.error('GET /api/download', error);
    return apiError('Impossible de télécharger ce souvenir.', 500);
  }
}
