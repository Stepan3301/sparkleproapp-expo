import React, { useState, useMemo } from 'react';
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
import { useSimpleTranslation } from '../../utils/i18n';

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
  const { t } = useSimpleTranslation();

  const [twoFa, setTwoFa]         = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [delLoading, setDelLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPw || newPw !== confirmPw) {
      Alert.alert(t('common.error'), t('ui.privacy.passwordMismatch')); return;
    }
    if (newPw.length < 8) {
      Alert.alert(t('common.error'), t('ui.privacy.passwordTooShort')); return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      Alert.alert(t('common.success'), t('ui.privacy.passwordUpdated'));
      setShowPwModal(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('ui.privacy.passwordUpdateFailed'));
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('ui.privacy.deleteAccount'),
      t('ui.privacy.deleteAccountWarning'),
      [
        { text: t('navigation.cancel'), style: 'cancel' },
        {
          text: t('ui.privacy.deleteAccount'), style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('common.confirm'),
              t('ui.privacy.typeDelete'),
              [
                { text: t('navigation.cancel'), style: 'cancel' },
                {
                  text: t('common.confirm'),
                  style: 'destructive',
                  onPress: async () => {
                    setDelLoading(true);
                    try {
                      await signOut();
                    } catch (e) {
                      setDelLoading(false);
                      Alert.alert(t('common.error'), t('ui.privacy.deleteFailed'));
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

  interface Section { id: string; items: SectionItem[] }
  const sections: Section[] = useMemo(() => [
    {
      id: 'security',
      items: [
        {
          id: 'change_pw', icon: 'lock-closed', iconGradient: ['#8B5CF6', '#7C3AED'],
          label: t('ui.privacy.changePassword'), sub: t('ui.privacy.changePasswordDesc'), type: 'nav',
          onPress: () => setShowPwModal(true),
        },
        {
          id: '2fa', icon: 'shield-checkmark', iconGradient: ['#2563EB', '#3B82F6'],
          label: t('ui.privacy.twoFactor'), sub: t('ui.privacy.twoFactorDesc'), type: 'toggle',
          value: twoFa,
          onToggle: (v) => {
            setTwoFa(v);
            if (v) Alert.alert(t('ui.privacy.twoFactor'), t('ui.privacy.twoFactorSoon'));
          },
        },
        {
          id: 'sessions', icon: 'phone-portrait-outline', iconGradient: ['#0891B2', '#22D3EE'],
          label: t('ui.privacy.activeSessions'), sub: t('ui.privacy.activeSessionsDesc'), type: 'nav',
          onPress: () => Alert.alert(t('ui.privacy.activeSessions'), t('ui.privacy.sessionsSoon')),
        },
      ],
    },
    {
      id: 'privacy',
      items: [
        {
          id: 'data', icon: 'document-text-outline', iconGradient: ['#64748B', '#475569'],
          label: t('ui.privacy.dataPrivacy'), sub: t('ui.privacy.downloadData'), type: 'nav',
          onPress: () => Alert.alert(t('ui.privacy.downloadData'), t('ui.privacy.exportSoon')),
        },
        {
          id: 'delete', icon: 'trash', iconGradient: ['#EF4444', '#DC2626'],
          label: t('ui.privacy.deleteAccount'), sub: t('ui.privacy.deleteAccountDesc'), type: 'danger',
          onPress: handleDeleteAccount,
        },
      ],
    },
    {
      id: 'legal',
      items: [
        {
          id: 'privacy', icon: 'link-outline', iconGradient: ['#334155', '#475569'],
          label: t('ui.privacy.privacyPolicy'), sub: '', type: 'nav',
          onPress: () => Linking.openURL('https://sparkleuae.com/privacy'),
        },
        {
          id: 'terms', icon: 'link-outline', iconGradient: ['#334155', '#475569'],
          label: t('ui.privacy.termsOfService'), sub: '', type: 'nav',
          onPress: () => Linking.openURL('https://sparkleuae.com/terms'),
        },
      ],
    },
  ], [t, twoFa]);

  const pwFields = useMemo(() => [
    { id: 'new', label: t('ui.privacy.newPassword'), val: newPw, set: setNewPw, placeholder: t('ui.privacy.passwordMin') },
    { id: 'confirm', label: t('ui.privacy.confirmPassword'), val: confirmPw, set: setConfirmPw, placeholder: t('ui.privacy.repeatPassword') },
  ], [t, newPw, confirmPw]);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#070B18', '#0D1526', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('profile.privacy')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.id} style={s.group}>
            <Text style={s.groupLabel}>{t(`ui.privacy.${section.id === 'privacy' ? 'privacySection' : section.id}`)}</Text>
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
              <Text style={s.sheetTitle}>{t('ui.privacy.changePassword')}</Text>

              {pwFields.map(f => (
                <View key={f.id} style={s.fieldWrap}>
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
                  <Text style={s.sheetCancelText}>{t('navigation.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetSave} onPress={handleChangePassword} activeOpacity={0.85} disabled={pwLoading}>
                  <LinearGradient colors={['#7C3AED', '#8B5CF6']} style={s.sheetSaveInner}>
                    {pwLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.sheetSaveText}>{t('ui.privacy.update')}</Text>}
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
