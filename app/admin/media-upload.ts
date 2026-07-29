'use client';

import { createClient } from '@/app/lib/supabase/client';

export const imageBuckets = ['team-logos', 'player-photos', 'news-images', 'staff-avatars'] as const;
export type ImageBucket = (typeof imageBuckets)[number];

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type UploadedAsset = {
  id: string;
  secure_url: string;
  original_filename: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  created_at: string;
};

type UploadIntent = {
  bucket: ImageBucket;
  path: string;
  token: string;
};

function maxBytesFor(bucket: ImageBucket) {
  return bucket === 'news-images' ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
}

function validateImage(file: File, bucket: ImageBucket) {
  if (!acceptedImageTypes.has(file.type)) {
    throw new Error('รองรับเฉพาะไฟล์ JPG, PNG และ WebP');
  }

  const maxBytes = maxBytesFor(bucket);
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(`ไฟล์ต้องมีขนาดไม่เกิน ${maxBytes / 1024 / 1024} MB`);
  }
}

async function readDimensions(file: File) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      reject(new Error('อ่านขนาดรูปภาพไม่สำเร็จ'));
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

async function readJson<T>(response: Response) {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
  return payload as T;
}

/**
 * Uploads the file directly to Supabase Storage using a short-lived signed URL.
 * The image bytes never pass through the Next.js server, avoiding deployment
 * request-body limits while keeping intent creation and metadata protected.
 */
export async function uploadAdminImage(
  file: File,
  bucket: ImageBucket,
  onProgress?: (progress: number) => void,
) {
  validateImage(file, bucket);
  onProgress?.(8);

  const intentResponse = await fetch('/api/admin/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'prepare',
      bucket,
      fileName: file.name,
      contentType: file.type,
      bytes: file.size,
    }),
  });
  const { upload } = await readJson<{ upload: UploadIntent }>(intentResponse);
  onProgress?.(20);

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.token, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message || 'ส่งไฟล์ไปยังพื้นที่เก็บรูปไม่สำเร็จ');
  onProgress?.(82);

  const dimensions = await readDimensions(file).catch(() => ({ width: null, height: null }));
  const completeResponse = await fetch('/api/admin/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'complete',
      bucket: upload.bucket,
      path: upload.path,
      fileName: file.name,
      contentType: file.type,
      bytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
    }),
  });
  const { asset } = await readJson<{ asset: UploadedAsset }>(completeResponse);
  onProgress?.(100);
  return asset;
}
