import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';
import { getCloudinaryConfig, signCloudinaryParams } from '@/lib/cloudinary';
import { isSameOriginRequest } from '@/lib/request-security';

export const runtime = 'nodejs';

const buckets = ['team-logos', 'player-photos', 'news-images', 'staff-avatars'] as const;
type AssetBucket = (typeof buckets)[number];
const bucketSchema = z.enum(buckets);
const imageTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);
const mimeExtensions: Record<z.infer<typeof imageTypeSchema>, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const prepareSchema = z.object({
  action: z.literal('prepare'),
  bucket: bucketSchema,
  fileName: z.string().trim().min(1).max(255),
  contentType: imageTypeSchema,
  bytes: z.number().int().positive(),
});

const completeSchema = z.object({
  action: z.literal('complete'),
  bucket: bucketSchema,
  path: z.string().trim().min(1).max(512),
  fileName: z.string().trim().min(1).max(255),
  contentType: imageTypeSchema,
  bytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

const directUploadSchema = z.discriminatedUnion('action', [prepareSchema, completeSchema]);

function maxBytesFor(bucket: AssetBucket) {
  return bucket === 'news-images' ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  }

  const admin = await getApiAdminContext('editor');
  if (!admin) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  if (request.headers.get('content-type')?.includes('application/json')) {
    return handleDirectUpload(request, admin.supabase, admin.user.id);
  }

  // Kept for clients with an older bundle during a rolling deployment. New UI
  // uses the signed direct-upload path above so large files bypass server limits.
  return handleLegacyMultipartUpload(request, admin.supabase, admin.user.id);
}

async function handleDirectUpload(request: Request, supabase: SupabaseClient, userId: string) {
  const parsed = directUploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'ข้อมูลไฟล์ไม่ถูกต้อง รองรับเฉพาะ JPG, PNG และ WebP' }, { status: 400 });
  }

  const maxBytes = maxBytesFor(parsed.data.bucket);
  if (parsed.data.bytes > maxBytes) {
    return Response.json({ error: `ไฟล์ต้องไม่เกิน ${maxBytes / 1024 / 1024} MB` }, { status: 413 });
  }

  const bucketError = await ensureBucket(supabase, parsed.data.bucket);
  if (bucketError) return Response.json({ error: bucketError }, { status: 503 });

  if (parsed.data.action === 'prepare') {
    const extension = mimeExtensions[parsed.data.contentType];
    const path = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage
      .from(parsed.data.bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('[media:signed-upload]', error?.message);
      return Response.json({ error: 'เตรียมพื้นที่อัปโหลดไม่สำเร็จ กรุณาลองใหม่' }, { status: 503 });
    }

    return Response.json({
      upload: {
        bucket: parsed.data.bucket,
        path: data.path,
        token: data.token,
      },
    });
  }

  if (!parsed.data.path.startsWith(`${userId}/`) || parsed.data.path.includes('..')) {
    return Response.json({ error: 'เส้นทางไฟล์ไม่ถูกต้อง' }, { status: 403 });
  }

  const storage = supabase.storage.from(parsed.data.bucket);
  const { data: object, error: objectError } = await storage.info(parsed.data.path);
  if (objectError || !object) {
    return Response.json({ error: 'ไม่พบไฟล์ที่อัปโหลด กรุณาเลือกไฟล์แล้วลองใหม่' }, { status: 404 });
  }

  const actualBytes = object.size ?? parsed.data.bytes;
  const actualType = object.contentType ?? parsed.data.contentType;
  if (actualBytes > maxBytes || actualType !== parsed.data.contentType) {
    await storage.remove([parsed.data.path]);
    return Response.json({ error: 'ชนิดหรือขนาดไฟล์ไม่ตรงกับข้อมูลอัปโหลด' }, { status: 400 });
  }

  const publicUrl = storage.getPublicUrl(parsed.data.path).data.publicUrl;
  const asset = await saveMetadata(supabase, {
    provider: 'supabase',
    provider_public_id: `${parsed.data.bucket}/${parsed.data.path}`,
    url: publicUrl,
    secure_url: publicUrl,
    original_filename: parsed.data.fileName,
    format: mimeExtensions[parsed.data.contentType],
    bytes: actualBytes,
    width: parsed.data.width,
    height: parsed.data.height,
    uploaded_by: userId,
  });

  if (!asset) {
    await storage.remove([parsed.data.path]);
    return Response.json({ error: 'บันทึกข้อมูลรูปไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }

  return Response.json({ asset }, { status: 201 });
}

async function handleLegacyMultipartUpload(request: Request, supabase: SupabaseClient, userId: string) {
  const incoming = await request.formData();
  const file = incoming.get('file');
  const requestedBucket = bucketSchema.safeParse(incoming.get('bucket') ?? 'news-images');
  const bucket: AssetBucket = requestedBucket.success ? requestedBucket.data : 'news-images';

  if (!(file instanceof File) || !imageTypeSchema.safeParse(file.type).success) {
    return Response.json({ error: 'รองรับเฉพาะไฟล์ JPG, PNG และ WebP' }, { status: 400 });
  }
  const maxBytes = maxBytesFor(bucket);
  if (file.size > maxBytes) {
    return Response.json({ error: `ไฟล์ต้องไม่เกิน ${maxBytes / 1024 / 1024} MB` }, { status: 413 });
  }

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
      const upload = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
        { method: 'POST', body: payload, cache: 'no-store' },
      );
      const result = await upload.json() as {
        public_id?: string;
        url?: string;
        secure_url?: string;
        original_filename?: string;
        format?: string;
        bytes?: number;
        width?: number;
        height?: number;
      };
      if (upload.ok && result.public_id && result.url && result.secure_url) {
        const asset = await saveMetadata(supabase, {
          provider: 'cloudinary',
          provider_public_id: result.public_id,
          url: result.url,
          secure_url: result.secure_url,
          original_filename: result.original_filename ?? file.name,
          format: result.format ?? null,
          bytes: result.bytes ?? file.size,
          width: result.width ?? null,
          height: result.height ?? null,
          uploaded_by: userId,
        });
        if (asset) return Response.json({ asset }, { status: 201 });
      }
    } catch (error) {
      console.warn('[media:cloudinary-fallback]', error instanceof Error ? error.message : error);
    }
  }

  const bucketError = await ensureBucket(supabase, bucket);
  if (bucketError) return Response.json({ error: bucketError }, { status: 503 });

  const contentType = imageTypeSchema.parse(file.type);
  const extension = mimeExtensions[contentType];
  const path = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const storage = supabase.storage.from(bucket);
  const uploadResult = await storage.upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadResult.error) {
    console.error('[media:supabase-upload]', uploadResult.error.message);
    return Response.json({ error: 'อัปโหลดไม่สำเร็จ กรุณาตรวจสอบ Supabase Storage' }, { status: 503 });
  }

  const publicUrl = storage.getPublicUrl(path).data.publicUrl;
  const asset = await saveMetadata(supabase, {
    provider: 'supabase',
    provider_public_id: `${bucket}/${path}`,
    url: publicUrl,
    secure_url: publicUrl,
    original_filename: file.name,
    format: extension,
    bytes: file.size,
    width: null,
    height: null,
    uploaded_by: userId,
  });
  if (!asset) {
    await storage.remove([path]);
    return Response.json({ error: 'บันทึกข้อมูลไฟล์ไม่สำเร็จ กรุณารัน migration ล่าสุด' }, { status: 500 });
  }
  return Response.json({ asset }, { status: 201 });
}

async function ensureBucket(supabase: SupabaseClient, bucket: AssetBucket) {
  const { data: storageBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('[media:storage-buckets]', listError.message);
    return 'ไม่สามารถตรวจสอบพื้นที่เก็บรูปได้ กรุณาตรวจสอบ Supabase Storage';
  }
  if (storageBuckets.some((item) => item.name === bucket)) return null;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: bucket === 'news-images' ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
    allowedMimeTypes: Object.keys(mimeExtensions),
  });
  if (createError && !/already exists/i.test(createError.message)) {
    console.error('[media:create-bucket]', createError.message);
    return 'ยังไม่มีพื้นที่เก็บรูปใน Supabase กรุณารัน storage.sql';
  }
  return null;
}

async function saveMetadata(supabase: SupabaseClient, payload: Record<string, unknown>) {
  const fields = 'id, secure_url, original_filename, width, height, bytes, created_at';
  const { data, error } = await supabase.from('media_assets').insert(payload).select(fields).single();
  if (!error) return data;

  if (error.code === '23505' && typeof payload.provider_public_id === 'string') {
    const { data: existing } = await supabase
      .from('media_assets')
      .select(fields)
      .eq('provider_public_id', payload.provider_public_id)
      .maybeSingle();
    if (existing) return existing;
  }

  console.error('[media:metadata]', error.message);
  return null;
}
