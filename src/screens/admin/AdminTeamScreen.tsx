import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, StatusBar, ActivityIndicator,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import CleanerAvatar from '../../components/admin/CleanerAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';
import { useSimpleTranslation } from '../../utils/i18n';
import { generateCleanerLogin, generateCleanerPassword } from '../../utils/cleanerCredentials';

type TeamNav = NativeStackNavigationProp<RootStackParamList>;

const FILTER_TAB_KEYS = ['all', 'available', 'busy', 'off'] as const;

// ─── Add Member Modal ─────────────────────────────────────────────────────────

const AddMemberModal = ({
  visible, onClose, onAdded, t,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  t: (key: string, fallback?: string, options?: { values?: Record<string, string | number> }) => string;
}) => {
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [specialty, setSpec]          = useState('');
  const [login, setLogin]             = useState('');
  const [loginEdited, setLoginEdited] = useState(false);
  const [password, setPassword]       = useState('');
  const [autoPassword, setAutoPassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving]           = useState(false);

  const resetForm = () => {
    setName('');
    setPhone('');
    setSpec('');
    setLogin('');
    setLoginEdited(false);
    setPassword('');
    setAutoPassword(true);
    setShowPassword(false);
  };

  const refreshLogin = (fullName: string) => {
    if (!fullName.trim()) return;
    setLogin(generateCleanerLogin(fullName));
  };

  const refreshPassword = () => setPassword(generateCleanerPassword());

  const copyPassword = async () => {
    if (!password) return;
    await Clipboard.setStringAsync(password);
    Alert.alert(t('ui.admin.passwordCopied', 'Copied'), t('ui.admin.passwordCopiedHint', 'Password copied to clipboard'));
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
    refreshPassword();
  }, [visible]);

  useEffect(() => {
    if (!loginEdited && name.trim()) refreshLogin(name);
  }, [name, loginEdited]);

  useEffect(() => {
    if (autoPassword) refreshPassword();
  }, [autoPassword]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.nameRequired', 'Name is required'));
      return;
    }
    if (!login.trim()) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.loginRequired', 'Login is required'));
      return;
    }
    const finalPassword = autoPassword ? password : password.trim();
    if (!finalPassword || finalPassword.length < 6) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.passwordMin', 'Password must be at least 6 characters'));
      return;
    }

    setSaving(true);
    let lastError: string | null = null;
    let attemptLogin = login.trim().toLowerCase();

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase.rpc('create_cleaner_with_account', {
        p_name: name.trim(),
        p_phone: phone.trim() || null,
        p_specialty: specialty.trim() || t('ui.admin.generalCleaning', 'General Cleaning'),
        p_login: attemptLogin,
        p_password: finalPassword,
      });

      if (!error && data) {
        setSaving(false);
        Alert.alert(
          t('ui.admin.memberCreatedTitle', 'Team Member Created'),
          t('ui.admin.memberCreatedBody', 'Give these credentials to the cleaner:\n\nLogin: {{login}}\nPassword: {{password}}', {
            values: { login: data.login ?? attemptLogin, password: finalPassword },
          }),
          [{ text: t('common.ok', 'OK'), onPress: () => { resetForm(); onAdded(); onClose(); } }],
        );
        return;
      }

      lastError = error?.message ?? t('ui.admin.createFailed', 'Could not create team member');
      if (lastError.toLowerCase().includes('login already taken')) {
        attemptLogin = generateCleanerLogin(name.trim());
        setLogin(attemptLogin);
        continue;
      }
      break;
    }

    setSaving(false);
    Alert.alert(t('common.error', 'Error'), lastError ?? t('ui.admin.createFailed', 'Could not create team member'));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t('ui.admin.addTeamMember', 'Add Team Member')}</Text>
          <Text style={s.modalSubtitle}>{t('ui.admin.addMemberSubtitle', 'Account login & password are generated automatically')}</Text>

          {[
            { label: t('ui.admin.fullName', 'Full Name *'), value: name, setter: setName, placeholder: t('ui.admin.namePlaceholder', 'e.g. Anna Petrova') },
            { label: t('ui.admin.phone', 'Phone'), value: phone, setter: setPhone, placeholder: '+971 50 000 0000' },
            { label: t('ui.admin.specialty', 'Specialty'), value: specialty, setter: setSpec, placeholder: t('ui.admin.specialtyPlaceholder', 'e.g. Deep Cleaning Specialist') },
          ].map(({ label, value, setter, placeholder }) => (
            <View key={label} style={{ marginBottom: 14 }}>
              <Text style={s.inputLabel}>{label}</Text>
              <TextInput
                style={s.input}
                placeholder={placeholder}
                placeholderTextColor="#5A6A7A"
                value={value}
                onChangeText={setter}
              />
            </View>
          ))}

          <View style={{ marginBottom: 14 }}>
            <Text style={s.inputLabel}>{t('ui.admin.cleanerLogin', 'Login')}</Text>
            <View style={s.inlineRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={login}
                onChangeText={(v) => { setLoginEdited(true); setLogin(v.toLowerCase().replace(/[^a-z0-9]/g, '')); }}
                placeholder="st281"
                placeholderTextColor="#5A6A7A"
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.iconBtn} onPress={() => { setLoginEdited(false); refreshLogin(name); }}>
                <Ionicons name="refresh" size={18} color="#38BDF8" />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldHint}>{t('ui.admin.loginHint', 'First letter of name + first letter of surname + 3 digits')}</Text>
          </View>

          <View style={{ marginBottom: 14 }}>
            <View style={s.inlineRow}>
              <Text style={[s.inputLabel, { flex: 1, marginBottom: 0 }]}>{t('ui.admin.cleanerPassword', 'Password')}</Text>
              <TouchableOpacity onPress={() => setAutoPassword(v => !v)}>
                <Text style={s.toggleLink}>
                  {autoPassword ? t('ui.admin.setManualPassword', 'Set manually') : t('ui.admin.autoGenerate', 'Auto-generate')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={s.inlineRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                editable={!autoPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#5A6A7A"
              />
              <TouchableOpacity style={s.iconBtn} onPress={copyPassword}>
                <Ionicons name="copy-outline" size={18} color="#38BDF8" />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => setShowPassword(v => !v)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#7A8A9A" />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={refreshPassword}>
                <Ionicons name="refresh" size={18} color="#38BDF8" />
              </TouchableOpacity>
            </View>
            <Text style={s.fieldHint}>
              {autoPassword
                ? t('ui.admin.passwordAutoHint', '8 random characters — tap refresh to regenerate')
                : t('ui.admin.passwordManualHint', 'Minimum 6 characters')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size={16} color="#000" /> : <Text style={s.saveBtnText}>{t('ui.admin.addMember', 'Add Member')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Cleaner Card ─────────────────────────────────────────────────────────────

const CleanerCard = ({
  item, t, onPress,
}: {
  item: any;
  t: (key: string, fallback?: string) => string;
  onPress: () => void;
}) => {
  const isAvail = item.is_active;
  const stars   = Math.round(Number(item.rating ?? 4.8));
  const ringColor = isAvail ? '#10B981' : '#F59E0B';

  return (
    <TouchableOpacity style={s.cleanerCard} onPress={onPress} activeOpacity={0.78}>
      <View style={[s.avatarRing, { borderColor: ringColor }]}>
        <CleanerAvatar name={item.name} avatarUrl={item.avatar_url} size={48} />
        <View style={[s.statusDot, { backgroundColor: ringColor }]} />
      </View>

      {/* Info */}
      <View style={s.cleanerInfo}>
        <Text style={s.cleanerName}>{item.name}</Text>
        <Text style={s.cleanerSpec}>{item.specialty ?? t('ui.admin.generalCleaning', 'General Cleaning')}</Text>
        <View style={s.starsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons
              key={i}
              name={i < stars ? 'star' : 'star-outline'}
              size={11}
              color={i < stars ? '#F59E0B' : '#5A6A7A'}
            />
          ))}
          <Text style={s.ratingText}>{Number(item.rating ?? 4.8).toFixed(1)}</Text>
          {item.reviews_count > 0 && (
            <Text style={s.reviewCount}>({item.reviews_count})</Text>
          )}
        </View>
      </View>

      {/* Right side */}
      <View style={s.cleanerRight}>
        <View style={[s.availBadge, { backgroundColor: isAvail ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }]}>
          <Text style={[s.availText, { color: isAvail ? '#10B981' : '#F59E0B' }]}>
            {isAvail ? t('ui.admin.filters.available', 'Available') : t('ui.admin.filters.busy', 'Busy')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#3A4A5A" style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminTeamScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TeamNav>();
  const { t } = useSimpleTranslation();

  const FILTER_TABS = useMemo(
    () =>
      FILTER_TAB_KEYS.map((key) => ({
        key,
        label:
          key === 'all'
            ? t('ui.all', 'All')
            : key === 'off'
              ? t('ui.admin.filters.offToday', 'Off Today')
              : t(`ui.admin.filters.${key}`, key === 'available' ? 'Available' : 'Busy'),
      })),
    [t],
  );

  const [cleaners, setCleaners]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [showAdd, setShowAdd]       = useState(false);

  const fetchCleaners = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('cleaners')
        .select('*')
        .order('name');
      if (data) setCleaners(data);
    } catch (e) {
      console.error('Cleaners fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCleaners(); }, [fetchCleaners]);
  const onRefresh = () => { setRefreshing(true); fetchCleaners(); };

  const totalCount     = cleaners.length;
  const availableCount = cleaners.filter(c => c.is_active).length;
  const busyCount      = cleaners.filter(c => !c.is_active).length;

  const displayed = useMemo(() => {
    let list = cleaners;
    if (filter === 'available') list = list.filter(c => c.is_active);
    if (filter === 'busy')      list = list.filter(c => !c.is_active);
    if (filter === 'off')       list = list.filter(c => !c.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.specialty?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cleaners, filter, search]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>{t('ui.admin.tabs.team', 'Team')}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={16} color="#000" />
          <Text style={s.addBtnText}>{t('ui.admin.addMember', 'Add Member')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#5A6A7A" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder={t('ui.admin.searchTeam', 'Search team members...')}
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

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { borderColor: 'rgba(56,189,248,0.25)' }]}>
          <Ionicons name="people-outline" size={18} color="#38BDF8" />
          <Text style={[s.statNum, { color: '#E8EDF5' }]}>{totalCount}</Text>
          <Text style={s.statLabel}>{t('ui.admin.stats.total', 'Total')}</Text>
        </View>
        <View style={[s.statCard, { borderColor: 'rgba(16,185,129,0.25)' }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
          <Text style={[s.statNum, { color: '#10B981' }]}>{availableCount}</Text>
          <Text style={s.statLabel}>{t('ui.admin.stats.available', 'Available')}</Text>
        </View>
        <View style={[s.statCard, { borderColor: 'rgba(245,158,11,0.25)' }]}>
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={[s.statNum, { color: '#F59E0B' }]}>{busyCount}</Text>
          <Text style={s.statLabel}>{t('ui.admin.stats.busy', 'Busy')}</Text>
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={s.filterRow}>
        {FILTER_TABS.map(tab => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterTab, isActive && s.filterTabActive]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterTabText, isActive && s.filterTabTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CleanerCard
              item={item}
              t={t}
              onPress={() => navigation.navigate('AdminTeamMember', { cleanerId: item.id })}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color="#38BDF8" />
              <Text style={s.emptyText}>{t('ui.admin.noTeam', 'No team members found')}</Text>
            </View>
          }
        />
      )}

      <AddMemberModal visible={showAdd} onClose={() => setShowAdd(false)} onAdded={fetchCleaners} t={t} />
    </View>
  );
};

export default AdminTeamScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#070B18' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  title:  { color: '#E8EDF5', fontSize: 22, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#38BDF8', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, gap: 6 },
  addBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginBottom: 12, backgroundColor: '#0F1629', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  searchInput: { flex: 1, color: '#E8EDF5', fontSize: 14 },

  statsRow:  { flexDirection: 'row', paddingHorizontal: 18, gap: 10, marginBottom: 14 },
  statCard:  { flex: 1, backgroundColor: '#0F1629', borderRadius: 14, padding: 12, alignItems: 'flex-start', borderWidth: 1 },
  statNum:   { fontSize: 22, fontWeight: '800', marginTop: 6, marginBottom: 2 },
  statLabel: { color: '#7A8A9A', fontSize: 11, fontWeight: '500' },

  filterRow:         { flexDirection: 'row', paddingHorizontal: 18, gap: 6, marginBottom: 12 },
  filterTab:         { flex: 1, paddingHorizontal: 6, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', minHeight: 38 },
  filterTabActive:   { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  filterTabText:     { color: '#A0B0C0', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  filterTabTextActive:{ color: '#000', fontWeight: '700' },

  cleanerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1629', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  avatarRing:  { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', position: 'relative', marginRight: 12 },
  statusDot:   { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#0F1629' },
  cleanerInfo: { flex: 1 },
  cleanerName: { color: '#E8EDF5', fontSize: 15, fontWeight: '700' },
  cleanerSpec: { color: '#7A8A9A', fontSize: 12, marginTop: 2 },
  starsRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  ratingText:  { color: '#F59E0B', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  reviewCount: { color: '#5A6A7A', fontSize: 11, marginLeft: 2 },
  cleanerRight:{ alignItems: 'flex-end' },
  availBadge:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  availText:   { fontSize: 11, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#7A8A9A', fontSize: 15, marginTop: 12 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet:   { backgroundColor: '#0D1526', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { color: '#E8EDF5', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  modalSubtitle:{ color: '#7A8A9A', fontSize: 12, marginBottom: 16, lineHeight: 18 },
  inputLabel:   { color: '#7A8A9A', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  fieldHint:    { color: '#5A6A7A', fontSize: 11, marginTop: 6, lineHeight: 16 },
  inlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:      { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  toggleLink:   { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  input:        { backgroundColor: '#161F35', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#E8EDF5', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cancelBtn:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  cancelBtnText:{ color: '#A0B0C0', fontWeight: '700' },
  saveBtn:      { flex: 1, backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:  { color: '#000', fontWeight: '800', fontSize: 15 },
});
