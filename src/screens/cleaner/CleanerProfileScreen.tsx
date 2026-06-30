import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSimpleTranslation } from '../../utils/i18n';
import CleanerAvatar from '../../components/admin/CleanerAvatar';

const CleanerProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const { t } = useSimpleTranslation();

  const handleSignOut = () => {
    Alert.alert(
      t('ui.admin.signOut', 'Sign Out'),
      t('ui.admin.signOutConfirm', 'Are you sure you want to sign out?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('ui.admin.signOut', 'Sign Out'), style: 'destructive', onPress: () => void signOut() },
      ],
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />
      <Text style={s.title}>{t('ui.cleaner.tabs.profile', 'Profile')}</Text>

      <View style={s.card}>
        <CleanerAvatar name={profile?.full_name} avatarUrl={profile?.avatar_url} size={72} />
        <Text style={s.name}>{profile?.full_name ?? t('ui.cleaner.cleaner', 'Cleaner')}</Text>
        <Text style={s.role}>{t('ui.cleaner.roleLabel', 'Team Cleaner')}</Text>
        {!!profile?.phone_number && <Text style={s.phone}>{profile.phone_number}</Text>}
      </View>

      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={s.signOutText}>{t('ui.admin.signOut', 'Sign Out')}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CleanerProfileScreen;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18', paddingHorizontal: 18 },
  title: { color: '#E8EDF5', fontSize: 24, fontWeight: '800', marginTop: 14, marginBottom: 20 },
  card: { backgroundColor: '#0F1629', borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  name: { color: '#E8EDF5', fontSize: 20, fontWeight: '800', marginTop: 14 },
  role: { color: '#38BDF8', fontSize: 13, fontWeight: '700', marginTop: 4 },
  phone: { color: '#7A8A9A', fontSize: 14, marginTop: 8 },
  signOutBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  signOutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
