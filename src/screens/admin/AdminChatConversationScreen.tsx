import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { useSimpleTranslation } from '../../utils/i18n';
import { translateBookingStatus } from '../../utils/translateStatus';

type Nav   = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AdminChatConversation'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  pending:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  confirmed:   { color: '#38BDF8', bg: 'rgba(56,189,248,0.15)'  },
  in_progress: { color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
  completed:   { color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  cancelled:   { color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, '0')} ${period}`;
};

const formatServiceTime = (t: string | null | undefined): string => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, '0')} ${period}`;
};

const formatDate = (d: string | null | undefined, t: (key: string, fallback?: string) => string): string => {
  if (!d) return '';
  const date      = new Date(d + 'T00:00:00');
  const todayStr  = new Date().toISOString().split('T')[0];
  if (d === todayStr) return t('ui.today', 'Today');
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble = ({ msg, isAdmin }: { msg: any; isAdmin: boolean }) => {
  return (
    <View style={[s.bubbleWrap, isAdmin ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
      <View style={[s.bubble, isAdmin ? s.bubbleAdmin : s.bubbleCustomer]}>
        <Text style={[s.bubbleText, isAdmin ? s.bubbleTextAdmin : s.bubbleTextCustomer]}>
          {msg.content}
        </Text>
      </View>
      <Text style={[s.bubbleTime, isAdmin ? s.bubbleTimeRight : s.bubbleTimeLeft]}>
        {formatTime(msg.created_at)}
      </Text>
    </View>
  );
};

// ─── Status Event ─────────────────────────────────────────────────────────────

const StatusEvent = ({ text }: { text: string }) => (
  <View style={s.eventWrap}>
    <View style={s.eventPill}>
      <Text style={s.eventText}>{text}</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminChatConversationScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { user } = useAuth();
  const { t } = useSimpleTranslation();

  const {
    bookingId, customerId, customerName,
    serviceName: routeServiceName,
    serviceDate, serviceTime,
    orderStatus = 'pending',
  } = route.params;

  const serviceName = routeServiceName ?? t('ui.cleaningService', 'Cleaning Service');

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);

    // Mark customer messages as read
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('booking_id', bookingId)
      .eq('sender_role', 'customer')
      .eq('is_read', false);
  }, [bookingId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${bookingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `booking_id=eq.${bookingId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setSending(true);
    setText('');

    const { error } = await supabase.from('chat_messages').insert({
      booking_id:  bookingId,
      customer_id: customerId,
      sender_id:   user.id,
      sender_role: 'admin',
      content,
      is_read:     false,
    });

    if (error) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.sendFailed', 'Could not send message. Please try again.'));
      setText(content);
    }
    setSending(false);
  };

  const customerInitial = customerName[0]?.toUpperCase() ?? '?';
  const cfg = STATUS_CFG[orderStatus] ?? STATUS_CFG.pending;

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#E8EDF5" />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>{customerInitial}</Text>
        </View>

        {/* Name + order */}
        <View style={s.headerInfo}>
          <Text style={s.headerName}>{customerName}</Text>
          <Text style={s.headerOrder}>
            {t('ui.admin.orderNumber', 'Order #{{id}}', { values: { id: bookingId } })}
          </Text>
        </View>

        {/* Actions */}
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerActionBtn}>
            <Ionicons name="call" size={18} color="#E8EDF5" />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerActionBtn}>
            <Ionicons name="videocam" size={18} color="#E8EDF5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Order Info Pill ── */}
      <View style={s.orderPill}>
        <Text style={s.orderPillService}>{serviceName}</Text>
        {serviceDate && <Text style={s.orderPillDot}>·</Text>}
        {serviceDate && <Text style={s.orderPillDate}>{formatDate(serviceDate, t)} {formatServiceTime(serviceTime)}</Text>}
        <Text style={s.orderPillDot}>·</Text>
        <View style={[s.orderPillStatus, { backgroundColor: cfg.bg }]}>
          <View style={[s.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={[s.orderPillStatusText, { color: cfg.color }]}>
            {translateBookingStatus(t, orderStatus)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AdminOrderDetail', { bookingId })}>
          <Text style={s.viewOrder}>{t('ui.viewOrder', 'View Order')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#38BDF8" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => String(item.id)}
          renderItem={({ item, index }) => {
            const isAdmin = item.sender_role === 'admin';
            // Check if previous message is a different role (for grouping)
            const prevMsg = messages[index - 1];
            const showStatusEvent = prevMsg &&
              prevMsg.sender_role !== item.sender_role &&
              item.sender_role === 'customer' &&
              index > 0 && index % 5 === 0; // Simulate status events periodically

            return (
              <>
                {showStatusEvent && (
                  <StatusEvent
                    text={t('ui.admin.orderStatusUpdated', 'Order status updated · {{time}}', {
                      values: { time: formatTime(item.created_at) },
                    })}
                  />
                )}
                <MessageBubble msg={item} isAdmin={isAdmin} />
              </>
            );
          }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="chatbubble-outline" size={36} color="#38BDF8" />
              <Text style={s.emptyText}>{t('ui.admin.noMessages', 'No messages yet')}</Text>
              <Text style={s.emptySubtext}>{t('ui.admin.startConversation', 'Send a message to start the conversation')}</Text>
            </View>
          }
        />
      )}

      {/* ── Input Bar ── */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={s.attachBtn}>
          <Ionicons name="attach" size={22} color="#38BDF8" />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          placeholder={t('ui.admin.typeMessage', 'Type a message...')}
          placeholderTextColor="#5A6A7A"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size={16} color="#000" />
            : <Ionicons name="send" size={18} color="#000" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AdminChatConversationScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },

  // Header
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  backBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerAvatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(56,189,248,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 2, borderColor: 'rgba(56,189,248,0.4)' },
  headerAvatarText: { color: '#38BDF8', fontSize: 18, fontWeight: '800' },
  headerInfo:       { flex: 1 },
  headerName:       { color: '#E8EDF5', fontSize: 16, fontWeight: '800' },
  headerOrder:      { color: '#7A8A9A', fontSize: 12, marginTop: 1 },
  headerActions:    { flexDirection: 'row', gap: 8 },
  headerActionBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(56,189,248,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Order pill
  orderPill:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1629', marginHorizontal: 14, marginVertical: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexWrap: 'wrap', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  orderPillService: { color: '#A0B0C0', fontSize: 12, fontWeight: '600' },
  orderPillDot:     { color: '#5A6A7A', fontSize: 12 },
  orderPillDate:    { color: '#A0B0C0', fontSize: 12 },
  orderPillStatus:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, gap: 4 },
  statusDot:        { width: 6, height: 6, borderRadius: 3 },
  orderPillStatusText: { fontSize: 11, fontWeight: '700' },
  viewOrder:        { color: '#38BDF8', fontSize: 12, fontWeight: '700' },

  // Messages
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText:   { color: '#E8EDF5', fontSize: 16, fontWeight: '700', marginTop: 14 },
  emptySubtext:{ color: '#7A8A9A', fontSize: 13, marginTop: 6 },

  bubbleWrap:       { marginHorizontal: 14, marginVertical: 3, maxWidth: '80%' },
  bubbleWrapLeft:   { alignSelf: 'flex-start' },
  bubbleWrapRight:  { alignSelf: 'flex-end' },
  bubble:           { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleCustomer:   { backgroundColor: '#161F35', borderBottomLeftRadius: 4 },
  bubbleAdmin:      { backgroundColor: '#38BDF8', borderBottomRightRadius: 4 },
  bubbleText:       { fontSize: 15, lineHeight: 21 },
  bubbleTextCustomer:{ color: '#E8EDF5' },
  bubbleTextAdmin:  { color: '#000' },
  bubbleTime:       { fontSize: 10, marginTop: 3, color: '#5A6A7A' },
  bubbleTimeLeft:   { alignSelf: 'flex-start', marginLeft: 4 },
  bubbleTimeRight:  { alignSelf: 'flex-end', marginRight: 4 },

  // Status event
  eventWrap: { alignItems: 'center', marginVertical: 12 },
  eventPill: { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  eventText: { color: '#7A8A9A', fontSize: 11 },

  // Input
  inputBar:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', backgroundColor: '#070B18', gap: 10 },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  input:     { flex: 1, backgroundColor: '#0F1629', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#E8EDF5', fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sendBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: '#38BDF8', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
