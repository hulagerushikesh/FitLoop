import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { updateProfile } from './profile';

// base64 → bytes without extra deps (atob exists on web and Hermes).
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface AvatarResult {
  path: string;
  url: string;
}

/** Public URL for a stored avatar path, cache-busted so replacements show up. */
export function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${encodeURIComponent(path.split('@')[1] ?? '')}`;
}

/**
 * Pick a square photo, compress it (quality 0.5 ≈ a few hundred KB), upload
 * to the user's folder in the avatars bucket, and save the path on the
 * profile. Returns null if the user cancels the picker.
 */
export async function pickAndUploadAvatar(userId: string): Promise<AvatarResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is needed to set a profile photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });
  if (result.canceled || !result.assets[0]?.base64) return null;

  // Timestamp in the filename doubles as a cache-buster (see avatarUrl).
  const path = `${userId}/avatar@${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, base64ToBytes(result.assets[0].base64), {
      contentType: result.assets[0].mimeType ?? 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  await updateProfile(userId, { avatar_path: path });

  const url = avatarUrl(path);
  if (!url) throw new Error('Failed to resolve avatar URL.');
  return { path, url };
}
