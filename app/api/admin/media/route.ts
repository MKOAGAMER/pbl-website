import { randomUUID } from 'node:crypto';
import { getApiAdminContext } from '@/lib/admin-auth';
import { getCloudinaryConfig, signCloudinaryParams } from '@/lib/cloudinary';

export const runtime = 'nodejs';

const buckets = ['team-logos', 'player-photos', 'news-images', 'staff-avatars'] as const;
type AssetBucket = typeof buckets[number];
const mimeExtensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const admin = await getApiAdminContext('editor');
  if (!admin) return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  const { supabase, user } = admin;

  const incoming = await request.formData();
  const file = incoming.get('file');
  const requestedBucket = String(incoming.get('bucket') ?? 'news-images') as AssetBucket;
  const bucket: AssetBucket = buckets.includes(requestedBucket) ? requestedBucket : 'news-images';
  if (!(file instanceof File) || !mimeExtensions[file.type]) {
    return Response.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG และ WebP' }, { status: 400 });
  }
  const maxBytes = bucket === 'news-images' ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxBytes) return Response.json({ error: `ไฟล์ต้องไม่เกิน ${maxBytes / 1024 / 1024} MB` }, { status: 413 });

  const cloudinary = getCloudinaryConfig();
  if (cloudinary) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = `pbal/${bucket}`;
      const signedParams = { folder, timestamp };
      const payload = new FormData();
      payload.set('file', file);
      payload.set('api_key', cloudinary.apiKey);
      payload.set('folder', folder);
      payload.set('timestamp', String(timestamp));
      payload.set('signature', signCloudinaryParams(signedParams, cloudinary.apiSecret));
      const upload = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`, { method: 'POST', body: payload, cache: 'no-store' });
      const result = await upload.json() as { public_id?: string; url?: string; secure_url?: string; original_filename?: string; format?: string; bytes?: number; width?: number; height?: number };
      if (upload.ok && result.public_id && result.url && result.secure_url) {
        const saved = await saveMetadata(supabase, {
          provider: 'cloudinary', provider_public_id: result.public_id, url: result.url, secure_url: result.secure_url,
          original_filename: result.original_filename ?? file.name, format: result.format ?? null, bytes: result.bytes ?? file.size,
          width: result.width ?? null, height: result.height ?? null, uploaded_by: user.id,
        });
        if (saved) return Response.json({ asset: saved }, { status: 201 });
      }
    } catch (error) {
      console.warn('[media:cloudinary-fallback]', error instanceof Error ? error.message : error);
    }
  }

  // Cloudinary is optional. Supabase Storage is the built-in fallback so file
  // uploads from a computer keep working with the existing public buckets.
  const { data: storageBuckets, error: bucketListError } = await supabase.storage.listBuckets();
  if (bucketListError) {
    console.error('[media:storage-buckets]', bucketListError.message);
    return Response.json({ error: 'ไม่สามารถตรวจสอบพื้นที่เก็บรูปได้ กรุณาตรวจสอบ Supabase Storage' }, { status: 503 });
  }
  if (!storageBuckets.some((item) => item.name === bucket)) {
    const { error: bucketCreateError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: bucket === 'news-images' ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
      allowedMimeTypes: Object.keys(mimeExtensions),
    });
    if (bucketCreateError && !/already exists/i.test(bucketCreateError.message)) {
      console.error('[media:create-bucket]', bucketCreateError.message);
      return Response.json({ error: 'ยังไม่มีพื้นที่เก็บรูปใน Supabase กรุณารัน storage.sql' }, { status: 503 });
    }
  }
  const extension = mimeExtensions[file.type];
  const storagePath = `${user.id}/${Date.now()}-${randomUUID()}.${extension}`;
  const uploadResult = await supabase.storage.from(bucket).upload(storagePath, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadResult.error) {
    console.error('[media:supabase-upload]', uploadResult.error.message);
    return Response.json({ error: 'อัปโหลดไม่สำเร็จ กรุณารัน supabase/storage.sql และตรวจ bucket ของรูปภาพ' }, { status: 503 });
  }
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  const providerPublicId = `${bucket}/${storagePath}`;
  const saved = await saveMetadata(supabase, {
    provider: 'supabase', provider_public_id: providerPublicId, url: publicUrl, secure_url: publicUrl,
    original_filename: file.name, format: extension, bytes: file.size, width: null, height: null, uploaded_by: user.id,
  });
  if (!saved) {
    await supabase.storage.from(bucket).remove([storagePath]);
    return Response.json({ error: 'อัปโหลดรูปแล้วแต่บันทึกข้อมูลไฟล์ไม่สำเร็จ กรุณารัน migration ล่าสุด' }, { status: 500 });
  }
  return Response.json({ asset: saved }, { status: 201 });
}

async function saveMetadata(supabase: NonNullable<Awaited<ReturnType<typeof getApiAdminContext>>>['supabase'], payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('media_assets').insert(payload).select('id, secure_url, original_filename, width, height, bytes, created_at').single();
  if (error) {
    console.error('[media:metadata]', error.message);
    return null;
  }
  return data;
}
