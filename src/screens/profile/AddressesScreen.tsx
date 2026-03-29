import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Address {
  id: number;
  label: string;
  street: string;
  city: string;
  apartment: string | null;
  building_name: string | null;
  notes: string | null;
  is_default: boolean;
  formatted_address: string | null;
  emirate: string | null;
  lat: number | null;
  lng: number | null;
}

const LABEL_ICONS: Record<string, string> = {
  Home: 'home',
  Work: 'briefcase',
  Parents: 'heart',
  Other: 'add-circle',
};

const AddressesScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading]     = useState(true);
  const [menuAddr, setMenuAddr]   = useState<Address | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('id, label, street, city, apartment, building_name, notes, is_default, formatted_address, emirate, lat, lng')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (!error && data) setAddresses(data);
    } catch (e) {
      console.error('Fetch addresses:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Refresh whenever the screen comes into focus (e.g. after AddAddressScreen)
  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [fetchAddresses])
  );

  const handleSetDefault = async (addr: Address) => {
    if (!user?.id) return;
    setMenuAddr(null);
    try {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      await supabase.from('addresses').update({ is_default: true }).eq('id', addr.id);
      fetchAddresses();
    } catch (e) { console.error(e); }
  };

  const handleDelete = (addr: Address) => {
    setMenuAddr(null);
    const title = addr.building_name || addr.street || addr.label;
    Alert.alert(
      'Delete Address',
      `Delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('addresses').delete().eq('id', addr.id);
            fetchAddresses();
          },
        },
      ]
    );
  };

  const displaySubtitle = (addr: Address) => {
    const parts = [addr.building_name, addr.street || addr.formatted_address, addr.emirate || addr.city]
      .filter(Boolean);
    return parts.join(', ');
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#070B18', '#0D1526', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Addresses</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Add new button → navigates to AddAddressScreen */}
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('AddAddress')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#0891B2', '#22D3EE']} style={s.addBtnInner}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={s.addBtnText}>Add New Address</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Address list */}
        {loading ? (
          <ActivityIndicator color="#22D3EE" style={{ marginTop: 40 }} />
        ) : addresses.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="location-outline" size={48} color="#334155" />
            </View>
            <Text style={s.emptyText}>No addresses saved yet</Text>
            <Text style={s.emptyHint}>Tap "Add New Address" to add one</Text>
          </View>
        ) : (
          addresses.map(addr => (
            <View key={addr.id} style={[s.card, addr.is_default && s.cardDefault]}>
              {addr.is_default && (
                <LinearGradient
                  colors={['rgba(8,145,178,0.15)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
              )}

              {/* Label icon badge */}
              <View style={s.cardIconBadge}>
                <Ionicons
                  name={(LABEL_ICONS[addr.label ?? 'Home'] ?? 'location') as any}
                  size={18}
                  color={addr.is_default ? '#22D3EE' : '#64748B'}
                />
              </View>

              <View style={s.cardMeta}>
                <View style={s.cardTitleRow}>
                  <Text style={s.cardTitle}>{addr.label || 'Home'}</Text>
                  {addr.is_default && (
                    <View style={s.defaultBadge}>
                      <Text style={s.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={s.cardAddress} numberOfLines={2}>{displaySubtitle(addr)}</Text>
              </View>

              <TouchableOpacity style={s.moreBtn} onPress={() => setMenuAddr(addr)} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Context menu modal */}
      <Modal
        visible={!!menuAddr}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAddr(null)}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMenuAddr(null)}>
          <View style={s.menu}>
            <Text style={s.menuTitle} numberOfLines={1}>
              {menuAddr?.label || menuAddr?.building_name || menuAddr?.street || 'Address'}
            </Text>

            {/* Edit */}
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                if (!menuAddr) return;
                setMenuAddr(null);
                navigation.navigate('AddAddress', {
                  editAddress: {
                    id: menuAddr.id,
                    label: menuAddr.label,
                    apartment: menuAddr.apartment,
                    building_name: menuAddr.building_name,
                    formatted_address: menuAddr.formatted_address,
                    notes: menuAddr.notes,
                    lat: menuAddr.lat,
                    lng: menuAddr.lng,
                  },
                });
              }}
            >
              <Ionicons name="create-outline" size={18} color="#22D3EE" />
              <Text style={[s.menuItemText, { color: '#22D3EE' }]}>Edit</Text>
            </TouchableOpacity>

            {/* Set as Default (only shown when not already default) */}
            {!menuAddr?.is_default && (
              <>
                <View style={s.menuDivider} />
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={() => menuAddr && handleSetDefault(menuAddr)}
                >
                  <Ionicons name="star-outline" size={18} color="#94A3B8" />
                  <Text style={[s.menuItemText, { color: '#94A3B8' }]}>Set as Default</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={s.menuDivider} />

            {/* Delete */}
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => menuAddr && handleDelete(menuAddr)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[s.menuItemText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F1F5F9' },

  content: { padding: 18 },

  addBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  addBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    gap: 12, overflow: 'hidden',
  },
  cardDefault: { borderColor: 'rgba(34,211,238,0.35)' },
  cardIconBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', flexShrink: 1 },
  defaultBadge: {
    backgroundColor: 'rgba(34,211,238,0.18)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.4)',
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '700', color: '#22D3EE' },
  cardAddress: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },
  moreBtn: { padding: 4 },

  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  emptyHint: { fontSize: 13, color: '#334155' },

  // Context menu
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menu: {
    backgroundColor: '#0D1526', borderRadius: 18,
    margin: 16, padding: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  menuTitle: { fontSize: 13, color: '#64748B', paddingHorizontal: 16, paddingVertical: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 16 },
});

export default AddressesScreen;
