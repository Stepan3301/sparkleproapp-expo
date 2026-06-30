import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, StatusBar, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';
import { useSimpleTranslation } from '../../utils/i18n';
import CleanerAvatar from '../../components/admin/CleanerAvatar';
import { pickCleanerImage, uploadCleanerAvatar, deleteCleanerAvatarFiles } from '../../utils/cleanerAvatar';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AdminTeamMember'>;

const AdminTeamMemberScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { cleanerId } = route.params;
  const { t } = useSimpleTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [rating, setRating] = useState('4.8');
  const [isActive, setIsActive] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);
  const [cleanerLogin, setCleanerLogin] = useState<string | null>(null);

  const fetchCleaner = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cleaners').select('*').eq('id', cleanerId).single();
    if (error || !data) {
      Alert.alert(t('common.error', 'Error'), error?.message ?? t('ui.admin.memberNotFound', 'Team member not found'));
      navigation.goBack();
      return;
    }
    setName(data.name ?? '');
    setPhone(data.phone ?? '');
    setSpecialty(data.specialty ?? '');
    setRating(String(data.rating ?? 4.8));
    setIsActive(!!data.is_active);
    setAvatarUrl(data.avatar_url ?? null);
    setLinkedUserId(data.user_id ?? null);
    setCleanerLogin(data.login ?? null);
    setLoading(false);
  }, [cleanerId, navigation, t]);

  useEffect(() => { fetchCleaner(); }, [fetchCleaner]);

  const handlePickPhoto = async () => {
    try {
      const uri = await pickCleanerImage();
      if (!uri) return;
      setUploading(true);
      const publicUrl = await uploadCleanerAvatar(cleanerId, uri);
      const { error } = await supabase.from('cleaners').update({ avatar_url: publicUrl }).eq('id', cleanerId);
      if (error) throw error;
      setAvatarUrl(publicUrl);
      Alert.alert(t('common.success', 'Success'), t('ui.admin.photoUpdated', 'Photo updated'));
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e.message ?? t('ui.admin.photoUploadFailed', 'Could not upload photo'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('ui.admin.deleteMemberTitle', 'Delete Team Member'),
      t('ui.admin.deleteMemberConfirm', 'Are you sure you want to delete {{name}}? This action cannot be undone.', { values: { name: name.trim() || t('ui.admin.thisMember', 'this member') } }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteCleanerAvatarFiles(cleanerId);
              const { error } = await supabase.from('cleaners').delete().eq('id', cleanerId);
              if (error) throw error;
              Alert.alert(
                t('common.success', 'Success'),
                t('ui.admin.memberDeleted', 'Team member deleted'),
                [{ text: t('common.ok', 'OK'), onPress: () => navigation.goBack() }],
              );
            } catch (e: any) {
              Alert.alert(t('common.error', 'Error'), e.message ?? t('ui.admin.deleteFailed', 'Could not delete team member'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.nameRequired', 'Name is required'));
      return;
    }
    const ratingNum = parseFloat(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      Alert.alert(t('common.error', 'Error'), t('ui.admin.invalidRating', 'Rating must be 0–5'));
      return;
    }
    setSaving(true);
    if (linkEmail.trim() && !cleanerLogin) {
      const { error: linkError } = await supabase.rpc('link_cleaner_to_user', {
        p_cleaner_id: cleanerId,
        p_email: linkEmail.trim(),
      });
      if (linkError) {
        setSaving(false);
        Alert.alert(t('common.error', 'Error'), linkError.message);
        return;
      }
    }
    const { error } = await supabase
      .from('cleaners')
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        specialty: specialty.trim() || t('ui.admin.generalCleaning', 'General Cleaning'),
        rating: ratingNum,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cleanerId);
    setSaving(false);
    if (error) {
      Alert.alert(t('common.error', 'Error'), error.message);
    } else {
      Alert.alert(t('common.success', 'Success'), t('ui.admin.memberSaved', 'Team member updated'), [
        { text: t('common.ok', 'OK'), onPress: () => navigation.goBack() },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#38BDF8" size="large" />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#E8EDF5" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('ui.admin.editMember', 'Edit Team Member')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
        <TouchableOpacity style={s.avatarWrap} onPress={handlePickPhoto} disabled={uploading}>
          <CleanerAvatar name={name} avatarUrl={avatarUrl} size={110} textStyle={s.avatarInitial} />
          <View style={s.cameraBadge}>
            {uploading ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="camera" size={16} color="#000" />}
          </View>
        </TouchableOpacity>
        <Text style={s.photoHint}>{t('ui.admin.tapToChangePhoto', 'Tap to change photo')}</Text>

        {[
          { label: t('ui.admin.fullName', 'Full Name *'), value: name, setter: setName },
          { label: t('ui.admin.phone', 'Phone'), value: phone, setter: setPhone, keyboard: 'phone-pad' as const },
          { label: t('ui.admin.specialty', 'Specialty'), value: specialty, setter: setSpecialty },
          { label: t('ui.admin.rating', 'Rating'), value: rating, setter: setRating, keyboard: 'decimal-pad' as const },
        ].map(field => (
          <View key={field.label} style={s.field}>
            <Text style={s.label}>{field.label}</Text>
            <TextInput
              style={s.input}
              value={field.value}
              onChangeText={field.setter}
              keyboardType={field.keyboard}
              placeholderTextColor="#5A6A7A"
            />
          </View>
        ))}

        <View style={s.switchRow}>
          <View>
            <Text style={s.label}>{t('ui.admin.filters.available', 'Available')}</Text>
            <Text style={s.switchHint}>{t('ui.admin.availableHint', 'Turn off when cleaner is busy or off today')}</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#2A3A4A', true: 'rgba(56,189,248,0.6)' }}
            thumbColor={isActive ? '#38BDF8' : '#5A6A7A'}
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t('ui.admin.linkAccountEmail', 'Link App Account (email)')}</Text>
          {cleanerLogin ? (
            <View style={s.loginBadge}>
              <Ionicons name="key-outline" size={16} color="#38BDF8" />
              <Text style={s.loginBadgeText}>{t('ui.admin.cleanerLoginValue', 'Login: {{login}}', { values: { login: cleanerLogin } })}</Text>
            </View>
          ) : null}
          {!cleanerLogin && (
            <>
              <TextInput
                style={s.input}
                value={linkEmail}
                onChangeText={setLinkEmail}
                placeholder={linkedUserId ? t('ui.admin.accountLinked', 'Account linked — enter new email to change') : 'cleaner@example.com'}
                placeholderTextColor="#5A6A7A"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={s.switchHint}>{t('ui.admin.linkAccountHint', 'For legacy members without auto-generated login')}</Text>
            </>
          )}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving || deleting}>
          {saving ? <ActivityIndicator color="#000" /> : <Text style={s.saveBtnText}>{t('ui.saveChanges', 'Save Changes')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} disabled={saving || deleting}>
          {deleting
            ? <ActivityIndicator color="#EF4444" />
            : (
              <>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={s.deleteBtnText}>{t('ui.admin.deleteMember', 'Delete Team Member')}</Text>
              </>
            )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default AdminTeamMemberScreen;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#E8EDF5', fontSize: 17, fontWeight: '800' },
  avatarWrap: { alignSelf: 'center', marginBottom: 8, position: 'relative' },
  avatarInitial: { fontSize: 40 },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: '#38BDF8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#070B18' },
  photoHint: { textAlign: 'center', color: '#7A8A9A', fontSize: 12, marginBottom: 24 },
  field: { marginBottom: 14 },
  label: { color: '#7A8A9A', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#0F1629', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#E8EDF5', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F1629', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  switchHint: { color: '#5A6A7A', fontSize: 11, marginTop: 4, maxWidth: 220 },
  saveBtn: { backgroundColor: '#38BDF8', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  deleteBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  loginBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(56,189,248,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)' },
  loginBadgeText: { color: '#38BDF8', fontWeight: '700', fontSize: 14 },
});
