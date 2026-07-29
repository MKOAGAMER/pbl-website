import { getApiAdminContext } from '@/lib/admin-auth';
import { getCloudinaryConfig, signCloudinaryParams } from '@/lib/cloudinary';

export const runtime = 'nodejs';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  }

  const admin = await getApiAdminContext('editor');
  if (!admin) return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  const { supabase } = admin;
  const { id } = await context.params;
  const { data: asset } = await supabase
    .from('media_assets')
    .select('id, provider, provider_public_id')
    .eq('id', id)
    .maybeSingle();
  if (!asset) return Response.json({ error: 'Asset not found.' }, { status: 404 });
  if (asset.provider === 'supabase') {
    const separator = asset.provider_public_id.indexOf('/');
    const bucket = asset.provider_public_id.slice(0, separator);
    const path = asset.provider_public_id.slice(separator + 1);
    if (separator < 1 || !path) return Response.json({ error: 'Invalid storage asset.' }, { status: 409 });
    const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
    if (storageError) return Response.json({ error: 'Supabase Storage deletion failed.' }, { status: 502 });
  } else if (asset.provider === 'cloudinary') {
    const cloudinary = getCloudinaryConfig();
    if (!cloudinary) return Response.json({ error: 'Cloudinary is not configured.' }, { status: 503 });
    const timestamp = Math.floor(Date.now() / 1000);
    const signedParams = { public_id: asset.provider_public_id, timestamp };
    const payload = new URLSearchParams({
      public_id: asset.provider_public_id,
      timestamp: String(timestamp),
      api_key: cloudinary.apiKey,
      signature: signCloudinaryParams(signedParams, cloudinary.apiSecret),
    });
    const destroy = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/destroy`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: payload, cache: 'no-store',
    });
    const result = (await destroy.json()) as { result?: string };
    if (!destroy.ok || !['ok', 'not found'].includes(result.result ?? '')) return Response.json({ error: 'Cloudinary delete failed.' }, { status: 502 });
  } else {
    return Response.json({ error: 'Unsupported media provider.' }, { status: 409 });
  }

  const { error } = await supabase.from('media_assets').delete().eq('id', asset.id);
  if (error) return Response.json({ error: 'Unable to remove media metadata.' }, { status: 500 });
  return Response.json({ ok: true });
}
