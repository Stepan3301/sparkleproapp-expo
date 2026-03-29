import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, StatusBar, ActivityIndicator,
  ScrollView, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const FILTER_TABS = [
  { key: 'all',       label: 'All'       },
  { key: 'available', label: 'Available' },
  { key: 'busy',      label: 'Busy'      },
  { key: 'off',       label: 'Off Today' },
];

// ─── Add Member Modal ─────────────────────────────────────────────────────────

const AddMemberModal = ({ visible, onClose, onAdded }: { visible: boolean; onClose: () => void; onAdded: () => void }) => {
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [specialty, setSpec]    = useState('');
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('cleaners').insert({
      name: name.trim(),
      phone: phone.trim() || null,
      specialty: specialty.trim() || 'General Cleaning',
      is_active: true,
      rating: 4.8,
      reviews_count: 0,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setName(''); setPhone(''); setSpec('');
      onAdded();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Team Member</Text>

          {[
            { label: 'Full Name *', value: name, setter: setName, placeholder: 'e.g. Anna Petrova' },
            { label: 'Phone',       value: phone, setter: setPhone, placeholder: '+971 50 000 0000' },
            { label: 'Specialty',   value: specialty, setter: setSpec, placeholder: 'e.g. Deep Cleaning Specialist' },
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

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size={16} color="#000" /> : <Text style={s.saveBtnText}>Add Member</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Cleaner Card ─────────────────────────────────────────────────────────────

const CleanerCard = ({ item }: { item: any }) => {
  const isAvail = item.is_active;
  const stars   = Math.round(Number(item.rating ?? 4.8));
  const ringColor = isAvail ? '#10B981' : '#F59E0B';

  return (
    <View style={s.cleanerCard}>
      {/* Avatar with ring */}
      <View style={[s.avatarRing, { borderColor: ringColor }]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{item.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: ringColor }]} />
      </View>

      {/* Info */}
      <View style={s.cleanerInfo}>
        <Text style={s.cleanerName}>{item.name}</Text>
        <Text style={s.cleanerSpec}>{item.specialty ?? 'General Cleaning'}</Text>
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
            {isAvail ? 'Available' : 'Busy'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#3A4A5A" style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AdminTeamScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

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
        <Text style={s.title}>Team</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={16} color="#000" />
          <Text style={s.addBtnText}>Add Member</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#5A6A7A" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search team members..."
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
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={[s.statCard, { borderColor: 'rgba(16,185,129,0.25)' }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
          <Text style={[s.statNum, { color: '#10B981' }]}>{availableCount}</Text>
          <Text style={s.statLabel}>Available</Text>
        </View>
        <View style={[s.statCard, { borderColor: 'rgba(245,158,11,0.25)' }]}>
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={[s.statNum, { color: '#F59E0B' }]}>{busyCount}</Text>
          <Text style={s.statLabel}>Busy</Text>
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 8, paddingBottom: 8 }}
        style={{ marginBottom: 8 }}
      >
        {FILTER_TABS.map(tab => {
          const isActive = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterTab, isActive && s.filterTabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[s.filterTabText, isActive && s.filterTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <CleanerCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color="#38BDF8" />
              <Text style={s.emptyText}>No team members found</Text>
            </View>
          }
        />
      )}

      <AddMemberModal visible={showAdd} onClose={() => setShowAdd(false)} onAdded={fetchCleaners} />
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

  filterTab:         { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  filterTabActive:   { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  filterTabText:     { color: '#A0B0C0', fontSize: 13, fontWeight: '600' },
  filterTabTextActive:{ color: '#000', fontWeight: '700' },

  cleanerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1629', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  avatarRing:  { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', position: 'relative', marginRight: 12 },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(56,189,248,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#38BDF8', fontSize: 20, fontWeight: '800' },
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
  modalTitle:   { color: '#E8EDF5', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  inputLabel:   { color: '#7A8A9A', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input:        { backgroundColor: '#161F35', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#E8EDF5', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cancelBtn:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  cancelBtnText:{ color: '#A0B0C0', fontWeight: '700' },
  saveBtn:      { flex: 1, backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:  { color: '#000', fontWeight: '800', fontSize: 15 },
});
