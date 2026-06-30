import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useSimpleTranslation } from '../../utils/i18n';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface InfoRow {
  id: string;
  label: string;
  icon: IoniconName;
  iconGradient: [string, string];
  value: string;
  placeholder: string;
  editable: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

const PersonalInfoScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { t, i18n } = useSimpleTranslation();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [editMode, setEditMode] = useState(false);
  const languageLabel = i18n.language === 'ru' ? t('ui.russian') : t('ui.english');

  useEffect(() => {
    setFullName(profile?.full_name || user?.user_metadata?.full_name || '');
    setPhone(profile?.phone_number || '');
  }, [profile, user]);

  const getInitials = () => {
    const name = fullName || user?.email || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone_number: phone.trim() })
        .eq('id', user.id);
      if (error) throw error;
      Alert.alert(t('ui.personalInfo.saved'), t('ui.personalInfo.savedMessage'));
      setEditMode(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('ui.personalInfo.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const rows: InfoRow[] = useMemo(() => [
    {
      id: 'name', label: t('personalInfo.fullName'), icon: 'person',
      iconGradient: ['#22D3EE', '#0891B2'], value: fullName,
      placeholder: t('personalInfo.fullNamePlaceholder'), editable: true,
    },
    {
      id: 'email', label: t('personalInfo.email'), icon: 'mail',
      iconGradient: ['#3B82F6', '#1D4ED8'], value: user?.email || '',
      placeholder: t('auth.email'), editable: false,
      keyboardType: 'email-address',
    },
    {
      id: 'phone', label: t('personalInfo.phoneNumber'), icon: 'call',
      iconGradient: ['#10B981', '#059669'], value: phone,
      placeholder: t('personalInfo.phoneNumberPlaceholder'), editable: true,
      keyboardType: 'phone-pad',
    },
    {
      id: 'language', label: t('profile.language'), icon: 'globe',
      iconGradient: ['#5B3FD4', '#7C3AED'], value: languageLabel,
      placeholder: t('profile.language'), editable: false,
    },
  ], [t, fullName, phone, user?.email, languageLabel]);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#070B18', '#0D1526', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('profile.personalInfo')}</Text>
        <TouchableOpacity onPress={() => editMode ? handleSave() : setEditMode(true)} activeOpacity={0.75} style={s.editBtn}>
          {saving
            ? <ActivityIndicator size="small" color="#22D3EE" />
            : <Text style={s.editBtnText}>{editMode ? t('navigation.save') : t('navigation.edit')}</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={s.avatarOuter}>
              <LinearGradient colors={['#0891B2', '#06B6D4']} style={s.avatarGradient}>
                <Text style={s.avatarInitials}>{getInitials()}</Text>
              </LinearGradient>
              <View style={s.cameraBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </View>
            <Text style={s.avatarName}>{fullName || t('ui.personalInfo.yourName')}</Text>
          </View>

          {/* Info rows */}
          <View style={s.card}>
            {rows.map((row, idx) => (
              <View key={row.id} style={[s.row, idx < rows.length - 1 && s.rowBorder]}>
                <LinearGradient colors={row.iconGradient} style={s.rowIcon}>
                  <Ionicons name={row.icon} size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={s.rowMeta}>
                  <Text style={s.rowLabel}>{row.label}</Text>
                  {editMode && row.editable ? (
                    <TextInput
                      style={s.rowInput}
                      value={row.id === 'name' ? fullName : row.id === 'phone' ? phone : row.value}
                      onChangeText={row.id === 'name' ? setFullName : row.id === 'phone' ? setPhone : undefined}
                      placeholder={row.placeholder}
                      placeholderTextColor="#475569"
                      keyboardType={row.keyboardType || 'default'}
                      autoCapitalize={row.keyboardType === 'email-address' ? 'none' : 'words'}
                    />
                  ) : (
                    <Text style={[s.rowValue, !row.value && s.rowValueEmpty]}>
                      {row.value || t('ui.notSet')}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#334155" />
              </View>
            ))}
          </View>

          {/* Save button (visible when in edit mode) */}
          {editMode && (
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
              <LinearGradient colors={['#0891B2', '#22D3EE']} style={s.saveBtnInner}>
                {saving
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={s.saveBtnText}>{t('ui.saveChanges')}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  editBtn: { minWidth: 36, alignItems: 'flex-end' },
  editBtnText: { fontSize: 15, fontWeight: '700', color: '#22D3EE' },

  content: { padding: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  avatarOuter: { position: 'relative', marginBottom: 12 },
  avatarGradient: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22D3EE', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  avatarInitials: { fontSize: 34, fontWeight: '800', color: '#FFFFFF' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#0891B2',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#070B18',
  },
  avatarName: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 24, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowMeta: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 3 },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#F1F5F9' },
  rowValueEmpty: { color: '#475569', fontStyle: 'italic' },
  rowInput: {
    fontSize: 15, fontWeight: '600', color: '#F1F5F9',
    padding: 0, margin: 0,
  },

  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnInner: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default PersonalInfoScreen;
