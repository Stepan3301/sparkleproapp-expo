import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, ActivityIndicator, Animated, Dimensions,
  StatusBar, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';
import { useSimpleTranslation } from '../../utils/i18n';
import { formatBookingAddress } from '../../utils/bookingAddress';
import { translateBookingStatus, translatePropertySize } from '../../utils/translateStatus';
import BookingPhotosGallery from '../../components/booking/BookingPhotosGallery';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AdminOrderDetail'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  pending:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.3)'  },
  confirmed:   { color: '#38BDF8', bg: 'rgba(56,189,248,0.16)', border: 'rgba(56,189,248,0.3)'  },
  in_progress: { color: '#10B981', bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.3)'  },
  completed:   { color: '#22C55E', bg: 'rgba(34,197,94,0.16)',  border: 'rgba(34,197,94,0.3)'   },
  cancelled:   { color: '#EF4444', bg: 'rgba(239,68,68,0.16)',  border: 'rgba(239,68,68,0.3)'   },
  scheduled:   { color: '#8B5CF6', bg: 'rgba(139,92,246,0.16)', border: 'rgba(139,92,246,0.3)'  },
};

const formatDate = (d: string | null, t: (key: string, fallback?: string) => string): string => {
  if (!d) return '—';
  const date      = new Date(d + 'T00:00:00');
  const todayStr  = new Date().toISOString().split('T')[0];
  if (d === todayStr) return t('ui.today', 'Today');
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
};

const formatTime = (t: string | null): string => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, '0')} ${period}`;
};

const getSizeLabel = (size: string | null | undefined, t: (key: string, fallback?: string) => string): string => {
  if (!size) return t('ui.na', 'N/A');
  return translatePropertySize(t, size);
};

// ─── Info Tile ────────────────────────────────────────────────────────────────

const InfoTile = ({ icon, label, value }: { icon: IoniconName; label: string; value: string }) => (
  <View style={s.tile}>
    <View style={s.tileIconWrap}>
      <Ionicons name={icon} size={18} color="#38BDF8" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue} numberOfLines={2}>{value}</Text>
    </View>
  </View>
);

// ─── Detail Row ───────────────────────────────────────────────────────────────

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={s.detailValue}>{value}</Text>
  </View>
);

// ─── Assign Team Sheet (multi-select cleaners) ────────────────────────────────

const AssignSheet = ({
  visible, bookingId, bookingServiceName, bookingDate, bookingTime,
  initialSelectedIds, onClose, onAssigned, t,
}: {
  visible: boolean; bookingId: number; bookingServiceName: string;
  bookingDate: string; bookingTime: string;
  initialSelectedIds: string[];
  onClose: () => void; onAssigned: () => void;
  t: (key: string, fallback?: string, options?: { values?: Record<string, string | number> }) => string;
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [cleaners, setCleaners]       = useState<any[]>([]);
  const [search, setSearch]           = useState('');
  const [tab, setTab]                 = useState<'available' | 'all' | 'off'>('available');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
      setSelectedIds(new Set(initialSelectedIds));
      loadCleaners();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, useNativeDriver: true, duration: 280 }).start();
    }
  }, [visible, initialSelectedIds]);

  const loadCleaners = async () => {
    const { data } = await supabase.from('cleaners').select('*').order('name');
    if (data) setCleaners(data);
  };

  const toggleCleaner = (id: string, isActive: boolean) => {
    if (!isActive && tab !== 'all') return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size < 1) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.selectAtLeastOne', 'Select at least one team member'));
      return;
    }
    setSaving(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('bookings')
        .update({ assigned_cleaners: ids, team_id: null, status: 'confirmed' })
        .eq('id', bookingId);
      if (error) throw error;
      Alert.alert(
        t('ui.admin.assignedSuccess', 'Team Assigned'),
        t('ui.admin.teamAssignedMessage', 'Order team has been assigned successfully!'),
      );
      onAssigned();
      onClose();
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message ?? t('ui.admin.assignFailed', 'Could not assign team'));
    } finally {
      setSaving(false);
    }
  };

  const filteredCleaners = cleaners.filter(c => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.specialty?.toLowerCase().includes(q)) return false;
    }
    if (tab === 'available') return c.is_active;
    if (tab === 'off') return !c.is_active;
    return true;
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: slideAnim }] }]}>
        <View style={s.sheetHandle} />

        <View style={s.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetTitle}>{t('ui.admin.assignTeam', 'Assign Team')}</Text>
            <Text style={s.sheetSub}>#{bookingId} · {bookingServiceName} · {bookingDate} {bookingTime}</Text>
            <Text style={s.sheetSelectedCount}>
              {t('ui.admin.selectedCount', '{{count}} selected', { values: { count: selectedIds.size } })}
            </Text>
          </View>
          <TouchableOpacity style={s.sheetClose} onPress={onClose}>
            <Ionicons name="close" size={18} color="#E8EDF5" />
          </TouchableOpacity>
        </View>

        <View style={s.sheetSearch}>
          <Ionicons name="search-outline" size={15} color="#5A6A7A" style={{ marginRight: 8 }} />
          <TextInput
            style={s.sheetSearchInput}
            placeholder={t('ui.admin.searchCleaners', 'Search cleaners...')}
            placeholderTextColor="#5A6A7A"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={s.sheetTabs}>
          {[
            { key: 'available' as const, label: t('ui.admin.availableNow', 'Available') },
            { key: 'all' as const, label: t('ui.all', 'All') },
            { key: 'off' as const, label: t('ui.admin.offToday', 'Off') },
          ].map(tabItem => (
            <TouchableOpacity
              key={tabItem.key}
              style={[s.sheetTab, tab === tabItem.key && s.sheetTabActive, { flex: 1 }]}
              onPress={() => setTab(tabItem.key)}
            >
              <Text style={[s.sheetTabText, tab === tabItem.key && s.sheetTabTextActive]} numberOfLines={1}>
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ maxHeight: SCREEN_H * 0.34 }} showsVerticalScrollIndicator={false}>
          {filteredCleaners.map(cleaner => {
            const isSelected = selectedIds.has(cleaner.id);
            return (
              <TouchableOpacity
                key={cleaner.id}
                style={[s.cleanerRow, isSelected && s.cleanerRowSelected]}
                onPress={() => toggleCleaner(cleaner.id, cleaner.is_active)}
                activeOpacity={0.75}
              >
                <View style={[s.checkCircle, isSelected && s.checkCircleSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <View style={s.cleanerAvatar}>
                  <Text style={s.cleanerAvatarText}>{cleaner.name?.[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={s.cleanerInfo}>
                  <Text style={s.cleanerName}>{cleaner.name}</Text>
                  <Text style={s.cleanerSpec}>{cleaner.specialty ?? t('ui.admin.generalCleaning', 'General Cleaning')}</Text>
                </View>
                <View style={[s.availBadge, { backgroundColor: cleaner.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                  <Text style={[s.availText, { color: cleaner.is_active ? '#10B981' : '#F59E0B' }]}>
                    {cleaner.is_active ? t('ui.admin.filters.available', 'Available') : t('ui.admin.filters.busy', 'Busy')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {filteredCleaners.length === 0 && (
            <Text style={{ color: '#5A6A7A', textAlign: 'center', padding: 20 }}>
              {t('ui.admin.noCleaners', 'No cleaners found')}
            </Text>
          )}
        </ScrollView>

        <TouchableOpacity style={s.confirmAssignBtn} onPress={handleConfirm} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#000" />
            : <Text style={s.confirmAssignText}>{t('ui.admin.confirmAssignment', 'Confirm Assignment')}</Text>}
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminOrderDetailScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { bookingId } = route.params;
  const { t, tPlural } = useSimpleTranslation();

  const [booking, setBooking]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [updating, setUpdating]   = useState(false);
  const [assignedCleaners, setAssignedCleaners] = useState<any[]>([]);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);

  const fetchBooking = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id(name),
          addresses:address_id(street, city, apartment, building_name, formatted_address, emirate, label)
        `)
        .eq('id', bookingId)
        .single();
      if (error) { console.error('Booking detail fetch error:', error); }
      else if (data) {
        setBooking(data);
        const ids: string[] = Array.isArray(data.assigned_cleaners) ? data.assigned_cleaners.filter(Boolean) : [];
        if (ids.length > 0) {
          const { data: cleaners } = await supabase
            .from('cleaners')
            .select('id, name, specialty, avatar_url, phone')
            .in('id', ids);
          setAssignedCleaners(cleaners ?? []);
        } else {
          setAssignedCleaners([]);
        }
      }
    } catch (e) {
      console.error('Booking detail fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPhotoRefreshKey(k => k + 1);
    }
  }, [bookingId]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);
  const onRefresh = () => { setRefreshing(true); fetchBooking(); };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase.from('bookings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', bookingId);
    setUpdating(false);
    if (error) {
      Alert.alert(t('common.error', 'Error'), error.message);
    } else {
      setBooking((prev: any) => ({ ...prev, status: newStatus }));
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      t('ui.admin.confirmOrder', 'Confirm Order'),
      t('ui.admin.confirmOrderMessage', 'Are you sure you want to confirm this booking?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('ui.admin.confirm', 'Confirm'), onPress: () => updateStatus('confirmed') },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      t('ui.admin.cancelOrder', 'Cancel Order'),
      t('ui.admin.cancelOrderMessage', 'Are you sure you want to cancel this booking? This cannot be undone.'),
      [
        { text: t('ui.admin.keepOrder', 'Keep'), style: 'cancel' },
        { text: t('ui.admin.cancelOrder', 'Cancel Order'), style: 'destructive', onPress: () => updateStatus('cancelled') },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#38BDF8" size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={{ color: '#E8EDF5', marginTop: 12 }}>{t('ui.admin.orderNotFound', 'Order not found')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#38BDF8' }}>{t('ui.goBack', '← Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg         = STATUS_CFG[booking.status] ?? STATUS_CFG.pending;
  const serviceName = booking.services?.name ?? t('ui.cleaningService', 'Cleaning Service');
  const customerName = (booking.customer_name ?? t('ui.customer', 'Customer')).trim();
  const customerPhone = booking.customer_phone ?? '—';
  const address     = formatBookingAddress(booking);
  const hasAssignedTeam = assignedCleaners.length > 0;
  const assignedIds = Array.isArray(booking.assigned_cleaners) ? booking.assigned_cleaners.filter(Boolean) : [];
  const addons      = Array.isArray(booking.addons) ? booking.addons.map((a: any) => a.name ?? a).filter(Boolean).join(', ') : '—';
  const vatAmount   = Number(booking.vat_amount ?? 0);
  const total       = Number(booking.total_price ?? booking.total_cost ?? 0);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#E8EDF5" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {t('ui.admin.orderNumber', 'Order #{{id}}', { values: { id: booking.id } })}
        </Text>
        <View style={[s.statusChip, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Text style={[s.statusChipText, { color: cfg.color }]}>
            {translateBookingStatus(t, booking.status)}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
      >
        {/* ── Title ── */}
        <View style={s.titleRow}>
          <View style={s.titleAccent} />
          <View>
            <Text style={s.serviceTitle}>{serviceName}</Text>
            <Text style={s.customerName}>{customerName}</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={s.actionsRow}>
          {booking.status === 'pending' && (
            <TouchableOpacity style={s.btnConfirm} onPress={handleConfirm} disabled={updating}>
              <Ionicons name="checkmark" size={16} color="#000" />
              <Text style={s.btnConfirmText}>{t('ui.admin.confirm', 'Confirm')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.btnReassign, !hasAssignedTeam && s.btnAssignPrimary]}
            onPress={() => setShowAssign(true)}
            disabled={updating}
          >
            <Ionicons name={hasAssignedTeam ? 'repeat' : 'people'} size={16} color={hasAssignedTeam ? '#E8EDF5' : '#000'} />
            <Text style={[s.btnReassignText, !hasAssignedTeam && s.btnAssignPrimaryText]}>
              {hasAssignedTeam ? t('ui.admin.changeTeam', 'Change Team') : t('ui.admin.assignTeam', 'Assign Team')}
            </Text>
          </TouchableOpacity>
          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
            <TouchableOpacity style={s.btnCancel} onPress={handleCancel} disabled={updating}>
              <Ionicons name="close" size={16} color="#EF4444" />
              <Text style={s.btnCancelText}>{t('ui.admin.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Info Tiles 2x2 ── */}
        <View style={s.tilesGrid}>
          <InfoTile icon="calendar-outline"   label={t('admin.serviceDate', 'Date')}     value={formatDate(booking.service_date, t)} />
          <InfoTile icon="time-outline"        label={t('admin.serviceTime', 'Time')}     value={formatTime(booking.service_time)} />
          <InfoTile icon="location-outline"    label={t('admin.address', 'Address')}  value={address} />
          <InfoTile icon="people-outline"      label={t('admin.cleaners', 'Cleaners')} value={
            hasAssignedTeam
              ? assignedCleaners.map(c => c.name).join(', ')
              : (booking.cleaners_count ? tPlural('ui.history.cleanersCount', booking.cleaners_count, `${booking.cleaners_count} cleaner`) : t('ui.admin.notAssigned', 'Not assigned'))
          } />
        </View>

        {/* ── Assigned Team ── */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <View style={s.cardTitleAccent} />
            <Text style={s.cardTitle}>{t('ui.admin.assignedTeam', 'Assigned Team')}</Text>
          </View>
          {hasAssignedTeam ? (
            assignedCleaners.map(cleaner => (
              <View key={cleaner.id} style={[s.teamRow, { marginBottom: 10 }]}>
                <View style={s.teamAvatar}>
                  <Text style={{ color: '#38BDF8', fontSize: 18, fontWeight: '800' }}>{cleaner.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.teamName}>{cleaner.name}</Text>
                  <Text style={s.teamStatus}>{cleaner.specialty ?? t('ui.admin.generalCleaning', 'General Cleaning')}</Text>
                </View>
                {cleaner.phone ? (
                  <TouchableOpacity style={s.callBtn}>
                    <Ionicons name="call" size={16} color="#38BDF8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={s.emptyAssignText}>{t('ui.admin.noTeamAssigned', 'No team assigned yet. Tap Assign Team to select cleaners.')}</Text>
          )}
        </View>

        {/* ── Order Details ── */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <View style={s.cardTitleAccent} />
            <Text style={s.cardTitle}>{t('admin.orderInformation', 'Order Details')}</Text>
          </View>
          <DetailRow label={t('admin.serviceName', 'Service')}       value={serviceName} />
          <DetailRow label={t('admin.propertySize', 'Property Size')} value={getSizeLabel(booking.property_size, t)} />
          <DetailRow label={t('ui.bookingFlow.duration', 'Duration')}      value={booking.duration_hours ? tPlural('ui.bookingFlow.hoursCount', booking.duration_hours, `${booking.duration_hours} hour`) : '—'} />
          <DetailRow label={t('admin.materials', 'Materials')}     value={booking.own_materials ? t('ui.bookingFlow.customerProvided', 'Client provided') : t('ui.bookingFlow.cleanerProvided', 'Cleaner provided')} />
          {addons !== '—' && <DetailRow label={t('admin.addons', 'Add-ons')} value={addons} />}
          {booking.additional_notes ? <DetailRow label={t('admin.additionalNotes', 'Notes')} value={booking.additional_notes} /> : null}
        </View>

        {/* ── Photos ── */}
        <View style={s.section}>
          <BookingPhotosGallery
            bookingId={bookingId}
            title={t('ui.admin.photos', 'Photos')}
            beforeLabel={t('ui.admin.before', 'Before')}
            afterLabel={t('ui.admin.after', 'After')}
            emptyLabel={t('ui.admin.awaitingPhotos', 'Awaiting photos')}
            refreshKey={photoRefreshKey}
          />
        </View>

        {/* ── Price Summary ── */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <View style={s.cardTitleAccent} />
            <Text style={s.cardTitle}>{t('ui.history.priceSummary', 'Price Summary')}</Text>
          </View>
          <DetailRow label={t('admin.serviceName', 'Service')}  value={`${(total - vatAmount).toLocaleString('en-AE', { maximumFractionDigits: 2 })} ${t('ui.aed', 'AED')}`} />
          {vatAmount > 0 && <DetailRow label={t('ui.bookingFlow.vat', 'VAT (5%)')} value={`${vatAmount.toLocaleString('en-AE', { maximumFractionDigits: 2 })} ${t('ui.aed', 'AED')}`} />}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{t('history.details.total', 'Total')}:</Text>
            <Text style={s.totalValue}>{total.toLocaleString('en-AE', { maximumFractionDigits: 2 })} {t('ui.aed', 'AED')}</Text>
          </View>
        </View>

        {/* ── Chat with customer ── */}
        <TouchableOpacity
          style={s.chatBtn}
          onPress={() => navigation.navigate('AdminChatConversation', {
            bookingId:    booking.id,
            customerId:   booking.customer_id,
            customerName: customerName,
            serviceName:  serviceName,
            serviceDate:  booking.service_date,
            serviceTime:  booking.service_time,
            orderStatus:  booking.status,
          })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#38BDF8" />
          <Text style={s.chatBtnText}>{t('ui.admin.chatWithCustomer', 'Chat with Customer')}</Text>
          <Ionicons name="chevron-forward" size={16} color="#38BDF8" />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Assign Sheet ── */}
      <AssignSheet
        visible={showAssign}
        bookingId={bookingId}
        bookingServiceName={serviceName}
        bookingDate={formatDate(booking.service_date, t)}
        bookingTime={formatTime(booking.service_time)}
        initialSelectedIds={assignedIds}
        onClose={() => setShowAssign(false)}
        onAssigned={fetchBooking}
        t={t}
      />
    </View>
  );
};

export default AdminOrderDetailScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle:   { flex: 1, color: '#E8EDF5', fontSize: 18, fontWeight: '800' },
  statusChip:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusChipText:{ fontSize: 12, fontWeight: '700' },

  // Title
  titleRow:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, marginBottom: 18 },
  titleAccent:   { width: 4, borderRadius: 2, backgroundColor: '#38BDF8', marginRight: 12, marginTop: 3, height: 48 },
  serviceTitle:  { color: '#E8EDF5', fontSize: 26, fontWeight: '800' },
  customerName:  { color: '#7A8A9A', fontSize: 14, marginTop: 3 },

  // Action buttons
  actionsRow:    { flexDirection: 'row', paddingHorizontal: 18, gap: 10, marginBottom: 18 },
  btnConfirm:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 12, gap: 6 },
  btnConfirmText:{ color: '#000', fontWeight: '800', fontSize: 14 },
  btnReassign:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnReassignText:{ color: '#E8EDF5', fontWeight: '700', fontSize: 14 },
  btnAssignPrimary: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  btnAssignPrimaryText: { color: '#000' },
  emptyAssignText: { color: '#7A8A9A', fontSize: 13, lineHeight: 20 },
  btnCancel:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, paddingVertical: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  btnCancelText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },

  // Tiles
  tilesGrid:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, gap: 10, marginBottom: 14 },
  tile:          { width: '47.5%', flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0F1629', borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tileIconWrap:  { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tileLabel:     { color: '#7A8A9A', fontSize: 11, marginBottom: 2 },
  tileValue:     { color: '#E8EDF5', fontSize: 13, fontWeight: '700' },

  // Cards
  card:          { marginHorizontal: 18, marginBottom: 14, backgroundColor: '#0F1629', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardTitleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitleAccent:{ width: 3, height: 20, borderRadius: 2, backgroundColor: '#38BDF8', marginRight: 10 },
  cardTitle:     { color: '#E8EDF5', fontSize: 16, fontWeight: '800' },

  // Team
  teamRow:       { flexDirection: 'row', alignItems: 'center' },
  teamAvatar:    { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(56,189,248,0.15)', alignItems: 'center', justifyContent: 'center' },
  teamName:      { color: '#E8EDF5', fontSize: 16, fontWeight: '700' },
  teamStatus:    { color: '#7A8A9A', fontSize: 12 },
  onlineIndicator:{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  callBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(56,189,248,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Detail rows
  detailRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel:   { color: '#7A8A9A', fontSize: 13 },
  detailValue:   { color: '#E8EDF5', fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },

  // Photos
  section:       { paddingHorizontal: 18, marginBottom: 14 },
  sectionTitle:  { color: '#E8EDF5', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  photosRow:     { flexDirection: 'row', gap: 10 },
  photoBox:      { flex: 1 },
  photoLabel:    { color: '#7A8A9A', fontSize: 12, marginBottom: 8 },
  photoPlaceholder: { backgroundColor: '#0F1629', borderRadius: 14, height: 110, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  photoPlaceholderText: { color: '#5A6A7A', fontSize: 12 },

  // Price
  totalRow:      { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  totalLabel:    { color: '#E8EDF5', fontSize: 15, fontWeight: '700', marginRight: 10 },
  totalValue:    { color: '#38BDF8', fontSize: 18, fontWeight: '800' },

  // Chat button
  chatBtn:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, backgroundColor: '#0F1629', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 10, borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)', marginBottom: 10 },
  chatBtnText:   { flex: 1, color: '#38BDF8', fontSize: 15, fontWeight: '600' },

  // ── Assign Sheet ────────────────────────────────────────────────────────────
  sheetOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0D1526', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 14 },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 16 },
  sheetHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sheetTitle:    { color: '#E8EDF5', fontSize: 20, fontWeight: '800' },
  sheetSub:      { color: '#7A8A9A', fontSize: 12, marginTop: 3 },
  sheetSelectedCount: { color: '#38BDF8', fontSize: 12, fontWeight: '700', marginTop: 4 },
  sheetClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  sheetSearch:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161F35', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sheetSearchInput: { flex: 1, color: '#E8EDF5', fontSize: 14 },
  sheetTabs:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sheetTab:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sheetTabActive:{ backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  sheetTabText:  { color: '#A0B0C0', fontSize: 12, fontWeight: '600' },
  sheetTabTextActive: { color: '#000', fontWeight: '700' },

  // Cleaner rows
  cleanerRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  cleanerRowSelected: { backgroundColor: 'rgba(56,189,248,0.08)' },
  checkCircle:   { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkCircleSelected: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  confirmAssignBtn: { marginTop: 14, backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmAssignText: { color: '#000', fontWeight: '800', fontSize: 15 },
  cleanerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(56,189,248,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cleanerAvatarText: { color: '#38BDF8', fontSize: 20, fontWeight: '800' },
  cleanerStatusDot:  { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#0D1526' },
  cleanerInfo:   { flex: 1 },
  cleanerName:   { color: '#E8EDF5', fontSize: 15, fontWeight: '700' },
  cleanerSpec:   { color: '#7A8A9A', fontSize: 12, marginTop: 2 },
  cleanerRating: { color: '#F59E0B', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  availBadge:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  availDot:      { width: 6, height: 6, borderRadius: 3 },
  availText:     { fontSize: 10, fontWeight: '700' },
  assignBtn:     { backgroundColor: '#38BDF8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 70, alignItems: 'center' },
  assignBtnText: { color: '#000', fontSize: 13, fontWeight: '800' },
});
