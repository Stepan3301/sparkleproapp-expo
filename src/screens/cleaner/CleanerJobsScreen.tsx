import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { useSimpleTranslation } from '../../utils/i18n';
import { translateBookingStatus } from '../../utils/translateStatus';
import { formatBookingAddress } from '../../utils/bookingAddress';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  confirmed:   { color: '#38BDF8', bg: 'rgba(56,189,248,0.16)' },
  in_progress: { color: '#10B981', bg: 'rgba(16,185,129,0.16)' },
  completed:   { color: '#22C55E', bg: 'rgba(34,197,94,0.16)' },
};

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  const date = new Date(d + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

const CleanerJobsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { cleanerId, profile } = useAuth();
  const { t } = useSimpleTranslation();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!cleanerId) {
      setBookings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, services:service_id(name), addresses:address_id(street, city, apartment, building_name, formatted_address, emirate, label)')
        .contains('assigned_cleaners', [cleanerId])
        .in('status', ['confirmed', 'in_progress', 'completed'])
        .order('service_date', { ascending: true })
        .order('service_time', { ascending: true });
      if (error) throw error;
      setBookings(data ?? []);
    } catch (e) {
      console.error('Cleaner jobs fetch error:', e);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cleanerId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void fetchJobs();
  }, [fetchJobs]));

  const { active, completed } = useMemo(() => {
    const activeList = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_progress');
    const doneList = bookings.filter(b => b.status === 'completed');
    return { active: activeList, completed: doneList };
  }, [bookings]);

  const renderCard = (item: any) => {
    const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.confirmed;
    const serviceName = item.services?.name ?? t('ui.cleaningService', 'Cleaning Service');
    const address = formatBookingAddress(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={s.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CleanerOrderDetail', { bookingId: item.id })}
      >
        <View style={s.cardTop}>
          <Text style={s.cardNum}>#{item.id}</Text>
          <View style={[s.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.badgeText, { color: cfg.color }]}>
              {translateBookingStatus(t, item.status)}
            </Text>
          </View>
        </View>
        <Text style={s.cardService} numberOfLines={2}>{serviceName}</Text>
        <Text style={s.cardCustomer} numberOfLines={1}>{item.customer_name}</Text>
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#7A8A9A" />
          <Text style={s.metaText}>{formatDate(item.service_date)} · {formatTime(item.service_time)}</Text>
        </View>
        {!!address && (
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={13} color="#7A8A9A" />
            <Text style={s.metaText} numberOfLines={2}>{address}</Text>
          </View>
        )}
        <View style={s.cardFooter}>
          <Text style={s.price}>
            {Number(item.total_price ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })} {t('ui.aed', 'AED')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
        </View>
      </TouchableOpacity>
    );
  };

  const listData = [
    ...(active.length ? [{ type: 'header', key: 'active-h', title: t('ui.cleaner.activeJobs', 'Active Jobs') }] : []),
    ...active.map(b => ({ type: 'job', key: `a-${b.id}`, item: b })),
    ...(completed.length ? [{ type: 'header', key: 'done-h', title: t('ui.cleaner.completedJobs', 'Completed') }] : []),
    ...completed.map(b => ({ type: 'job', key: `c-${b.id}`, item: b })),
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{t('ui.cleaner.welcome', 'Welcome')}</Text>
          <Text style={s.title}>{profile?.full_name ?? t('ui.cleaner.myJobs', 'My Jobs')}</Text>
        </View>
        <View style={s.countBadge}>
          <Text style={s.countNum}>{active.length}</Text>
          <Text style={s.countLabel}>{t('ui.cleaner.newJobs', 'Active')}</Text>
        </View>
      </View>

      {!cleanerId ? (
        <View style={s.empty}>
          <Ionicons name="alert-circle-outline" size={40} color="#F59E0B" />
          <Text style={s.emptyTitle}>{t('ui.cleaner.notLinked', 'Account not linked')}</Text>
          <Text style={s.emptyText}>{t('ui.cleaner.notLinkedHint', 'Ask your admin to link your account to a team member profile.')}</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={row => row.key}
          renderItem={({ item: row }) => {
            if (row.type === 'header') {
              return <Text style={s.sectionTitle}>{row.title}</Text>;
            }
            return renderCard(row.item);
          }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchJobs(); }} tintColor="#38BDF8" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="briefcase-outline" size={40} color="#38BDF8" />
              <Text style={s.emptyTitle}>{t('ui.cleaner.noJobs', 'No assigned jobs yet')}</Text>
              <Text style={s.emptyText}>{t('ui.cleaner.noJobsHint', 'New orders will appear here after admin assigns you.')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default CleanerJobsScreen;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  greeting: { color: '#7A8A9A', fontSize: 13, marginBottom: 4 },
  title: { color: '#E8EDF5', fontSize: 24, fontWeight: '800' },
  countBadge: { alignItems: 'center', backgroundColor: 'rgba(56,189,248,0.12)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)' },
  countNum: { color: '#38BDF8', fontSize: 22, fontWeight: '800' },
  countLabel: { color: '#7A8A9A', fontSize: 11, fontWeight: '600' },
  sectionTitle: { color: '#A0B0C0', fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: { backgroundColor: '#0F1629', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardNum: { color: '#38BDF8', fontSize: 15, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardService: { color: '#E8EDF5', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardCustomer: { color: '#7A8A9A', fontSize: 13, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  metaText: { color: '#8899AA', fontSize: 12, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  price: { color: '#38BDF8', fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { color: '#E8EDF5', fontSize: 17, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  emptyText: { color: '#7A8A9A', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
