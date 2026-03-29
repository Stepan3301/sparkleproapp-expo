import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Setting Row ──────────────────────────────────────────────────────────────

const SettingRow = ({
  icon, label, sublabel, value, onPress, isSwitch, switchValue, onSwitchChange, danger,
}: {
  icon: IoniconName; label: string; sublabel?: string; value?: string;
  onPress?: () => void; isSwitch?: boolean; switchValue?: boolean;
  onSwitchChange?: (v: boolean) => void; danger?: boolean;
}) => (
  <TouchableOpacity
    style={s.row}
    onPress={onPress}
    disabled={!onPress && !isSwitch}
    activeOpacity={onPress ? 0.75 : 1}
  >
    <View style={[s.rowIcon, danger && { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
      <Ionicons name={icon} size={18} color={danger ? '#EF4444' : '#38BDF8'} />
    </View>
    <View style={s.rowContent}>
      <Text style={[s.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
      {sublabel && <Text style={s.rowSublabel}>{sublabel}</Text>}
    </View>
    {isSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: '#2A3A4A', true: 'rgba(56,189,248,0.6)' }}
        thumbColor={switchValue ? '#38BDF8' : '#5A6A7A'}
      />
    ) : value ? (
      <Text style={s.rowValue}>{value}</Text>
    ) : onPress ? (
      <Ionicons name="chevron-forward" size={16} color="#3A4A5A" />
    ) : null}
  </TouchableOpacity>
);

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={s.sectionTitle}>{title}</Text>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminSettingsScreen: React.FC = () => {
  const insets  = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  const [notifOrders,  setNotifOrders]  = useState(true);
  const [notifChat,    setNotifChat]    = useState(true);
  const [notifReports, setNotifReports] = useState(false);
  const [darkMode,     setDarkMode]     = useState(true);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin';
  const adminInit = (profile?.full_name ?? 'A')[0].toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Profile Card ── */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{adminInit}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{profile?.full_name ?? 'Admin User'}</Text>
            <View style={s.adminBadge}>
              <Text style={s.adminBadgeText}>Admin</Text>
            </View>
          </View>
          <TouchableOpacity style={s.editBtn}>
            <Ionicons name="create-outline" size={18} color="#38BDF8" />
          </TouchableOpacity>
        </View>

        {/* ── Notifications ── */}
        <SectionHeader title="Notifications" />
        <View style={s.section}>
          <SettingRow icon="notifications-outline" label="New Orders"      sublabel="Notify when a new order arrives"         isSwitch switchValue={notifOrders}  onSwitchChange={setNotifOrders}  />
          <SettingRow icon="chatbubble-outline"     label="Customer Chat"   sublabel="Notify on new customer messages"          isSwitch switchValue={notifChat}    onSwitchChange={setNotifChat}    />
          <SettingRow icon="bar-chart-outline"      label="Daily Reports"   sublabel="Receive daily summary notifications"      isSwitch switchValue={notifReports} onSwitchChange={setNotifReports} />
        </View>

        {/* ── Business ── */}
        <SectionHeader title="Business" />
        <View style={s.section}>
          <SettingRow icon="time-outline"        label="Business Hours"  sublabel="8:00 AM – 10:00 PM"   value="8AM–10PM" onPress={() => Alert.alert('Coming Soon', 'Business hours management coming soon!')} />
          <SettingRow icon="people-outline"      label="Team Capacity"   sublabel="Max concurrent bookings" value="3"       onPress={() => Alert.alert('Coming Soon', 'Capacity management coming soon!')} />
          <SettingRow icon="cash-outline"        label="Pricing Rules"   sublabel="View and edit service pricing" onPress={() => Alert.alert('Coming Soon', 'Pricing rules coming soon!')} />
          <SettingRow icon="location-outline"    label="Service Area"    sublabel="Dubai, UAE" onPress={() => Alert.alert('Coming Soon', 'Service area management coming soon!')} />
        </View>

        {/* ── Appearance ── */}
        <SectionHeader title="Appearance" />
        <View style={s.section}>
          <SettingRow icon="moon-outline" label="Dark Mode" isSwitch switchValue={darkMode} onSwitchChange={setDarkMode} />
        </View>

        {/* ── Support ── */}
        <SectionHeader title="Support" />
        <View style={s.section}>
          <SettingRow icon="help-circle-outline"    label="Help & FAQ"        onPress={() => Alert.alert('Coming Soon')} />
          <SettingRow icon="document-text-outline"  label="Terms of Service"  onPress={() => Alert.alert('Coming Soon')} />
          <SettingRow icon="shield-checkmark-outline" label="Privacy Policy"  onPress={() => Alert.alert('Coming Soon')} />
        </View>

        {/* ── App Info ── */}
        <SectionHeader title="App" />
        <View style={s.section}>
          <SettingRow icon="information-circle-outline" label="Version"  value="1.0.0" />
          <SettingRow icon="build-outline"               label="Build"   value="2026.3.1" />
        </View>

        {/* ── Sign Out ── */}
        <View style={[s.section, { marginTop: 8 }]}>
          <SettingRow icon="log-out-outline" label="Sign Out" onPress={handleSignOut} danger />
        </View>
      </ScrollView>
    </View>
  );
};

export default AdminSettingsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#070B18' },
  header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  title:  { color: '#E8EDF5', fontSize: 22, fontWeight: '800' },

  // Profile
  profileCard:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 24, backgroundColor: '#0F1629', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  profileAvatar:     { width: 58, height: 58, borderRadius: 29, backgroundColor: '#38BDF8', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  profileAvatarText: { color: '#000', fontSize: 24, fontWeight: '800' },
  profileInfo:       { flex: 1 },
  profileName:       { color: '#E8EDF5', fontSize: 17, fontWeight: '800', marginBottom: 5 },
  adminBadge:        { backgroundColor: 'rgba(56,189,248,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(56,189,248,0.35)' },
  adminBadgeText:    { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  editBtn:           { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(56,189,248,0.12)', alignItems: 'center', justifyContent: 'center' },

  // Sections
  sectionTitle: { color: '#5A6A7A', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 18, marginBottom: 6, marginTop: 20 },
  section:      { marginHorizontal: 18, backgroundColor: '#0F1629', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },

  // Rows
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowIcon:     { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowContent:  { flex: 1 },
  rowLabel:    { color: '#E8EDF5', fontSize: 15, fontWeight: '600' },
  rowSublabel: { color: '#5A6A7A', fontSize: 12, marginTop: 2 },
  rowValue:    { color: '#7A8A9A', fontSize: 13 },
});
