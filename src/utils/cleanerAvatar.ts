import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export async function pickCleanerImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

export async function uploadCleanerAvatar(cleanerId: string, localUri: string): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const path = `cleaners/${cleanerId}.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Selected image could not be read. Please try another photo.');
  }

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { upsert: true, contentType });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function deleteCleanerAvatarFiles(cleanerId: string): Promise<void> {
  const paths = ['jpg', 'png', 'jpeg', 'webp'].map(ext => `cleaners/${cleanerId}.${ext}`);
  await supabase.storage.from('avatars').remove(paths);
}
