import { PROGRESS_PHOTOS_BUCKET } from '@lifestyle-os/shared/sync';

import { getSupabase } from './supabase';

export async function uploadProgressPhoto(
  userId: string,
  photoId: string,
  localUri: string,
): Promise<string> {
  const path = `${userId}/${photoId}.jpg`;
  const response = await fetch(localUri);
  const blob = await response.blob();
  const { error } = await getSupabase().storage.from(PROGRESS_PHOTOS_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function getSignedPhotoUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .storage.from(PROGRESS_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) {
    console.warn('Signed URL failed:', error.message);
    return null;
  }
  return data.signedUrl;
}
