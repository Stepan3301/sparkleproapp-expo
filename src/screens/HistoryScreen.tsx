import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  Dimensions,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Booking,
  BookingStatus,
  getBookingStatusLabel,
  SIZE_OPTIONS,
} from '../types/booking';
import { canCancelBooking, getCancellationBlockedReason } from '../utils/bookingUtils';

const { width, height } = Dimensions.get('window');

// ─── Service Icon Asset Map ────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, ImageSourcePropType> = {
  regular:      require('../../assets/icon_regular_cleaning.png'),
  deep:         require('../../assets/icon_deep_cleaning.png'),
  villa_deep:   require('../../assets/icon_full_villa_deep_cleaning.png'),
  bathroom:     require('../../assets/icon_bathroom_deep_cleaning.png'),
  kitchen:      require('../../assets/icon_kitchen_cleaning.png'),
  move:         require('../../assets/icon_move_in_out.png'),
  construction: require('../../assets/icon_post_construction_final.png'),
  window:       require('../../assets/icon_window_cleaning.png'),
  packages:     require('../../assets/icon_complete_packages.png'),
  facade:       require('../../assets/icon_villa_facade.png'),
  apartment:    require('../../assets/icon_full_apartment.png'),
  default:      require('../../assets/icon_regular_cleaning.png'),
};

const getServiceIconKey = (name: string): keyof typeof SERVICE_ICONS => {
  const n = name.toLowerCase();
  if (n.includes('facade'))                          return 'facade';
  if (n.includes('villa') && n.includes('deep'))    return 'villa_deep';
  if (n.includes('full') && n.includes('villa'))    return 'villa_deep';
  if (n.includes('apartment'))                       return 'apartment';
  if (n.includes('window'))                          return 'window';
  if (n.includes('kitchen'))                         return 'kitchen';
  if (n.includes('bathroom'))                        return 'bathroom';
  if (n.includes('move') || n.includes('moving'))   return 'move';
  if (n.includes('construct') || n.includes('post'))return 'construction';
  if (n.includes('package') || n.includes('complete')) return 'packages';
  if (n.includes('deep'))                            return 'deep';
  if (n.includes('regular'))                        return 'regular';
  return 'default';
};

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, {
  bar: string;
  cardBg: [string, string];
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
}> = {
  pending: {
    bar: '#F59E0B',
    cardBg: ['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.04)'],
    badgeBg: 'rgba(245,158,11,0.15)',
    badgeText: '#FBBF24',
    badgeBorder: 'rgba(245,158,11,0.45)',
    label: 'Pending',
  },
  confirmed: {
    bar: '#22D3EE',
    cardBg: ['rgba(34,211,238,0.12)', 'rgba(34,211,238,0.04)'],
    badgeBg: 'rgba(34,211,238,0.15)',
    badgeText: '#22D3EE',
    badgeBorder: 'rgba(34,211,238,0.45)',
    label: 'Confirmed',
  },
  in_progress: {
    bar: '#8B5CF6',
    cardBg: ['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)'],
    badgeBg: 'rgba(139,92,246,0.15)',
    badgeText: '#C4B5FD',
    badgeBorder: 'rgba(139,92,246,0.45)',
    label: 'In Progress',
  },
  completed: {
    bar: '#10B981',
    cardBg: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.04)'],
    badgeBg: 'rgba(16,185,129,0.15)',
    badgeText: '#34D399',
    badgeBorder: 'rgba(16,185,129,0.45)',
    label: 'Completed',
  },
  cancelled: {
    bar: '#F87171',
    cardBg: ['rgba(248,113,113,0.12)', 'rgba(248,113,113,0.04)'],
    badgeBg: 'rgba(248,113,113,0.15)',
    badgeText: '#F87171',
    badgeBorder: 'rgba(248,113,113,0.45)',
    label: 'Cancelled',
  },
};

// ─── Filter Tabs ───────────────────────────────────────────────────────────────

type FilterTab = 'all' | BookingStatus;
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'confirmed',   label: 'Confirmed' },
  { key: 'completed',   label: 'Completed' },
  { key: 'cancelled',   label: 'Cancelled' },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────

const cleanServiceName = (name?: string) =>
  name
    ? name.replace(/\s*\(with materials\)/gi, '').replace(/\s*\(without materials\)/gi, '').trim()
    : 'Cleaning Service';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' });

const formatTime = (t: string) => {
  try {
    return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-AE', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return t; }
};

const getSizeLabel = (size: string | null | undefined): string => {
  if (!size) return 'N/A';
  const opt = SIZE_OPTIONS.find(o => o.size === size);
  return opt ? opt.label : (size.charAt(0).toUpperCase() + size.slice(1));
};

const getServiceMainCategory = (id?: number | null): string | null => {
  if (!id) return null;
  if ([6, 7].includes(id))              return 'regular';
  if ([8, 9].includes(id))              return 'deep';
  if ([10,11,12,13,14,15,16].includes(id)) return 'packages';
  if ([17,18,19].includes(id))          return 'specialized';
  return null;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

// InfoTile — horizontal layout with Ionicons system icon
// [ ICON BOX ]  LABEL (small gray uppercase)
//               VALUE (bold white)
const InfoTile = ({
  icon, label, value,
}: { icon: IoniconName; label: string; value: string }) => (
  <View style={tile.wrap}>
    <View style={tile.iconWrap}>
      <Ionicons name={icon} size={22} color="#22D3EE" />
    </View>
    <View style={tile.textGroup}>
      <Text style={tile.label}>{label}</Text>
      <Text style={tile.value} numberOfLines={2}>{value}</Text>
    </View>
  </View>
);

const tile = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    minHeight: 76,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textGroup: { flex: 1, gap: 3 },
  label: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: { fontSize: 14, color: '#F1F5F9', fontWeight: '700', lineHeight: 20 },
});

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) =>
  value != null ? (
    <View style={det.row}>
      <Text style={det.label}>{label}</Text>
      <Text style={det.value}>{String(value)}</Text>
    </View>
  ) : null;

const det = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  label: { fontSize: 13, color: '#64748B', flex: 1 },
  value: { fontSize: 13, color: '#CBD5E1', fontWeight: '600', flex: 1.5, textAlign: 'right' },
});

const PriceRow = ({
  label, value, bold, last,
}: { label: string; value: string | number; bold?: boolean; last?: boolean }) => (
  <View style={[pr.row, last && { borderBottomWidth: 0 }]}>
    <Text style={[pr.label, bold && pr.boldLabel]}>{label}</Text>
    <Text style={[pr.value, bold && pr.boldValue]}>{value} AED</Text>
  </View>
);

const pr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  label: { color: '#94A3B8', fontSize: 13 },
  value: { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  boldLabel: { color: '#F1F5F9', fontWeight: '800', fontSize: 15 },
  boldValue: { fontSize: 22, fontWeight: '900', color: '#22D3EE' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

interface HistoryScreenProps { navigation: any; }

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [services, setServices]     = useState<{ id: number; name: string }[]>([]);
  const [addresses, setAddresses]   = useState<{ id: number; street: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab]   = useState<FilterTab>('all');

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalVisible, setModalVisible]       = useState(false);
  const [cancelling, setCancelling]           = useState(false);
  const modalAnim = useRef(new Animated.Value(height)).current;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? null;

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('admin_bookings_with_addons')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) { setBookings(data as Booking[]); return; }

      const { data: bdata, error: berr } = await supabase
        .from('bookings')
        .select(`*, booking_additional_services!left(additional_services(id,name,base_price))`)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (berr) throw berr;
      const transformed = (bdata || []).map((b: any) => ({
        ...b,
        detailed_addons: b.booking_additional_services?.map((row: any) => ({
          id: row.additional_services?.id,
          name: row.additional_services?.name,
          price: parseFloat(row.additional_services?.base_price ?? 0),
        })) ?? [],
        addons: b.booking_additional_services?.map((row: any) => ({
          id: row.additional_services?.id?.toString() ?? '',
          name: row.additional_services?.name ?? '',
          price: parseFloat(row.additional_services?.base_price ?? 0),
        })) ?? [],
      }));
      setBookings(transformed);
    } catch (err) {
      console.error('fetchBookings error', err);
    }
  }, [userId]);

  const fetchServices = useCallback(async () => {
    const { data } = await supabase.from('services').select('id,name');
    if (data) setServices(data);
  }, []);

  const fetchAddresses = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('addresses').select('id,street').eq('user_id', userId);
    if (data) setAddresses(data);
  }, [userId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBookings(), fetchServices(), fetchAddresses()]);
    setLoading(false);
  }, [fetchBookings, fetchServices, fetchAddresses]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchAll();
    pollingRef.current = setInterval(fetchBookings, 20000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchAll, fetchBookings, userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  // ── Lookups ─────────────────────────────────────────────────────────────────

  const getServiceName = (id?: number | null, booking?: Booking): string => {
    const anyB = booking as any;
    if (anyB?.service_name) return cleanServiceName(anyB.service_name);
    if (!id) return 'Cleaning Service';
    const s = services.find(svc => svc.id === id);
    return cleanServiceName(s?.name);
  };

  const getAddressText = (addrId?: number | null, custom?: string | null) => {
    if (custom) return custom;
    if (!addrId) return 'Saved address';
    return addresses.find(a => a.id === addrId)?.street ?? 'Saved address';
  };

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filteredBookings = filterTab === 'all'
    ? bookings
    : bookings.filter(b => b.status === filterTab);

  const tabCount = (key: FilterTab) =>
    key === 'all' ? bookings.length : bookings.filter(b => b.status === key).length;

  // ── Modal ───────────────────────────────────────────────────────────────────

  const openModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: height, duration: 280, useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedBooking(null);
    });
  };

  // ── Cancel ──────────────────────────────────────────────────────────────────

  const handleCancel = (booking: Booking) => {
    if (!canCancelBooking(booking)) {
      Alert.alert('Cannot Cancel', getCancellationBlockedReason(booking));
      return;
    }
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel booking #${booking.id}? This action cannot be undone.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            closeModal();
            try {
              const { error } = await supabase.from('bookings').delete().eq('id', booking.id);
              if (error) throw error;
              setBookings(prev => prev.filter(b => b.id !== booking.id));
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to cancel booking. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  // ── Order Again ─────────────────────────────────────────────────────────────

  const handleOrderAgain = (booking: Booking) => {
    closeModal();
    setTimeout(() => {
      navigation.navigate('Booking', {
        prefill: {
          serviceId: booking.service_id,
          mainCategory: getServiceMainCategory(booking.service_id),
          propertySize: booking.property_size,
          cleanersCount: booking.cleaners_count,
          durationHours: booking.duration_hours,
          ownMaterials: booking.own_materials,
        },
      });
    }, 300);
  };

  // ── Guest wall ──────────────────────────────────────────────────────────────

  if (!user && !loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Booking History</Text>
        </View>
        <View style={s.guestWall}>
          <Text style={s.guestIcon}>📋</Text>
          <Text style={s.guestTitle}>Sign In to View History</Text>
          <Text style={s.guestSubtitle}>
            Create an account to track your bookings and manage your orders.
          </Text>
          <TouchableOpacity
            style={s.guestBtn}
            onPress={() => navigation.getParent()?.navigate('Auth')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#2563EB', '#3B82F6']} style={s.guestBtnGrad}>
              <Text style={s.guestBtnText}>Sign In / Sign Up</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[s.root, s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#22D3EE" />
        <Text style={s.loadingText}>Loading your bookings…</Text>
      </View>
    );
  }

  // ── Booking Card ────────────────────────────────────────────────────────────

  const renderCard = ({ item: booking }: { item: Booking }) => {
    const cfg  = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
    const name = getServiceName(booking.service_id, booking);
    const iconKey = getServiceIconKey(name);

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => openModal(booking)}
        activeOpacity={0.78}
      >
        {/* Left accent bar */}
        <View style={[s.cardAccent, { backgroundColor: cfg.bar }]} />

        <LinearGradient colors={cfg.cardBg} style={s.cardGrad}>
          {/* Top row */}
          <View style={s.cardRow}>
            {/* Service icon */}
            <View style={s.cardIconWrap}>
              <Image
                source={SERVICE_ICONS[iconKey]}
                style={s.cardIconImg}
                resizeMode="contain"
              />
            </View>

            {/* Name + meta */}
            <View style={s.cardInfo}>
              <Text style={s.cardName} numberOfLines={1}>{name}</Text>
              <Text style={s.cardMeta}>
                #{booking.id} · {formatDate(booking.service_date)} · {formatTime(booking.service_time)}
              </Text>
            </View>

            {/* Status badge */}
            <View style={[
              s.statusBadge,
              { backgroundColor: cfg.badgeBg, borderColor: cfg.badgeBorder },
            ]}>
              <Text style={[s.statusText, { color: cfg.badgeText }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Bottom row: chips + price */}
          <View style={s.cardBottom}>
            <View style={s.chip}>
              <Text style={s.chipText}>
                {booking.cleaners_count} cleaner{booking.cleaners_count !== 1 ? 's' : ''}
              </Text>
            </View>
            {booking.duration_hours > 0 && (
              <View style={s.chip}>
                <Text style={s.chipText}>{booking.duration_hours}h</Text>
              </View>
            )}
            <View style={s.cardPricePill}>
              <Text style={[s.cardPriceText, { color: cfg.bar }]}>
                {booking.total_cost ?? booking.total_price} AED
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ── Detail Modal ────────────────────────────────────────────────────────────

  const renderModal = () => {
    if (!selectedBooking) return null;
    const b         = selectedBooking;
    const name      = getServiceName(b.service_id, b);
    const cfg       = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
    const canCancel = canCancelBooking(b);
    const addons    = b.detailed_addons?.length ? b.detailed_addons : (b.addons?.length ? b.addons : []);

    return (
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        {/* Backdrop */}
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeModal} />

        {/* Sheet */}
        <Animated.View style={[s.sheet, { transform: [{ translateY: modalAnim }] }]}>
          {/* Drag handle */}
          <View style={s.dragHandle} />

          {/* Thin status accent line */}
          <View style={[s.modalAccentLine, { backgroundColor: cfg.bar }]} />

          {/* Header */}
          <View style={s.modalHeader}>
            {/* Close button */}
            <TouchableOpacity style={s.closeBtn} onPress={closeModal} activeOpacity={0.8}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Status badge */}
            <View style={[
              s.modalBadge,
              { backgroundColor: cfg.badgeBg, borderColor: cfg.badgeBorder },
            ]}>
              <Text style={[s.modalBadgeText, { color: cfg.badgeText }]}>
                {getBookingStatusLabel(b.status)}
              </Text>
            </View>

            {/* Service title */}
            <Text style={s.modalTitle}>{name}</Text>
            <Text style={s.modalSubtitle}>Booking #{b.id}</Text>

            {/* Action buttons */}
            <View style={s.modalActions}>
              {/* Order Again — solid cyan gradient fill */}
              <TouchableOpacity
                style={s.actionBtnPrimaryWrap}
                onPress={() => handleOrderAgain(b)}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={['#06B6D4', '#22D3EE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.actionBtnGrad}
                >
                  <Text style={s.actionBtnPrimaryText}>↺  Order Again</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Cancel Booking — red border, transparent fill */}
              <TouchableOpacity
                style={[s.actionBtnDanger, !canCancel && s.actionBtnDisabled]}
                onPress={() => handleCancel(b)}
                activeOpacity={0.85}
                disabled={cancelling}
              >
                {cancelling
                  ? <ActivityIndicator size="small" color="#F87171" />
                  : <Text style={[s.actionBtnDangerText, !canCancel && { opacity: 0.4 }]}>
                      ✕  Cancel Booking
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrollable body */}
          <ScrollView
            style={s.modalBody}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Info grid 2×2 */}
            <View style={s.infoGrid}>
              <InfoTile icon="calendar-outline"  label="Date" value={formatDate(b.service_date)} />
              <InfoTile icon="time-outline"      label="Time" value={formatTime(b.service_time)} />
            </View>
            <View style={[s.infoGrid, { marginTop: 10 }]}>
              <InfoTile
                icon="people-outline"
                label="Cleaners"
                value={`${b.cleaners_count} Cleaner${b.cleaners_count !== 1 ? 's' : ''}`}
              />
              <InfoTile
                icon="location-outline"
                label="Address"
                value={getAddressText(b.address_id, b.custom_address)}
              />
            </View>

            {/* Order Details */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionBar, { backgroundColor: '#22D3EE' }]} />
                <Text style={s.sectionTitle}>Order Details</Text>
              </View>
              <DetailRow label="Materials"     value={b.own_materials ? 'Customer provided' : 'Cleaner provided'} />
              <DetailRow label="Property Size" value={getSizeLabel(b.property_size)} />
              {Number(b.duration_hours) > 0 && (
                <DetailRow label="Duration" value={`${b.duration_hours} hour${b.duration_hours !== 1 ? 's' : ''}`} />
              )}
              <DetailRow label="Customer"      value={b.customer_name} />
              <DetailRow label="Phone"         value={b.customer_phone} />
            </View>

            {/* Extra Services */}
            {(addons.length > 0 || Number(b.addons_total) > 0) && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={[s.sectionBar, { backgroundColor: '#10B981' }]} />
                  <Text style={[s.sectionTitle, { color: '#34D399' }]}>Extra Services</Text>
                </View>
                {addons.length > 0 ? addons.map((addon: any, i: number) => (
                  <View key={i} style={s.addonRow}>
                    <View style={s.addonIconWrap}>
                      <Text style={s.addonIconText}>+</Text>
                    </View>
                    <Text style={s.addonName} numberOfLines={1}>{addon.name}</Text>
                    <Text style={s.addonPrice}>{addon.price ?? '—'} AED</Text>
                  </View>
                )) : (
                  <View style={s.addonRow}>
                    <View style={s.addonIconWrap}><Text style={s.addonIconText}>+</Text></View>
                    <Text style={s.addonName}>Extra Services Added</Text>
                    <Text style={s.addonPrice}>{b.addons_total} AED</Text>
                  </View>
                )}
              </View>
            )}

            {/* Window panels */}
            {b.window_panels_count != null && b.window_panels_count > 0 && (
              <View style={[s.section, { borderColor: 'rgba(56,189,248,0.25)' }]}>
                <View style={s.sectionHeader}>
                  <View style={[s.sectionBar, { backgroundColor: '#38BDF8' }]} />
                  <Text style={[s.sectionTitle, { color: '#7DD3FC' }]}>Window Cleaning</Text>
                </View>
                <Text style={{ color: '#60A5FA', fontWeight: '700', fontSize: 14, marginTop: 4 }}>
                  🪟  {b.window_panels_count} window panel{b.window_panels_count !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Notes — always shown when present */}
            {!!b.additional_notes && (
              <View style={[s.section, { borderColor: 'rgba(34,211,238,0.22)' }]}>
                <View style={s.sectionHeader}>
                  <View style={[s.sectionBar, { backgroundColor: '#22D3EE' }]} />
                  <Text style={[s.sectionTitle, { color: '#22D3EE' }]}>Notes</Text>
                </View>
                <Text style={s.notesText}>{b.additional_notes}</Text>
              </View>
            )}

            {/* Price Summary */}
            <View style={s.pricingCard}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionBar, { backgroundColor: '#22D3EE' }]} />
                <Text style={s.sectionTitle}>Price Summary</Text>
              </View>
              <PriceRow label="Service Price" value={b.base_price} />
              {Number(b.addons_total) > 0 && (
                <PriceRow label="Extra Services" value={b.addons_total} />
              )}
              {b.vat_amount != null && Number(b.vat_amount) > 0 && (
                <PriceRow label="VAT (5%)" value={b.vat_amount} />
              )}
              {b.cash_fee != null && Number(b.cash_fee) > 0 && (
                <PriceRow label="Cash Fee" value={b.cash_fee} />
              )}
              <View style={s.pricingDivider} />
              <PriceRow label="Total" value={b.total_cost ?? b.total_price} bold last />
            </View>

            <View style={{ height: 48 }} />
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Booking History</Text>
          <Text style={s.headerSubtitle}>
            {bookings.length > 0
              ? `You have ${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`
              : 'No bookings yet'}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
        style={s.tabsScroll}
      >
        {FILTER_TABS.map(tab => {
          const active = filterTab === tab.key;
          const count  = tabCount(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilterTab(tab.key)}
              style={[s.tabPill, active && s.tabPillActive]}
              activeOpacity={0.75}
            >
              <Text style={[s.tabPillText, active && s.tabPillTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[s.tabCount, active && s.tabCountActive]}>
                  <Text style={[s.tabCountText, active && s.tabCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Booking list */}
      <FlatList
        data={filteredBookings}
        keyExtractor={b => String(b.id)}
        renderItem={renderCard}
        contentContainerStyle={[
          s.listContent,
          filteredBookings.length === 0 && s.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Text style={s.emptyIcon}>🗓️</Text>
            </View>
            <Text style={s.emptyTitle}>
              {filterTab === 'all' ? 'No Bookings Yet' : `No ${filterTab} bookings`}
            </Text>
            <Text style={s.emptySubtitle}>
              {filterTab === 'all'
                ? "You haven't made any bookings yet. Start by booking your first cleaning service!"
                : `You don't have any ${filterTab} bookings.`}
            </Text>
            {filterTab === 'all' && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => navigation.navigate('Booking')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#2563EB', '#3B82F6']} style={s.emptyBtnGrad}>
                  <Text style={s.emptyBtnText}>📅  Book Your First Service</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22D3EE"
            colors={['#22D3EE']}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {renderModal()}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

  // ── Filter tabs
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabsRow: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, gap: 8, flexDirection: 'row' },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabPillActive: {
    borderColor: '#22D3EE',
    backgroundColor: 'rgba(34,211,238,0.12)',
  },
  tabPillText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabPillTextActive: { color: '#22D3EE', fontWeight: '700' },
  tabCount: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabCountActive: { backgroundColor: '#22D3EE' },
  tabCountText: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  tabCountTextActive: { color: '#070B18' },

  // ── List
  listContent: { paddingHorizontal: 14, paddingBottom: 110, paddingTop: 2 },
  listEmpty: { flexGrow: 1 },

  // ── Cards
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardAccent: { width: 4 },
  cardGrad: { flex: 1, padding: 14, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cardIconImg: { width: 36, height: 36 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  cardMeta: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipText: { fontSize: 11, color: '#CBD5E1', fontWeight: '600' },
  cardPricePill: { marginLeft: 'auto' as any },
  cardPriceText: { fontSize: 16, fontWeight: '900' },

  // ── Guest wall
  guestWall: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  guestIcon: { fontSize: 60, marginBottom: 16 },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  guestSubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  guestBtn: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  guestBtnGrad: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  guestBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // ── Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 60 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyBtn: { borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 280 },
  emptyBtnGrad: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  // ── Bottom Sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0D1526',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    maxHeight: height * 0.92,
    overflow: 'hidden',
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  dragHandle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
  },
  modalAccentLine: {
    height: 2, marginHorizontal: 22, borderRadius: 1, marginTop: 8,
  },
  modalHeader: {
    padding: 18, paddingTop: 12, gap: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  closeBtnText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '700' },
  modalBadge: {
    alignSelf: 'flex-start', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1.5,
  },
  modalBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', lineHeight: 30, paddingRight: 40 },
  modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.40)', fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  // Order Again — solid cyan fill via LinearGradient wrapper
  actionBtnPrimaryWrap: {
    flex: 1, borderRadius: 14, overflow: 'hidden',
  },
  actionBtnGrad: {
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, flexDirection: 'row', gap: 6,
  },
  actionBtnPrimaryText: { color: '#050E1F', fontWeight: '800', fontSize: 14 },
  // Cancel — transparent bg, red border
  actionBtnDanger: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(248,113,113,0.55)',
  },
  actionBtnDangerText: { color: '#F87171', fontWeight: '700', fontSize: 14 },
  actionBtnDisabled: {
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalBody: { flex: 1, padding: 16 },

  // ── Info grid
  infoGrid: { flexDirection: 'row', gap: 10 },

  // ── Sections
  section: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 14,
    marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  sectionBar: { width: 3, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#F1F5F9', letterSpacing: 0 },

  // ── Addons
  addonRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  addonIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.22)',
  },
  addonIconText: { fontSize: 14, fontWeight: '900', color: '#34D399' },
  addonName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#F1F5F9' },
  addonPrice: { fontSize: 13, fontWeight: '700', color: '#34D399' },

  // ── Notes
  notesText: { color: '#94A3B8', lineHeight: 22, fontSize: 13, marginTop: 2 },

  // ── Pricing
  pricingCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.18)',
  },
  pricingDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.09)', marginVertical: 6 },
});

export default HistoryScreen;
