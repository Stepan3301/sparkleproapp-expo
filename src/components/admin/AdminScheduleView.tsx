import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';
import { useSimpleTranslation } from '../../utils/i18n';
import { translateBookingStatus } from '../../utils/translateStatus';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TEAM_COLORS = ['#38BDF8', '#10B981', '#8B5CF6'];
const LANE_MAX_H = Dimensions.get('window').height - 280;

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#38BDF8',
  scheduled: '#8B5CF6',
  in_progress: '#10B981',
  completed: '#22C55E',
  cancelled: '#EF4444',
};

interface TeamRow {
  id: number;
  name: string;
}

interface ScheduleBooking {
  id: number;
  team_id: number | null;
  service_date: string;
  service_time: string;
  duration_hours: number;
  status: string;
  customer_name: string | null;
  services?: { name: string } | null;
}

const formatTime = (t: string | null): string => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m ?? 0).padStart(2, '0')} ${period}`;
};

const addDays = (iso: string, delta: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
};

const formatScheduleDate = (
  iso: string,
  t: (key: string, fallback?: string) => string,
): string => {
  const d = new Date(iso + 'T12:00:00');
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = addDays(today, 1);
  if (iso === today) return t('ui.today', 'Today');
  if (iso === tomorrow) return t('ui.tomorrow', 'Tomorrow');
  const months = [
    t('ui.monthsShort.1', 'Jan'), t('ui.monthsShort.2', 'Feb'), t('ui.monthsShort.3', 'Mar'),
    t('ui.monthsShort.4', 'Apr'), t('ui.monthsShort.5', 'May'), t('ui.monthsShort.6', 'Jun'),
    t('ui.monthsShort.7', 'Jul'), t('ui.monthsShort.8', 'Aug'), t('ui.monthsShort.9', 'Sep'),
    t('ui.monthsShort.10', 'Oct'), t('ui.monthsShort.11', 'Nov'), t('ui.monthsShort.12', 'Dec'),
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

interface Props {
  bottomInset: number;
}

const AdminScheduleView: React.FC<Props> = ({ bottomInset }) => {
  const navigation = useNavigation<Nav>();
  const { t } = useSimpleTranslation();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const [teamsRes, bookingsRes] = await Promise.all([
        supabase
          .from('teams')
          .select('id, name')
          .eq('is_active', true)
          .order('id'),
        supabase
          .from('bookings')
          .select('id, team_id, service_date, service_time, duration_hours, status, customer_name, services:service_id(name)')
          .eq('service_date', selectedDate)
          .not('status', 'in', '("cancelled","completed")')
          .order('service_time'),
      ]);

      if (!teamsRes.error) setTeams(teamsRes.data ?? []);
      if (!bookingsRes.error) setBookings(bookingsRes.data ?? []);
    } catch (e) {
      console.error('Schedule fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    fetchSchedule();
  }, [fetchSchedule]);

  const unassigned = useMemo(
    () => bookings.filter(b => !b.team_id),
    [bookings],
  );

  const byTeam = useMemo(() => {
    const map: Record<number, ScheduleBooking[]> = {};
    for (const team of teams) map[team.id] = [];
    for (const b of bookings) {
      if (b.team_id && map[b.team_id]) map[b.team_id].push(b);
    }
    return map;
  }, [bookings, teams]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  return (
    <View style={s.root}>
      <View style={s.dateNav}>
        <TouchableOpacity style={s.dateBtn} onPress={() => setSelectedDate(d => addDays(d, -1))}>
          <Ionicons name="chevron-back" size={20} color="#38BDF8" />
        </TouchableOpacity>
        <Text style={s.dateLabel}>{formatScheduleDate(selectedDate, t)}</Text>
        <TouchableOpacity style={s.dateBtn} onPress={() => setSelectedDate(d => addDays(d, 1))}>
          <Ionicons name="chevron-forward" size={20} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {unassigned.length > 0 && (
        <View style={s.unassignedBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
          <Text style={s.unassignedText}>
            {t('ui.admin.unassignedBookings', '{{count}} unassigned', { values: { count: unassigned.length } })}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.columnsWrap, { paddingBottom: bottomInset + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
        >
          {teams.map((team, idx) => {
            const laneBookings = byTeam[team.id] ?? [];
            const color = TEAM_COLORS[idx % TEAM_COLORS.length];
            return (
              <View key={team.id} style={s.column}>
                <View style={[s.columnHeader, { borderColor: color + '55' }]}>
                  <View style={[s.columnDot, { backgroundColor: color }]} />
                  <Text style={[s.columnTitle, { color }]} numberOfLines={1}>{team.name}</Text>
                  <Text style={s.columnCount}>{laneBookings.length}</Text>
                </View>

                {laneBookings.length === 0 ? (
                  <View style={s.emptyLane}>
                    <Text style={s.emptyLaneText}>{t('ui.admin.noBookingsLane', 'No bookings')}</Text>
                  </View>
                ) : (
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: LANE_MAX_H }}
                    contentContainerStyle={{ paddingBottom: 8 }}
                  >
                  {laneBookings.map(booking => {
                    const statusColor = STATUS_COLORS[booking.status] ?? '#8899AA';
                    const endHour = (() => {
                      const [h, m] = booking.service_time.split(':').map(Number);
                      const total = h * 60 + (m || 0) + booking.duration_hours * 60;
                      const eh = Math.floor(total / 60) % 24;
                      const em = total % 60;
                      return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
                    })();
                    return (
                      <TouchableOpacity
                        key={booking.id}
                        style={[s.bookingCard, { borderLeftColor: statusColor }]}
                        onPress={() => navigation.navigate('AdminOrderDetail', { bookingId: booking.id })}
                        activeOpacity={0.8}
                      >
                        <Text style={s.bookingTime}>
                          {formatTime(booking.service_time)} – {formatTime(endHour)}
                        </Text>
                        <Text style={s.bookingCustomer} numberOfLines={1}>
                          {booking.customer_name ?? t('ui.customer', 'Customer')}
                        </Text>
                        <Text style={s.bookingService} numberOfLines={2}>
                          {booking.services?.name ?? t('ui.cleaningService', 'Cleaning Service')}
                        </Text>
                        <View style={[s.statusPill, { backgroundColor: statusColor + '22' }]}>
                          <Text style={[s.statusPillText, { color: statusColor }]}>
                            {translateBookingStatus(t, booking.status)}
                          </Text>
                        </View>
                        <Text style={s.bookingDuration}>
                          {booking.duration_hours}h · #{booking.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default AdminScheduleView;

const s = StyleSheet.create({
  root: { flex: 1 },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: '#0F1629',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dateBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dateLabel: { color: '#E8EDF5', fontSize: 16, fontWeight: '700' },
  unassignedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  unassignedText: { color: '#F59E0B', fontSize: 13, fontWeight: '600', flex: 1 },
  columnsWrap: { paddingHorizontal: 14, gap: 10 },
  column: {
    width: 168,
    backgroundColor: '#0F1629',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  columnDot: { width: 8, height: 8, borderRadius: 4 },
  columnTitle: { flex: 1, fontSize: 13, fontWeight: '800' },
  columnCount: { color: '#7A8A9A', fontSize: 12, fontWeight: '700' },
  emptyLane: { padding: 20, alignItems: 'center' },
  emptyLaneText: { color: '#5A6A7A', fontSize: 12 },
  bookingCard: {
    margin: 8,
    marginBottom: 0,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bookingTime: { color: '#E8EDF5', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  bookingCustomer: { color: '#A0B0C0', fontSize: 11, marginBottom: 2 },
  bookingService: { color: '#E8EDF5', fontSize: 12, fontWeight: '600', marginBottom: 6, lineHeight: 16 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4 },
  statusPillText: { fontSize: 9.5, fontWeight: '700' },
  bookingDuration: { color: '#6A7A8A', fontSize: 10 },
});
