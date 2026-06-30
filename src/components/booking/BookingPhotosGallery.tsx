import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BookingPhoto,
  fetchBookingPhotos,
  resolvePhotoDisplayUrl,
} from '../../utils/bookingPhotos';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  bookingId: number;
  title?: string;
  beforeLabel?: string;
  afterLabel?: string;
  emptyLabel?: string;
  refreshKey?: number;
}

const BookingPhotosGallery: React.FC<Props> = ({
  bookingId,
  title = 'Photos',
  beforeLabel = 'Before',
  afterLabel = 'After',
  emptyLabel = 'Awaiting photos',
  refreshKey = 0,
}) => {
  const [photos, setPhotos] = useState<BookingPhoto[]>([]);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchBookingPhotos(bookingId);
        if (!mounted) return;
        setPhotos(rows);
        const resolved: Record<number, string> = {};
        await Promise.all(
          rows.map(async (p) => {
            resolved[p.id] = await resolvePhotoDisplayUrl(p.photo_url);
          }),
        );
        if (mounted) setUrls(resolved);
      } catch {
        if (mounted) setPhotos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [bookingId, refreshKey]);

  const before = photos.filter(p => p.photo_type === 'before');
  const after = photos.filter(p => p.photo_type === 'after');

  const renderGroup = (label: string, items: BookingPhoto[]) => (
    <View style={s.group}>
      <Text style={s.groupLabel}>{label}</Text>
      {items.length === 0 ? (
        <View style={s.placeholder}>
          <Ionicons name="camera-outline" size={24} color="#38BDF8" />
          <Text style={s.placeholderText}>{emptyLabel}</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
          {items.map(p => (
            <TouchableOpacity key={p.id} onPress={() => setPreviewUrl(urls[p.id] ?? null)} activeOpacity={0.85}>
              <Image source={{ uri: urls[p.id] }} style={s.thumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (loading) {
    return <ActivityIndicator color="#38BDF8" style={{ marginVertical: 12 }} />;
  }

  if (photos.length === 0) {
    return (
      <View style={s.wrap}>
        {!!title && <Text style={s.title}>{title}</Text>}
        <View style={s.row}>
          {renderGroup(beforeLabel, [])}
          {renderGroup(afterLabel, [])}
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      {!!title && <Text style={s.title}>{title}</Text>}
      <View style={s.row}>
        {renderGroup(beforeLabel, before)}
        {renderGroup(afterLabel, after)}
      </View>

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <View style={s.previewOverlay}>
          <TouchableOpacity style={s.previewClose} onPress={() => setPreviewUrl(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {previewUrl && (
            <Image source={{ uri: previewUrl }} style={s.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default BookingPhotosGallery;

const s = StyleSheet.create({
  wrap: { marginBottom: 8 },
  title: { color: '#E8EDF5', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  group: { flex: 1 },
  groupLabel: { color: '#7A8A9A', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  thumbRow: { gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#161F35' },
  placeholder: {
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  placeholderText: { color: '#5A6A7A', fontSize: 10, marginTop: 4, textAlign: 'center' },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewClose: { position: 'absolute', top: 56, right: 20, zIndex: 2 },
  previewImage: { width: SCREEN_W - 32, height: SCREEN_W - 32 },
});
