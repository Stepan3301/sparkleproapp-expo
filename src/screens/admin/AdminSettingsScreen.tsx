import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSimpleTranslation } from '../../utils/i18n';
import { supabase } from '../../lib/supabase';

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

const TimeField = ({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) => (
  <View style={s.hourField}>
    <Text style={s.hourLabel}>{label}</Text>
    <TextInput
      style={s.hourInput}
      value={value}
      onChangeText={onChange}
      keyboardType="numbers-and-punctuation"
      placeholder="07:30"
      placeholderTextColor="#5A6A7A"
      maxLength={5}
    />
    <Text style={s.hourHint}>HH:MM</Text>
  </View>
);

const parseTimeInput = (value: string): { hour: number; minute: number } | null => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

const formatTimeInput = (hour: number, minute: number) =>
  `${String(hour).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`;

interface BlockedInterval {
  id: number;
  blocked_date: string;
  reason: string | null;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminSettingsScreen: React.FC = () => {
  const insets  = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const { t } = useSimpleTranslation();

  const [notifOrders,  setNotifOrders]  = useState(true);
  const [notifChat,    setNotifChat]    = useState(true);
  const [notifReports, setNotifReports] = useState(false);
  const [darkMode,     setDarkMode]     = useState(true);

  const [openingTime, setOpeningTime] = useState('07:30');
  const [closingTime, setClosingTime] = useState('19:00');
  const [maxTeams, setMaxTeams] = useState('3');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [blocked, setBlocked] = useState<BlockedInterval[]>([]);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  const loadBusinessSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const [settingsRes, blockedRes] = await Promise.all([
        supabase.from('business_settings').select('opening_hour, opening_minute, closing_hour, closing_minute, max_parallel_teams').eq('id', 1).single(),
        supabase.from('blocked_intervals').select('id, blocked_date, reason').order('blocked_date', { ascending: false }).limit(20),
      ]);
      if (!settingsRes.error && settingsRes.data) {
        setOpeningTime(formatTimeInput(settingsRes.data.opening_hour ?? 7, settingsRes.data.opening_minute ?? 30));
        setClosingTime(formatTimeInput(settingsRes.data.closing_hour ?? 19, settingsRes.data.closing_minute ?? 0));
        setMaxTeams(String(settingsRes.data.max_parallel_teams));
      }
      if (!blockedRes.error) setBlocked(blockedRes.data ?? []);
    } catch (e) {
      console.error('Settings load error:', e);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => { loadBusinessSettings(); }, [loadBusinessSettings]);

  const saveBusinessSettings = async () => {
    const open = parseTimeInput(openingTime);
    const close = parseTimeInput(closingTime);
    const max = parseInt(maxTeams, 10);
    if (!open) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.invalidOpeningTime', 'Opening time must be HH:MM (e.g. 07:30)'));
      return;
    }
    if (!close) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.invalidClosingTime', 'Closing time must be HH:MM (e.g. 19:00)'));
      return;
    }
    const openTotal = open.hour * 60 + open.minute;
    const closeTotal = close.hour * 60 + close.minute;
    if (closeTotal <= openTotal) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.invalidClosingHour', 'Closing time must be after opening'));
      return;
    }
    if (isNaN(max) || max < 1 || max > 20) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.invalidMaxTeams', 'Max parallel teams must be 1–20'));
      return;
    }
    setSettingsSaving(true);
    const { error } = await supabase
      .from('business_settings')
      .update({
        opening_hour: open.hour,
        opening_minute: open.minute,
        closing_hour: close.hour,
        closing_minute: close.minute,
        max_parallel_teams: max,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSettingsSaving(false);
    if (error) {
      Alert.alert(t('common.error', 'Error'), error.message);
    } else {
      Alert.alert(t('common.success', 'Success'), t('ui.admin.settingsSaved', 'Business settings saved'));
    }
  };

  const addBlockedDay = async () => {
    const iso = newBlockDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.invalidBlockDate', 'Use date format YYYY-MM-DD'));
      return;
    }
    const { error } = await supabase.from('blocked_intervals').insert({
      blocked_date: iso,
      reason: newBlockReason.trim() || null,
    });
    if (error) {
      Alert.alert(t('common.error', 'Error'), error.message);
      return;
    }
    setNewBlockDate('');
    setNewBlockReason('');
    loadBusinessSettings();
  };

  const removeBlockedDay = async (id: number) => {
    const { error } = await supabase.from('blocked_intervals').delete().eq('id', id);
    if (error) Alert.alert(t('common.error', 'Error'), error.message);
    else loadBusinessSettings();
  };

  const formatTimeLabel = (time: string) => {
    const parsed = parseTimeInput(time);
    if (!parsed) return time;
    const { hour, minute } = parsed;
    const period = hour >= 12 ? 'PM' : 'AM';
    const dh = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return minute === 0 ? `${dh}:00 ${period}` : `${dh}:${String(minute).padStart(2, '0')} ${period}`;
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? t('ui.admin', 'Admin');
  const adminInit = (profile?.full_name ?? 'A')[0].toUpperCase();

  const handleSignOut = () => {
    Alert.alert(t('ui.admin.signOut', 'Sign Out'), t('ui.admin.signOutConfirm', 'Are you sure you want to sign out?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      { text: t('ui.admin.signOut', 'Sign Out'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>{t('ui.admin.tabs.settings', 'Settings')}</Text>
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
            <Text style={s.profileName}>{profile?.full_name ?? t('ui.adminUser', 'Admin User')}</Text>
            <View style={s.adminBadge}>
              <Text style={s.adminBadgeText}>{t('ui.admin', 'Admin')}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.editBtn}>
            <Ionicons name="create-outline" size={18} color="#38BDF8" />
          </TouchableOpacity>
        </View>

        {/* ── Notifications ── */}
        <SectionHeader title={t('ui.admin.settingsSections.notifications', 'Notifications')} />
        <View style={s.section}>
          <SettingRow icon="notifications-outline" label={t('ui.admin.settingsNewOrders', 'New Orders')}      sublabel={t('ui.admin.settingsNewOrdersSub', 'Notify when a new order arrives')}         isSwitch switchValue={notifOrders}  onSwitchChange={setNotifOrders}  />
          <SettingRow icon="chatbubble-outline"     label={t('ui.admin.settingsCustomerChat', 'Customer Chat')}   sublabel={t('ui.admin.settingsCustomerChatSub', 'Notify on new customer messages')}          isSwitch switchValue={notifChat}    onSwitchChange={setNotifChat}    />
          <SettingRow icon="bar-chart-outline"      label={t('ui.admin.settingsDailyReports', 'Daily Reports')}   sublabel={t('ui.admin.settingsDailyReportsSub', 'Receive daily summary notifications')}      isSwitch switchValue={notifReports} onSwitchChange={setNotifReports} />
        </View>

        {/* ── Business ── */}
        <SectionHeader title={t('ui.admin.settingsSections.business', 'Business')} />
        <View style={s.section}>
          {settingsLoading ? (
            <ActivityIndicator color="#38BDF8" style={{ margin: 20 }} />
          ) : (
            <>
              <View style={s.hoursRow}>
                <TimeField label={t('ui.admin.openingHour', 'Open')} value={openingTime} onChange={setOpeningTime} />
                <TimeField label={t('ui.admin.closingHour', 'Close')} value={closingTime} onChange={setClosingTime} />
                <View style={s.hourField}>
                  <Text style={s.hourLabel}>{t('ui.admin.maxParallelTeams', 'Capacity')}</Text>
                  <TextInput
                    style={s.hourInput}
                    value={maxTeams}
                    onChangeText={setMaxTeams}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholderTextColor="#5A6A7A"
                  />
                  <Text style={s.hourHint}>1–20</Text>
                </View>
              </View>
              <Text style={s.hoursSummary}>
                {t('ui.admin.hoursSummary', '{{open}} – {{close}}, up to {{teams}} parallel bookings', {
                  values: {
                    open: formatTimeLabel(openingTime),
                    close: formatTimeLabel(closingTime),
                    teams: maxTeams,
                  },
                })}
              </Text>
              <TouchableOpacity style={s.saveBtn} onPress={saveBusinessSettings} disabled={settingsSaving}>
                {settingsSaving
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={s.saveBtnText}>{t('ui.saveChanges', 'Save Changes')}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        <SectionHeader title={t('ui.admin.blockedDays', 'Blocked Days')} />
        <View style={s.section}>
          <View style={s.blockForm}>
            <TextInput
              style={s.blockInput}
              placeholder={t('ui.admin.blockDatePlaceholder', 'YYYY-MM-DD')}
              placeholderTextColor="#5A6A7A"
              value={newBlockDate}
              onChangeText={setNewBlockDate}
            />
            <TextInput
              style={[s.blockInput, { flex: 1 }]}
              placeholder={t('ui.admin.blockReasonPlaceholder', 'Reason (optional)')}
              placeholderTextColor="#5A6A7A"
              value={newBlockReason}
              onChangeText={setNewBlockReason}
            />
            <TouchableOpacity style={s.addBlockBtn} onPress={addBlockedDay}>
              <Ionicons name="add" size={22} color="#38BDF8" />
            </TouchableOpacity>
          </View>
          {blocked.length === 0 ? (
            <Text style={s.noBlocked}>{t('ui.admin.noBlockedDays', 'No blocked days')}</Text>
          ) : (
            blocked.map(row => (
              <View key={row.id} style={s.blockRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.blockDate}>{row.blocked_date}</Text>
                  {row.reason ? <Text style={s.blockReason}>{row.reason}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => removeBlockedDay(row.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={s.section}>
          <SettingRow icon="cash-outline"        label={t('ui.admin.settingsPricingRules', 'Pricing Rules')}   sublabel={t('ui.admin.settingsPricingRulesSub', 'View and edit service pricing')} onPress={() => Alert.alert(t('ui.comingSoon', 'Coming Soon'), t('ui.featureComingSoon', 'Pricing rules coming soon!', { values: { feature: t('ui.admin.settingsPricingRules', 'Pricing Rules') } }))} />
          <SettingRow icon="location-outline"    label={t('ui.admin.settingsServiceArea', 'Service Area')}    sublabel="Dubai, UAE" onPress={() => Alert.alert(t('ui.comingSoon', 'Coming Soon'), t('ui.featureComingSoon', 'Service area management coming soon!', { values: { feature: t('ui.admin.settingsServiceArea', 'Service Area') } }))} />
        </View>

        {/* ── Appearance ── */}
        <SectionHeader title={t('ui.admin.settingsSections.appearance', 'Appearance')} />
        <View style={s.section}>
          <SettingRow icon="moon-outline" label={t('ui.admin.settingsDarkMode', 'Dark Mode')} isSwitch switchValue={darkMode} onSwitchChange={setDarkMode} />
        </View>

        {/* ── Support ── */}
        <SectionHeader title={t('ui.admin.settingsSections.support', 'Support')} />
        <View style={s.section}>
          <SettingRow icon="help-circle-outline"    label={t('profile.help', 'Help & FAQ')}        onPress={() => Alert.alert(t('ui.comingSoon', 'Coming Soon'))} />
          <SettingRow icon="document-text-outline"  label={t('ui.privacy.termsOfService', 'Terms of Service')}  onPress={() => Alert.alert(t('ui.comingSoon', 'Coming Soon'))} />
          <SettingRow icon="shield-checkmark-outline" label={t('ui.privacy.privacyPolicy', 'Privacy Policy')}  onPress={() => Alert.alert(t('ui.comingSoon', 'Coming Soon'))} />
        </View>

        {/* ── App Info ── */}
        <SectionHeader title={t('ui.admin.settingsSections.app', 'App')} />
        <View style={s.section}>
          <SettingRow icon="information-circle-outline" label={t('ui.admin.settingsVersion', 'Version')}  value="1.0.0" />
          <SettingRow icon="build-outline"               label={t('ui.admin.settingsBuild', 'Build')}   value="2026.3.1" />
        </View>

        {/* ── Sign Out ── */}
        <View style={[s.section, { marginTop: 8 }]}>
          <SettingRow icon="log-out-outline" label={t('ui.admin.signOut', 'Sign Out')} onPress={handleSignOut} danger />
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

  hoursRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 14, gap: 8 },
  hourField:   { flex: 1, alignItems: 'center' },
  hourLabel:   { color: '#7A8A9A', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  hourInput:   {
    width: '100%', textAlign: 'center', color: '#E8EDF5', fontSize: 20, fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  hourHint:    { color: '#5A6A7A', fontSize: 10, marginTop: 4 },
  hoursSummary:{ color: '#8899AA', fontSize: 12, textAlign: 'center', paddingHorizontal: 16, paddingTop: 10 },
  saveBtn:     {
    margin: 14, marginTop: 12, backgroundColor: '#38BDF8', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },

  blockForm:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  blockInput:  {
    width: 110, color: '#E8EDF5', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  addBlockBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(56,189,248,0.12)', alignItems: 'center', justifyContent: 'center' },
  noBlocked:   { color: '#5A6A7A', fontSize: 13, textAlign: 'center', padding: 16 },
  blockRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  blockDate:   { color: '#E8EDF5', fontSize: 14, fontWeight: '700' },
  blockReason: { color: '#7A8A9A', fontSize: 12, marginTop: 2 },
});
