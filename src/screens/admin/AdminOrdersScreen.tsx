import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, StatusBar, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'Pending',     color: '#F59E0B', bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.28)'  },
  confirmed:   { label: 'Confirmed',   color: '#38BDF8', bg: 'rgba(56,189,248,0.16)', border: 'rgba(56,189,248,0.28)'  },
  in_progress: { label: 'In Progress', color: '#10B981', bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.28)'  },
  completed:   { label: 'Completed',   color: '#22C55E', bg: 'rgba(34,197,94,0.16)',  border: 'rgba(34,197,94,0.28)'   },
  cancelled:   { label: 'Cancelled',   color: '#EF4444', bg: 'rgba(239,68,68,0.16)',  border: 'rgba(239,68,68,0.28)'   },
  scheduled:   { label: 'Scheduled',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.16)', border: 'rgba(139,92,246,0.28)'  },
};

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  const date      = new Date(d + 'T00:00:00');
  const todayStr  = new Date().toISOString().split('T')[0];
  const tomorStr  = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const yesterStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (d === todayStr)  return 'Today';
  if (d === tomorStr)  return 'Tomorrow';
  if (d === yesterStr) return 'Yesterday';
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

const formatTime = (t: string | null): string => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, '0')} ${period}`;
};

const getServiceIcon = (name: string | null | undefined): IoniconName => {
  const n = (name || '').toLowerCase();
  if (n.includes('villa'))     return 'home-outline';
  if (n.includes('kitchen'))   return 'restaurant-outline';
  if (n.includes('bathroom'))  return 'water-outline';
  if (n.includes('window'))    return 'grid-outline';
  if (n.includes('deep'))      return 'color-wand-outline';
  if (n.includes('move'))      return 'cube-outline';
  if (n.includes('construct')) return 'construct-outline';
  return 'brush-outline';
};

const FILTER_TABS = [
  { key: 'all',         label: 'All'         },
  { key: 'pending',     label: 'Pending'     },
  { key: 'confirmed',   label: 'Confirmed'   },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed'   },
  { key: 'cancelled',   label: 'Cancelled'   },
];

// ─── Order Card (grid cell) ───────────────────────────────────────────────────

const OrderCard = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
  const serviceName  = item.services?.name ?? 'Cleaning Service';
  const customerName = (item.customer_name ?? 'Customer').trim();
  const lastName     = customerName.split(' ').slice(-1)[0] ?? customerName;
  const firstInitial = customerName[0]?.toUpperCase() ?? '?';

  return (
    <TouchableOpacity style={[s.card, { borderLeftColor: cfg.color, borderLeftWidth: 3 }]} onPress={onPress} activeOpacity={0.78}>
      {/* Top row */}
      <View style={s.cardTop}>
        <Text style={[s.cardNum, { color: cfg.color }]}>#{item.id}</Text>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={s.cardService} numberOfLines={2}>{serviceName}</Text>
      <Text style={s.cardCustomer} numberOfLines={1}>
        {firstInitial}. {lastName}
      </Text>

      <View style={s.cardDivider} />

      {/* Bottom row */}
      <View style={s.cardBottom}>
        <View style={s.cardDateRow}>
          <Ionicons name="calendar-outline" size={11} color="#7A8A9A" />
          <Text style={s.cardDate}>{formatDate(item.service_date)}</Text>
        </View>
        <Text style={s.cardTime}>{formatTime(item.service_time)}</Text>
      </View>

      <View style={s.cardPriceRow}>
        <Ionicons name="people-outline" size={11} color={item.team_id ? '#38BDF8' : '#EF4444'} />
        <Text style={[s.cardAssign, { color: item.team_id ? '#38BDF8' : '#EF4444' }]}>
          {item.team_id ? 'Assigned' : 'Unassigned'}
        </Text>
        <Text style={s.cardPrice}>{Number(item.total_price ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })} AED</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminOrdersScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [bookings, setBookings]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');

  const fetchBookings = useCallback(async () => {
    try {
      // customer_name is stored directly on the booking row.
      // We only join services (which has a proper FK constraint).
      const { data, error } = await supabase
        .from('bookings')
        .select('*, services:service_id(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Orders fetch error:', error);
      } else {
        setBookings(data ?? []);
      }
    } catch (e) {
      console.error('Orders fetch exception:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  const displayed = useMemo(() => {
    let list = bookings;
    if (filter !== 'all') list = list.filter(b => b.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(b =>
        String(b.id).includes(q) ||
        (b.customer_name ?? '').toLowerCase().includes(q) ||
        (b.customer_phone ?? '').toLowerCase().includes(q) ||
        (b.services?.name ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, filter, search]);

  const renderCard = ({ item }: { item: any }) => (
    <OrderCard item={item} onPress={() => navigation.navigate('AdminOrderDetail', { bookingId: item.id })} />
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>All Orders</Text>
        <TouchableOpacity style={s.filterIcon}>
          <Ionicons name="options-outline" size={20} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#5A6A7A" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by customer, order #..."
          placeholderTextColor="#5A6A7A"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#5A6A7A" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 8, alignItems: 'center' }}
        style={{ marginBottom: 8, flexGrow: 0 }}
      >
        {FILTER_TABS.map(tab => {
          const isActive = filter === tab.key;
          const cfg = tab.key === 'all' ? null : STATUS_CFG[tab.key];
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterTab, isActive && { backgroundColor: cfg?.color ?? '#38BDF8', borderColor: cfg?.color ?? '#38BDF8' }]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[s.filterTabText, isActive && { color: '#000' }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Orders Grid ── */}
      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => String(item.id)}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 18, gap: 10 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="reader-outline" size={40} color="#38BDF8" />
              <Text style={s.emptyText}>No orders found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default AdminOrdersScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#070B18' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  title:        { color: '#E8EDF5', fontSize: 22, fontWeight: '800' },
  filterIcon:   { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(56,189,248,0.12)', alignItems: 'center', justifyContent: 'center' },

  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 12, backgroundColor: '#0F1629', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  searchInput:  { flex: 1, color: '#E8EDF5', fontSize: 14 },

  filterTab:      { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  filterTabText:  { color: '#A0B0C0', fontSize: 13, fontWeight: '600' },

  // Cards
  card:         {
    flex: 1, backgroundColor: '#0F1629', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
  },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardNum:      { fontSize: 15, fontWeight: '800' },
  badge:        { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  badgeText:    { fontSize: 9.5, fontWeight: '700' },
  cardService:  { color: '#E8EDF5', fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 3 },
  cardCustomer: { color: '#7A8A9A', fontSize: 11, marginBottom: 8 },
  cardDivider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 8 },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardDateRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDate:     { color: '#8899AA', fontSize: 10 },
  cardTime:     { color: '#8899AA', fontSize: 10 },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardAssign:   { fontSize: 10, fontWeight: '600', flex: 1 },
  cardPrice:    { color: '#38BDF8', fontSize: 13, fontWeight: '800' },

  // Empty
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyText:    { color: '#7A8A9A', fontSize: 15, marginTop: 12 },
});
