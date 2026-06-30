import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export type BookingPhotoType = 'before' | 'after';

export interface BookingPhoto {
  id: number;
  booking_id: number;
  photo_url: string;
  photo_type: BookingPhotoType;
  uploaded_by: string;
  created_at: string;
}

const BUCKET = 'booking_photos';

export function getStoragePath(photoUrl: string): string {
  if (!photoUrl.startsWith('http')) return photoUrl.split('?')[0];
  const marker = `/${BUCKET}/`;
  const idx = photoUrl.indexOf(marker);
  if (idx >= 0) return photoUrl.slice(idx + marker.length).split('?')[0];
  return photoUrl;
}

export async function resolvePhotoDisplayUrl(photoUrl: string): Promise<string> {
  const path = getStoragePath(photoUrl);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return photoUrl;
  return data.signedUrl;
}

export async function fetchBookingPhotos(bookingId: number): Promise<BookingPhoto[]> {
  const { data, error } = await supabase
    .from('booking_photos')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function pickBookingPhoto(source: 'camera' | 'gallery'): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

export async function uploadBookingPhoto(
  bookingId: number,
  localUri: string,
  photoType: BookingPhotoType,
  userId: string,
): Promise<BookingPhoto> {
  const ext = localUri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${bookingId}/${fileName}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Could not read the selected photo.');
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { upsert: false, contentType });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('booking_photos')
    .insert({
      booking_id: bookingId,
      photo_url: path,
      photo_type: photoType,
      uploaded_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function finishBookingOrder(bookingId: number): Promise<void> {
  const photos = await fetchBookingPhotos(bookingId);
  const hasBefore = photos.some(p => p.photo_type === 'before');
  const hasAfter = photos.some(p => p.photo_type === 'after');
  if (!hasBefore || !hasAfter) {
    throw new Error('Upload at least one before and one after photo before finishing.');
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) throw error;
}
