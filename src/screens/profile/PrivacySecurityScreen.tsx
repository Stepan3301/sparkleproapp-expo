import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Linking, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface SectionItem {
  id: string;
  icon: IoniconName;
  iconGradient: [string, string];
  label: string;
  sub: string;
  type: 'nav' | 'toggle' | 'danger';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (v: boolean) => void;
}

const PrivacySecurityScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [twoFa, setTwoFa]         = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [delLoading, setDelLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPw || newPw !== confirmPw) {
      Alert.alert('Error', 'New passwords do not match.'); return;
    }
    if (newPw.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.'); return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      Alert.alert('Success', 'Password updated successfully.');
      setShowPwModal(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account', style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Type "DELETE" to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  style: 'destructive',
                  onPress: async () => {
                    setDelLoading(true);
                    try {
                      // Sign out — full account deletion would require a Supabase Edge Function
                      await signOut();
                      navigation.getParent()?.navigate('Auth');
                    } catch (e) {
                      setDelLoading(false);
                      Alert.alert('Error', 'Could not delete account. Please contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  interface Section { title: string; items: SectionItem[] }
  const sections: Section[] = [
    {
      title: 'SECURITY',
      items: [
        {
          id: 'change_pw', icon: 'lock-closed', iconGradient: ['#8B5CF6', '#7C3AED'],
          label: 'Change Password', sub: 'Update your password', type: 'nav',
          onPress: () => setShowPwModal(true),
        },
        {
          id: '2fa', icon: 'shield-checkmark', iconGradient: ['#2563EB', '#3B82F6'],
          label: 'Two-Factor Authentication', sub: 'Add extra security', type: 'toggle',
          value: twoFa,
          onToggle: (v) => {
            setTwoFa(v);
            if (v) Alert.alert('2FA', '2FA setup will be available soon.');
          },
        },
        {
          id: 'sessions', icon: 'phone-portrait-outline', iconGradient: ['#0891B2', '#22D3EE'],
          label: 'Active Sessions', sub: 'Manage logged-in devices', type: 'nav',
          onPress: () => Alert.alert('Active Sessions', 'Session management coming soon.'),
        },
      ],
    },
    {
      title: 'PRIVACY',
      items: [
        {
          id: 'data', icon: 'document-text-outline', iconGradient: ['#64748B', '#475569'],
          label: 'Data & Privacy', sub: 'Download your data', type: 'nav',
          onPress: () => Alert.alert('Data Export', 'Data export will be available soon. Contact support@sparkleuae.com to request your data.'),
        },
        {
          id: 'delete', icon: 'trash', iconGradient: ['#EF4444', '#DC2626'],
          label: 'Delete Account', sub: 'Permanently delete account', type: 'danger',
          onPress: handleDeleteAccount,
        },
      ],
    },
    {
      title: 'LEGAL',
      items: [
        {
          id: 'privacy', icon: 'link-outline', iconGradient: ['#334155', '#475569'],
          label: 'Privacy Policy', sub: '', type: 'nav',
          onPress: () => Linking.openURL('https://sparkleuae.com/privacy'),
        },
        {
          id: 'terms', icon: 'link-outline', iconGradient: ['#334155', '#475569'],
          label: 'Terms of Service', sub: '', type: 'nav',
          onPress: () => Linking.openURL('https://sparkleuae.com/terms'),
        },
      ],
    },
  ];

  return (
    <View style={s.root}>
      <LinearGradient colors={['#070B18', '#0D1526', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.title} style={s.group}>
            <Text style={s.groupLabel}>{section.title}</Text>
            <View style={s.card}>
              {section.items.map((item, idx) => {
                const isDanger = item.type === 'danger';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.row, idx < section.items.length - 1 && s.rowBorder, isDanger && s.rowDanger]}
                    onPress={item.onPress}
                    activeOpacity={item.type === 'toggle' ? 1 : 0.75}
                    disabled={item.type === 'toggle'}
                  >
                    <LinearGradient colors={item.iconGradient} style={s.iconWrap}>
                      <Ionicons name={item.icon} size={18} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={s.meta}>
                      <Text style={[s.rowLabel, isDanger && s.rowLabelDanger]}>{item.label}</Text>
                      {!!item.sub && <Text style={s.rowSub}>{item.sub}</Text>}
                    </View>
                    {item.type === 'toggle' ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: 'rgba(255,255,255,0.12)', true: '#0891B2' }}
                        thumbColor={item.value ? '#22D3EE' : '#94A3B8'}
                        ios_backgroundColor="rgba(255,255,255,0.12)"
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={isDanger ? '#EF4444' : '#334155'} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {delLoading && <ActivityIndicator color="#EF4444" style={{ marginTop: 16 }} />}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPwModal} transparent animationType="slide" onRequestClose={() => setShowPwModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Change Password</Text>

              {[
                { label: 'New Password', val: newPw, set: setNewPw, placeholder: 'At least 8 characters' },
                { label: 'Confirm Password', val: confirmPw, set: setConfirmPw, placeholder: 'Repeat new password' },
              ].map(f => (
                <View key={f.label} style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={s.fieldInput}
                    value={f.val}
                    onChangeText={f.set}
                    placeholder={f.placeholder}
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              ))}

              <View style={s.sheetActions}>
                <TouchableOpacity style={s.sheetCancel} onPress={() => setShowPwModal(false)} activeOpacity={0.75}>
                  <Text style={s.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetSave} onPress={handleChangePassword} activeOpacity={0.85} disabled={pwLoading}>
                  <LinearGradient colors={['#7C3AED', '#8B5CF6']} style={s.sheetSaveInner}>
                    {pwLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.sheetSaveText}>Update</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F1F5F9' },

  content: { padding: 18 },
  group: { marginBottom: 24 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, marginBottom: 10 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowDanger: { backgroundColor: 'rgba(239,68,68,0.08)' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#F1F5F9' },
  rowLabelDanger: { color: '#F87171' },
  rowSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // Modal sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0D1526', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9', marginBottom: 20 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 6 },
  fieldInput: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 12, color: '#F1F5F9', fontSize: 14 },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  sheetCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sheetCancelText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  sheetSave: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  sheetSaveInner: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  sheetSaveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

export default PrivacySecurityScreen;
