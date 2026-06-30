import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, StatusBar, Image, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { useSimpleTranslation } from '../../utils/i18n';
import { formatBookingAddress } from '../../utils/bookingAddress';
import { translateBookingStatus } from '../../utils/translateStatus';
import {
  BookingPhoto,
  fetchBookingPhotos,
  finishBookingOrder,
  pickBookingPhoto,
  resolvePhotoDisplayUrl,
  uploadBookingPhoto,
} from '../../utils/bookingPhotos';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CleanerOrderDetail'>;

const CleanerOrderDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;
  const { user } = useAuth();
  const { t } = useSimpleTranslation();

  const [booking, setBooking] = useState<any>(null);
  const [photos, setPhotos] = useState<BookingPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: bookingData, error: bookingError }, photoRows] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, services:service_id(name), addresses:address_id(street, city, apartment, building_name, formatted_address, emirate, label)')
          .eq('id', bookingId)
          .single(),
        fetchBookingPhotos(bookingId),
      ]);
      if (bookingError) throw bookingError;
      setBooking(bookingData);
      setPhotos(photoRows);
      const urls: Record<number, string> = {};
      await Promise.all(photoRows.map(async p => {
        urls[p.id] = await resolvePhotoDisplayUrl(p.photo_url);
      }));
      setPhotoUrls(urls);
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message ?? t('ui.cleaner.loadFailed', 'Could not load order'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation, t]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');
  const canFinish = beforePhotos.length > 0 && afterPhotos.length > 0 && booking?.status !== 'completed';

  const handleAddPhoto = (photoType: 'before' | 'after') => {
    Alert.alert(
      t('ui.cleaner.addPhoto', 'Add Photo'),
      t('ui.cleaner.chooseSource', 'Choose photo source'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('ui.cleaner.camera', 'Camera'),
          onPress: () => void handleUpload(photoType, 'camera'),
        },
        {
          text: t('ui.cleaner.gallery', 'Gallery'),
          onPress: () => void handleUpload(photoType, 'gallery'),
        },
      ],
    );
  };

  const handleUpload = async (photoType: 'before' | 'after', source: 'camera' | 'gallery') => {
    if (!user) return;
    try {
      const uri = await pickBookingPhoto(source);
      if (!uri) return;
      setUploading(true);
      await uploadBookingPhoto(bookingId, uri, photoType, user.id);
      if (booking?.status === 'confirmed') {
        await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', bookingId);
      }
      await loadData();
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message ?? t('ui.cleaner.uploadFailed', 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      t('ui.cleaner.finishOrder', 'Finish Order'),
      t('ui.cleaner.finishConfirm', 'Mark this order as completed?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('ui.cleaner.finish', 'Finish'),
          onPress: async () => {
            setFinishing(true);
            try {
              await finishBookingOrder(bookingId);
              Alert.alert(t('common.success', 'Success'), t('ui.cleaner.orderCompleted', 'Order completed!'), [
                { text: t('common.ok', 'OK'), onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert(t('common.error', 'Error'), e.message);
            } finally {
              setFinishing(false);
            }
          },
        },
      ],
    );
  };

  const renderPhotoSection = (
    label: string,
    items: BookingPhoto[],
    photoType: 'before' | 'after',
    canUpload: boolean,
  ) => (
    <View style={s.photoSection}>
      <View style={s.photoHeader}>
        <Text style={s.photoTitle}>{label}</Text>
        {canUpload && (
          <TouchableOpacity style={s.addBtn} onPress={() => handleAddPhoto(photoType)} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color="#000" /> : (
              <>
                <Ionicons name="add" size={16} color="#000" />
                <Text style={s.addBtnText}>{t('ui.cleaner.add', 'Add')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      {items.length === 0 ? (
        <View style={s.photoEmpty}>
          <Ionicons name="camera-outline" size={28} color="#38BDF8" />
          <Text style={s.photoEmptyText}>
            {canUpload
              ? t('ui.cleaner.tapToAdd', 'Tap Add to upload photos')
              : t('ui.admin.awaitingPhotos', 'Awaiting photos')}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photoRow}>
          {items.map(p => (
            <TouchableOpacity key={p.id} onPress={() => setPreviewUrl(photoUrls[p.id] ?? null)}>
              <Image source={{ uri: photoUrls[p.id] }} style={s.photoThumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (loading || !booking) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#38BDF8" size="large" />
      </View>
    );
  }

  const serviceName = booking.services?.name ?? t('ui.cleaningService', 'Cleaning Service');
  const address = formatBookingAddress(booking);
  const isCompleted = booking.status === 'completed';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#E8EDF5" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>#{booking.id}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 120 }}>
        <Text style={s.serviceName}>{serviceName}</Text>
        <Text style={s.status}>{translateBookingStatus(t, booking.status)}</Text>

        <View style={s.infoCard}>
          <InfoRow icon="person-outline" label={t('ui.customer', 'Customer')} value={booking.customer_name} />
          <InfoRow icon="call-outline" label={t('ui.admin.phone', 'Phone')} value={booking.customer_phone ?? '—'} />
          <InfoRow icon="calendar-outline" label={t('ui.bookingFlow.date', 'Date')} value={booking.service_date ?? '—'} />
          <InfoRow icon="time-outline" label={t('ui.bookingFlow.time', 'Time')} value={booking.service_time ?? '—'} />
          {!!address && <InfoRow icon="location-outline" label={t('ui.address', 'Address')} value={address} />}
          {!!booking.additional_notes && (
            <InfoRow icon="document-text-outline" label={t('admin.additionalNotes', 'Notes')} value={booking.additional_notes} />
          )}
        </View>

        <Text style={s.sectionLabel}>{t('ui.admin.photos', 'Photos')}</Text>
        {renderPhotoSection(t('ui.admin.before', 'Before'), beforePhotos, 'before', !isCompleted)}
        {renderPhotoSection(t('ui.admin.after', 'After'), afterPhotos, 'after', !isCompleted)}

        {!isCompleted && (
          <View style={s.hintBox}>
            <Ionicons name="information-circle-outline" size={18} color="#38BDF8" />
            <Text style={s.hintText}>
              {t('ui.cleaner.photoHint', 'Upload before photos when you arrive and after photos when the job is done. Finish becomes available once both sets are uploaded.')}
            </Text>
          </View>
        )}
      </ScrollView>

      {!isCompleted && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[s.finishBtn, !canFinish && s.finishBtnDisabled]}
            onPress={handleFinish}
            disabled={!canFinish || finishing}
          >
            {finishing
              ? <ActivityIndicator color="#000" />
              : <Text style={s.finishBtnText}>{t('ui.cleaner.finishOrder', 'Finish Order')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <View style={s.previewOverlay}>
          <TouchableOpacity style={s.previewClose} onPress={() => setPreviewUrl(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {previewUrl && <Image source={{ uri: previewUrl }} style={s.previewImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
};

const InfoRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
  <View style={s.infoRow}>
    <Ionicons name={icon} size={16} color="#38BDF8" />
    <View style={{ flex: 1 }}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  </View>
);

export default CleanerOrderDetailScreen;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#E8EDF5', fontSize: 17, fontWeight: '800' },
  serviceName: { color: '#E8EDF5', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  status: { color: '#38BDF8', fontSize: 13, fontWeight: '700', marginBottom: 16 },
  infoCard: { backgroundColor: '#0F1629', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  infoLabel: { color: '#7A8A9A', fontSize: 11, fontWeight: '600' },
  infoValue: { color: '#E8EDF5', fontSize: 14, fontWeight: '600', marginTop: 2 },
  sectionLabel: { color: '#E8EDF5', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  photoSection: { marginBottom: 16 },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  photoTitle: { color: '#A0B0C0', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#38BDF8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
  photoEmpty: { height: 100, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  photoEmptyText: { color: '#5A6A7A', fontSize: 12, marginTop: 6 },
  photoRow: { gap: 10 },
  photoThumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#161F35' },
  hintBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(56,189,248,0.08)', borderRadius: 12, padding: 12, marginTop: 4 },
  hintText: { color: '#94A3B8', fontSize: 12, lineHeight: 18, flex: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, backgroundColor: 'rgba(7,11,24,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  finishBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  finishBtnDisabled: { opacity: 0.45 },
  finishBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewClose: { position: 'absolute', top: 56, right: 20, zIndex: 2 },
  previewImage: { width: '92%', height: '70%' },
});
