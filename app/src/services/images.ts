import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Pick an image from the library (square-cropped, compressed) and upload it
 * into `<bucket>/<userId>/<name>@<ts>.jpg`. Returns the storage path, or
 * null if the user cancels.
 */
export async function pickAndUploadImage(
  bucket: string,
  userId: string,
  name: string
): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is needed.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });
  if (result.canceled || !result.assets[0]?.base64) return null;

  const path = `${userId}/${name}@${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, base64ToBytes(result.assets[0].base64), {
      contentType: result.assets[0].mimeType ?? 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;
  return path;
}

export function publicImageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
