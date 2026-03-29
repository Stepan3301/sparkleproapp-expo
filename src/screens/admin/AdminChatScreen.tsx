import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  pending:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  confirmed:   { color: '#38BDF8', bg: 'rgba(56,189,248,0.15)'  },
  in_progress: { color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
  completed:   { color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  cancelled:   { color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
};

const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Chat Thread Item ─────────────────────────────────────────────────────────

const ThreadItem = ({ item, onPress }: { item: any; onPress: () => void }) => {
  const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
  const customerName = (item.customer_name ?? 'Customer').trim();
  const initial = (customerName || '?')[0]?.toUpperCase();
  const serviceName  = item.services?.name ?? 'Cleaning Service';
  const lastMsg      = item.last_message ?? 'Tap to open conversation';
  const hasUnread    = (item.unread_count ?? 0) > 0;

  return (
    <TouchableOpacity style={s.thread} onPress={onPress} activeOpacity={0.78}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
      </View>

      {/* Content */}
      <View style={s.threadContent}>
        <View style={s.threadTop}>
          <Text style={s.threadName} numberOfLines={1}>{customerName}</Text>
          <Text style={s.threadTime}>{formatRelativeTime(item.last_message_at ?? item.updated_at)}</Text>
        </View>
        <View style={s.threadMid}>
          <Text style={s.orderRef}>Order #{item.id} · {serviceName}</Text>
        </View>
        <Text style={[s.lastMsg, hasUnread && { color: '#E8EDF5', fontWeight: '600' }]} numberOfLines={1}>
          {lastMsg}
        </Text>
      </View>

      {/* Unread badge */}
      {hasUnread && (
        <View style={s.unreadBadge}>
          <Text style={s.unreadText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminChatScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [threads, setThreads]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');

  const fetchThreads = useCallback(async () => {
    try {
      // Fetch bookings + last chat message for each
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, services:service_id(name)')
        .not('status', 'eq', 'cancelled')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (bookingsError) { console.error('Chat threads fetch error:', bookingsError); }

      if (!bookings) { setLoading(false); setRefreshing(false); return; }

      // For each booking, fetch last chat message
      const threadsWithMsg = await Promise.all(bookings.map(async (b) => {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('content, created_at, sender_role, is_read')
          .eq('booking_id', b.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = msgs?.[0];
        const unreadCount = lastMsg && !lastMsg.is_read && lastMsg.sender_role === 'customer' ? 1 : 0;

        return {
          ...b,
          last_message:    lastMsg?.content ?? null,
          last_message_at: lastMsg?.created_at ?? null,
          unread_count:    unreadCount,
        };
      }));

      setThreads(threadsWithMsg);
    } catch (e) {
      console.error('Chat threads fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);
  const onRefresh = () => { setRefreshing(true); fetchThreads(); };

  const displayed = threads.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.customer_name ?? '').toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  });

  // Sort: unread first, then by last message time
  const sorted = [...displayed].sort((a, b) => {
    if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count;
    const aTime = new Date(a.last_message_at ?? a.updated_at).getTime();
    const bTime = new Date(b.last_message_at ?? b.updated_at).getTime();
    return bTime - aTime;
  });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>Chat</Text>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{threads.filter(t => t.unread_count > 0).length} unread</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#5A6A7A" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by customer or order..."
          placeholderTextColor="#5A6A7A"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#5A6A7A" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Thread List ── */}
      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ThreadItem
              item={item}
              onPress={() => navigation.navigate('AdminChatConversation', {
                bookingId:    item.id,
                customerId:   item.customer_id,
                customerName: (item.customer_name ?? 'Customer').trim(),
                serviceName:  item.services?.name ?? 'Cleaning Service',
                serviceDate:  item.service_date,
                serviceTime:  item.service_time,
                orderStatus:  item.status,
              })}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubbles-outline" size={44} color="#38BDF8" />
              <Text style={s.emptyTitle}>No conversations yet</Text>
              <Text style={s.emptyText}>Chats will appear here when customers message you.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default AdminChatScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#070B18' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, gap: 12 },
  title:  { color: '#E8EDF5', fontSize: 22, fontWeight: '800', flex: 1 },
  headerBadge:     { backgroundColor: 'rgba(56,189,248,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  headerBadgeText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 8, backgroundColor: '#0F1629', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  searchInput: { flex: 1, color: '#E8EDF5', fontSize: 14 },

  thread:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  avatarWrap:    { position: 'relative', marginRight: 14 },
  avatar:        { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(56,189,248,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#38BDF8', fontSize: 20, fontWeight: '800' },
  statusDot:     { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#070B18' },
  threadContent: { flex: 1 },
  threadTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  threadName:    { color: '#E8EDF5', fontSize: 15, fontWeight: '700', flex: 1 },
  threadTime:    { color: '#5A6A7A', fontSize: 11 },
  threadMid:     { marginBottom: 3 },
  orderRef:      { color: '#38BDF8', fontSize: 11, fontWeight: '600' },
  lastMsg:       { color: '#7A8A9A', fontSize: 13 },
  unreadBadge:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#38BDF8', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadText:    { color: '#000', fontSize: 11, fontWeight: '800' },

  empty:      { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { color: '#E8EDF5', fontSize: 17, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyText:  { color: '#7A8A9A', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
