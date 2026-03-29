import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: '#F59E0B', bg: 'rgba(245,158,11,0.18)'  },
  confirmed:   { label: 'Confirmed',   color: '#38BDF8', bg: 'rgba(56,189,248,0.18)'  },
  in_progress: { label: 'In Progress', color: '#10B981', bg: 'rgba(16,185,129,0.18)'  },
  completed:   { label: 'Completed',   color: '#22C55E', bg: 'rgba(34,197,94,0.18)'   },
  cancelled:   { label: 'Cancelled',   color: '#EF4444', bg: 'rgba(239,68,68,0.18)'   },
  scheduled:   { label: 'Scheduled',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.18)'  },
};

const getServiceIcon = (name: string | null | undefined): IoniconName => {
  const n = (name || '').toLowerCase();
  if (n.includes('villa'))                          return 'home-outline';
  if (n.includes('kitchen'))                        return 'restaurant-outline';
  if (n.includes('bathroom') || n.includes('bath')) return 'water-outline';
  if (n.includes('window'))                         return 'grid-outline';
  if (n.includes('deep'))                           return 'color-wand-outline';
  if (n.includes('move'))                           return 'cube-outline';
  if (n.includes('construct'))                      return 'construct-outline';
  if (n.includes('package') || n.includes('complete')) return 'gift-outline';
  return 'brush-outline';
};

const formatTime = (t: string | null): string => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, '0')} ${period}`;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const getDateLabel = () => {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const d = new Date();
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, color, iconBg }: {
  icon: IoniconName; label: string; value: string; color: string; iconBg: string;
}) => (
  <View style={[s.statCard, { borderColor: color + '28' }]}>
    <View style={[s.statIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const OrderRow = ({ order, onPress }: { order: any; onPress: () => void }) => {
  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
  const serviceName = order.services?.name ?? order.customer_name ?? 'Cleaning Service';
  const customerName = (order.customer_name ?? 'Customer').trim();

  return (
    <TouchableOpacity style={s.orderRow} onPress={onPress} activeOpacity={0.78}>
      <View style={[s.orderAccent, { backgroundColor: cfg.color }]} />
      <View style={[s.orderIconWrap, { backgroundColor: cfg.color + '22' }]}>
        <Ionicons name={getServiceIcon(serviceName)} size={20} color={cfg.color} />
      </View>
      <View style={s.orderInfo}>
        <Text style={s.orderService} numberOfLines={1}>{serviceName}</Text>
        <Text style={s.orderMeta}>{customerName}  ·  {formatTime(order.service_time)}</Text>
      </View>
      <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const ActionBtn = ({ icon, label, onPress }: { icon: IoniconName; label: string; onPress: () => void }) => (
  <TouchableOpacity style={s.actionBtn} onPress={onPress} activeOpacity={0.78}>
    <Ionicons name={icon} size={26} color="#38BDF8" />
    <Text style={s.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminDashboardScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();

  const [stats, setStats]       = useState({ todayOrders: 0, pending: 0, inProgress: 0, revenueToday: 0 });
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: allBookings } = await supabase
        .from('bookings')
        .select('id, status, total_price, service_date');

      if (allBookings) {
        const todayB = allBookings.filter(b => b.service_date === today);
        setStats({
          todayOrders:  todayB.length,
          pending:      allBookings.filter(b => b.status === 'pending').length,
          inProgress:   allBookings.filter(b => b.status === 'in_progress').length,
          revenueToday: todayB
            .filter(b => b.status !== 'cancelled')
            .reduce((s, b) => s + (Number(b.total_price) || 0), 0),
        });
      }

      const { data: orders, error: ordersError } = await supabase
        .from('bookings')
        .select('*, services:service_id(name)')
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .order('service_date', { ascending: true })
        .order('service_time', { ascending: true })
        .limit(8);
      if (ordersError) { console.error('Dashboard orders fetch error:', ordersError); }

      if (orders) setActiveOrders(orders);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin';
  const adminInit = (profile?.full_name ?? 'A')[0].toUpperCase();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatarWrap}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{adminInit}</Text>
              </View>
              <View style={s.adminBadge}><Text style={s.adminBadgeText}>Admin</Text></View>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={s.greeting}>{getGreeting()}, {firstName}</Text>
              <Text style={s.dateLabel}>{getDateLabel()}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#C8D8E8" />
            {stats.pending > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{stats.pending}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, gap: 10, paddingBottom: 4 }}
          style={{ marginBottom: 8 }}
        >
          <StatCard icon="calendar"        label="Today Orders" value={String(stats.todayOrders)} color="#38BDF8" iconBg="rgba(56,189,248,0.14)" />
          <StatCard icon="time"             label="Pending"      value={String(stats.pending)}     color="#F59E0B" iconBg="rgba(245,158,11,0.14)" />
          <StatCard icon="checkmark-circle" label="In Progress"  value={String(stats.inProgress)}  color="#10B981" iconBg="rgba(16,185,129,0.14)" />
          <StatCard icon="cash-outline"     label="AED Today"    value={stats.revenueToday.toLocaleString('en-AE', { maximumFractionDigits: 0 })} color="#E8EDF5" iconBg="rgba(232,237,245,0.1)" />
        </ScrollView>

        {/* ── Active Orders ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Active Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminTabs' as any)}>
              <Text style={s.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#38BDF8" style={{ marginVertical: 24 }} />
          ) : activeOrders.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={36} color="#38BDF8" />
              <Text style={s.emptyText}>No active orders</Text>
            </View>
          ) : (
            activeOrders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                onPress={() => navigation.navigate('AdminOrderDetail', { bookingId: order.id })}
              />
            ))
          )}
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            <ActionBtn icon="add-circle-outline" label="New Order"  onPress={() => Alert.alert('Coming Soon', 'Create order feature coming soon!')} />
            <ActionBtn icon="people-outline"     label="Team"       onPress={() => navigation.navigate('AdminTabs' as any)} />
            <ActionBtn icon="bar-chart-outline"  label="Reports"    onPress={() => Alert.alert('Coming Soon', 'Reports coming soon!')} />
            <ActionBtn icon="settings-outline"   label="Settings"   onPress={() => navigation.navigate('AdminTabs' as any)} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AdminDashboardScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#070B18' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  headerLeft:     { flexDirection: 'row', alignItems: 'flex-start' },
  avatarWrap:     { alignItems: 'center' },
  avatar:         { width: 48, height: 48, borderRadius: 24, backgroundColor: '#38BDF8', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#000', fontSize: 20, fontWeight: '800' },
  adminBadge:     { backgroundColor: 'rgba(56,189,248,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: 'rgba(56,189,248,0.35)' },
  adminBadgeText: { color: '#38BDF8', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  greeting:       { color: '#E8EDF5', fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  dateLabel:      { color: '#7A8A9A', fontSize: 12, marginTop: 2 },
  bellBtn:        { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bellBadge:      { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText:  { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Stats
  statCard:  {
    width: 110, backgroundColor: '#0F1629', borderRadius: 16, padding: 14,
    borderWidth: 1, alignItems: 'flex-start',
  },
  statIconWrap:  { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue:     { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel:     { fontSize: 11, color: '#7A8A9A', fontWeight: '500' },

  // Sections
  section:       { marginTop: 8, paddingHorizontal: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { color: '#E8EDF5', fontSize: 17, fontWeight: '800' },
  seeAll:        { color: '#38BDF8', fontSize: 13, fontWeight: '600' },

  // Order rows
  orderRow:      {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1629',
    borderRadius: 14, marginBottom: 10, padding: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  orderAccent:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 3 },
  orderIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  orderInfo:     { flex: 1 },
  orderService:  { color: '#E8EDF5', fontSize: 15, fontWeight: '700' },
  orderMeta:     { color: '#7A8A9A', fontSize: 12, marginTop: 2 },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText:    { fontSize: 11, fontWeight: '700' },

  // Empty
  emptyBox:  { alignItems: 'center', paddingVertical: 28 },
  emptyText: { color: '#7A8A9A', fontSize: 14, marginTop: 10 },

  // Quick Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  actionBtn:   {
    width: '47.5%', backgroundColor: '#0F1629', borderRadius: 16, padding: 18,
    alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  actionLabel: { color: '#E8EDF5', fontSize: 15, fontWeight: '700', marginTop: 10 },
});
