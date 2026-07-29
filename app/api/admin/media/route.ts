import { getApiAdminContext } from '@/lib/admin-auth';
import { getCloudinaryConfig, signCloudinaryParams } from '@/lib/cloudinary';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  }

  const admin = await getApiAdminContext('editor');
  if (!admin) return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  const { supabase, user } = admin;
  const cloudinary = getCloudinaryConfig();
  if (!cloudinary) {
    return Response.json({ error: 'Cloudinary is not configured.' }, { status: 503 });
  }

  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return Response.json({ error: 'Select a valid image.' }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: 'Image must be 8 MB or smaller.' }, { status: 413 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams = { folder: 'pbal', timestamp };
  const payload = new FormData();
  payload.set('file', file);
  payload.set('api_key', cloudinary.apiKey);
  payload.set('folder', signedParams.folder);
  payload.set('timestamp', String(timestamp));
  payload.set('signature', signCloudinaryParams(signedParams, cloudinary.apiSecret));

  const upload = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
    { method: 'POST', body: payload, cache: 'no-store' },
  );
  const result = (await upload.json()) as {
    public_id?: string;
    url?: string;
    secure_url?: string;
    original_filename?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    error?: { message?: string };
  };
  if (!upload.ok || !result.public_id || !result.url || !result.secure_url) {
    return Response.json(
      { error: result.error?.message ?? 'Cloudinary upload failed.' },
      { status: 502 },
    );
  }

  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      provider: 'cloudinary',
      provider_public_id: result.public_id,
      url: result.url,
      secure_url: result.secure_url,
      original_filename: result.original_filename ?? file.name,
      format: result.format ?? null,
      bytes: result.bytes ?? file.size,
      width: result.width ?? null,
      height: result.height ?? null,
      uploaded_by: user.id,
    })
    .select('id, secure_url, original_filename, width, height, bytes, created_at')
    .single();
  if (error) {
    console.error('Unable to store uploaded media metadata', error);
    return Response.json({ error: 'Image uploaded but metadata could not be saved.' }, { status: 500 });
  }

  return Response.json({ asset: data }, { status: 201 });
}
