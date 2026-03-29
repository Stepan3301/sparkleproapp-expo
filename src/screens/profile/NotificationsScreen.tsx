import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface NotifItem {
  id: string;
  icon: IoniconName;
  iconBg: string;
  label: string;
  sub: string;
}

interface NotifGroup {
  title: string;
  items: NotifItem[];
}

const GROUPS: NotifGroup[] = [
  {
    title: 'BOOKING UPDATES',
    items: [
      { id: 'booking_confirmed', icon: 'calendar-outline',     iconBg: '#2563EB', label: 'Booking Confirmed',  sub: 'When your booking is confirmed' },
      { id: 'booking_reminder',  icon: 'alarm-outline',         iconBg: '#3B82F6', label: 'Booking Reminder',  sub: '1 hour before your booking' },
      { id: 'cleaner_on_way',    icon: 'location',              iconBg: '#10B981', label: 'Cleaner On The Way', sub: 'When cleaner is heading to you' },
      { id: 'booking_completed', icon: 'checkmark-circle',      iconBg: '#22C55E', label: 'Booking Completed', sub: 'When job is done' },
      { id: 'booking_cancelled', icon: 'close-circle',          iconBg: '#EF4444', label: 'Booking Cancelled', sub: 'If booking is cancelled' },
    ],
  },
  {
    title: 'PROMOTIONS',
    items: [
      { id: 'special_offers', icon: 'pricetag-outline',    iconBg: '#F59E0B', label: 'Special Offers', sub: 'Discounts and deals' },
      { id: 'new_services',   icon: 'star-outline',         iconBg: '#8B5CF6', label: 'New Services',  sub: 'New service announcements' },
    ],
  },
  {
    title: 'GENERAL',
    items: [
      { id: 'app_updates',     icon: 'information-circle', iconBg: '#0891B2', label: 'App Updates',    sub: 'Feature updates and improvements' },
      { id: 'account_alerts',  icon: 'notifications',       iconBg: '#7C3AED', label: 'Account Alerts', sub: 'Security and account changes' },
    ],
  },
];

const STORAGE_KEY = 'notif_prefs';

const DEFAULTS: Record<string, boolean> = {
  booking_confirmed: true,
  booking_reminder:  true,
  cleaner_on_way:    true,
  booking_completed: true,
  booking_cancelled: true,
  special_offers:    false,
  new_services:      false,
  app_updates:       true,
  account_alerts:    true,
};

const NotificationsScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs]     = useState<Record<string, boolean>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setPrefs({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {}
      }
      setLoading(false);
    });
  }, []);

  const toggle = async (id: string, val: boolean) => {
    const next = { ...prefs, [id]: val };
    setPrefs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#070B18', '#0D1526', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#22D3EE" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Text style={s.subtitle}>Choose which notifications you want to receive</Text>

          {GROUPS.map(group => (
            <View key={group.title} style={s.group}>
              <Text style={s.groupLabel}>{group.title}</Text>
              <View style={s.card}>
                {group.items.map((item, idx) => (
                  <View key={item.id} style={[s.row, idx < group.items.length - 1 && s.rowBorder]}>
                    <View style={[s.iconWrap, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon} size={18} color="#FFFFFF" />
                    </View>
                    <View style={s.meta}>
                      <Text style={s.rowLabel}>{item.label}</Text>
                      <Text style={s.rowSub}>{item.sub}</Text>
                    </View>
                    <Switch
                      value={prefs[item.id] ?? false}
                      onValueChange={val => toggle(item.id, val)}
                      trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#0891B2' }}
                      thumbColor={prefs[item.id] ? '#22D3EE' : '#94A3B8'}
                      ios_backgroundColor="rgba(255,255,255,0.12)"
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F1F5F9' },

  content: { padding: 18 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  group: { marginBottom: 24 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, marginBottom: 10 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#F1F5F9' },
  rowSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});

export default NotificationsScreen;
