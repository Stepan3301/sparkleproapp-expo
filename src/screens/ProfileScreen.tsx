import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useGoToAuth } from '../hooks/useGoToAuth';
import { supabase } from '../lib/supabase';
import { useSimpleTranslation } from '../utils/i18n';

const { width } = Dimensions.get('window');

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  totalCleanings: number;
  hoursSaved: number;
  rating: number;
}

interface MenuItem {
  id: string;
  ionIcon: IoniconName;
  title: string;
  description: string;
  gradient: [string, string];
  badge?: string;
  disabled?: boolean;
  onPress: () => void;
}

// ─── Animated Stat Card ───────────────────────────────────────────────────────
const StatCard = ({
  ionIcon, iconColor, label, value, hint, loading,
}: {
  ionIcon: IoniconName;
  iconColor: string;
  label: string;
  value: number | string;
  hint: string;
  loading: boolean;
}) => {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.spring(animVal, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }).start();
    }
  }, [loading]);

  const scale = animVal.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const opacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={statStyles.card}>
      <View style={statStyles.top}>
        <Ionicons name={ionIcon} size={16} color={iconColor} />
        <Text style={statStyles.label}>{label}</Text>
      </View>
      <Animated.Text style={[statStyles.value, { transform: [{ scale }], opacity }]}>
        {loading ? '—' : value}
      </Animated.Text>
      <Text style={statStyles.hint}>{hint}</Text>
    </View>
  );
};

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  value: { fontSize: 22, fontWeight: '900', color: '#F1F5F9', marginVertical: 4 },
  hint: { fontSize: 10, color: '#64748B' },
});

// ─── Floating Bubble ───────────────────────────────────────────────────────────
const ProfileBubble = ({ x, delay, size }: { x: string; delay: number; size: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -180] });
  const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.8, 0.6, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -10,
        left: x,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.25)',
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface ProfileScreenProps {
  navigation: any;
}

const BUBBLES = [
  { x: '8%', delay: 0, size: 10 },
  { x: '22%', delay: 1200, size: 8 },
  { x: '38%', delay: 600, size: 13 },
  { x: '55%', delay: 1800, size: 9 },
  { x: '68%', delay: 400, size: 11 },
  { x: '80%', delay: 2200, size: 8 },
  { x: '90%', delay: 900, size: 12 },
];

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, profile, isGuest, signOut } = useAuth();
  const goToAuth = useGoToAuth();
  const { t, i18n } = useSimpleTranslation();
  const [stats, setStats] = useState<Stats>({ totalCleanings: 0, hoursSaved: 0, rating: 5.0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const currentLang = i18n.language === 'ru' ? 'ru' : 'en';

  // Stable user id (string) — avoids re-running effects when Supabase fires
  // TOKEN_REFRESHED and creates a new User object reference for the same user.
  const userId = user?.id ?? null;

  // ── Fetch stats from Supabase ─────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!userId) {
      setStatsLoading(false);
      return;
    }
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('duration_hours, status')
        .eq('customer_id', userId)
        .eq('status', 'completed');

      if (!error && bookings) {
        const totalCleanings = bookings.length;
        const hoursSaved = bookings.reduce((sum, b) => sum + (b.duration_hours || 0), 0);
        setStats({ totalCleanings, hoursSaved, rating: 5.0 });
      }
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getUserName = () =>
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('ui.user');

  const getEmail = () => user?.email || t('ui.guestUser');

  const getMemberSince = () => {
    const raw = profile?.member_since || profile?.created_at;
    if (!raw) {
      return t('ui.profile.memberSince', 'Member since {{year}}', { values: { year: '2024' } });
    }
    try {
      const d = new Date(raw);
      const month = t(`ui.months.${d.getMonth() + 1}`);
      return t('ui.profile.memberSince', 'Member since {{year}}', {
        values: { year: `${month} ${d.getFullYear()}` },
      });
    } catch {
      return t('ui.profile.memberSince', 'Member since {{year}}', { values: { year: '2024' } });
    }
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    const name = getUserName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ABDC6&color=fff&size=120`;
  };

  // ── Sign out handler ───────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert(
      t('ui.profile.signOut'),
      t('ui.profile.signOutConfirm'),
      [
        { text: t('navigation.cancel'), style: 'cancel' },
        {
          text: t('ui.profile.signOut'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  // ── Menu items ────────────────────────────────────────────────────────────
  const gridMenuItems: MenuItem[] = [
    {
      id: 'personal',
      ionIcon: 'person-outline',
      title: t('profile.personalInfo'),
      description: t('profile.personalInfoDesc'),
      gradient: ['#3B82F6', '#2563EB'],
      onPress: () => navigation.getParent()?.navigate('PersonalInfo'),
    },
    {
      id: 'addresses',
      ionIcon: 'location-outline',
      title: t('profile.addresses'),
      description: t('profile.addressesDesc'),
      gradient: ['#10B981', '#059669'],
      onPress: () => navigation.getParent()?.navigate('Addresses'),
    },
    {
      id: 'payment',
      ionIcon: 'card-outline',
      title: t('profile.payment'),
      description: t('profile.paymentDesc'),
      gradient: ['#9CA3AF', '#6B7280'],
      badge: t('ui.soon'),
      disabled: true,
      onPress: () => {},
    },
    {
      id: 'help',
      ionIcon: 'help-circle-outline',
      title: t('profile.help'),
      description: t('profile.helpDesc'),
      gradient: ['#06B6D4', '#0EA5E9'],
      onPress: () => navigation.getParent()?.navigate('HelpSupport'),
    },
  ];

  const fullWidthItems: MenuItem[] = [
    {
      id: 'privacy',
      ionIcon: 'shield-checkmark-outline',
      title: t('profile.privacy'),
      description: t('profile.privacyDesc'),
      gradient: ['#8B5CF6', '#7C3AED'],
      onPress: () => navigation.getParent()?.navigate('PrivacySecurity'),
    },
    {
      id: 'notifications',
      ionIcon: 'notifications-outline',
      title: t('profile.notifications'),
      description: t('profile.notificationsDesc'),
      gradient: ['#F59E0B', '#D97706'],
      onPress: () => navigation.getParent()?.navigate('Notifications'),
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ─────────────────────────────────────── */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <LinearGradient
            colors={['#2E1B69', '#1F1650', '#120A2E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Bubbles */}
          {BUBBLES.map((b, i) => (
            <ProfileBubble key={i} x={b.x} delay={b.delay} size={b.size} />
          ))}

          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>{t('ui.home.backHome')}</Text>
          </TouchableOpacity>

          {/* Avatar + Name Row */}
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: getAvatarUrl() }} style={styles.avatar} />
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>✨</Text>
              </View>
            </View>

            <View style={styles.heroMeta}>
              <Text style={styles.heroName} numberOfLines={1}>
                {isGuest ? t('ui.guestUser') : getUserName()}
              </Text>
              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{getMemberSince()}</Text>
                </View>
              </View>
              <Text style={styles.heroEmail} numberOfLines={1}>{getEmail()}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.actionBtnGhost}
              onPress={() => navigation.getParent()?.navigate('PersonalInfo')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnGhostText}>{t('ui.profile.editProfile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => navigation.navigate('Booking')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#5B3FD4', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Text style={styles.actionBtnPrimaryText}>{t('ui.profile.newBooking')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <StatCard
              ionIcon="sparkles-outline"
              iconColor="#00D4FF"
              label={t('ui.profile.totalCleanings')}
              value={stats.totalCleanings}
              hint={t('ui.profile.completedVisits')}
              loading={statsLoading}
            />
            <StatCard
              ionIcon="time-outline"
              iconColor="#00FF88"
              label={t('ui.profile.hoursSaved')}
              value={stats.hoursSaved}
              hint={t('ui.profile.vsDiy')}
              loading={statsLoading}
            />
            <StatCard
              ionIcon="star-outline"
              iconColor="#F59E0B"
              label={t('ui.profile.rating')}
              value={stats.rating.toFixed(1)}
              hint={t('ui.profile.avgFromPros')}
              loading={statsLoading}
            />
          </View>
        </View>

        {/* ── Menu Content ────────────────────────────────────── */}
        <View style={styles.content}>

          {/* 2x2 Grid */}
          <Text style={styles.sectionLabel}>{t('ui.profile.myAccount')}</Text>
          <View style={styles.grid}>
            {gridMenuItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.gridCard, item.disabled && styles.gridCardDisabled]}
                onPress={item.onPress}
                activeOpacity={item.disabled ? 1 : 0.75}
              >
                <LinearGradient colors={item.gradient} style={styles.gridIconWrap}>
                  <Ionicons name={item.ionIcon} size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.gridTitle, item.disabled && styles.disabledText]}>
                  {item.title}
                </Text>
                <Text style={[styles.gridDesc, item.disabled && styles.disabledText]}>
                  {item.description}
                </Text>
                {item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Full-width items */}
          <Text style={styles.sectionLabel}>{t('profile.settings', 'Settings')}</Text>

          {/* Language switcher */}
          <View style={styles.langCard}>
            <View style={styles.langHeader}>
              <LinearGradient colors={['#5B3FD4', '#7C3AED']} style={styles.listIconWrap}>
                <Ionicons name="language-outline" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.listMeta}>
                <Text style={styles.listTitle}>{t('profile.language', 'Language')}</Text>
                <Text style={styles.listDesc}>{t('profile.languageDesc', 'App display language')}</Text>
              </View>
            </View>
            <View style={styles.langSwitch}>
              <TouchableOpacity
                style={[styles.langOption, currentLang === 'en' && styles.langOptionActive]}
                onPress={() => i18n.changeLanguage('en')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langOptionText, currentLang === 'en' && styles.langOptionTextActive]}>
                  {t('ui.english')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langOption, currentLang === 'ru' && styles.langOptionActive]}
                onPress={() => i18n.changeLanguage('ru')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langOptionText, currentLang === 'ru' && styles.langOptionTextActive]}>
                  {t('ui.russian')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.listSection}>
            {fullWidthItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.listItem}
                onPress={item.onPress}
                activeOpacity={0.75}
              >
                <LinearGradient colors={item.gradient} style={styles.listIconWrap}>
                  <Ionicons name={item.ionIcon} size={22} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.listMeta}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listDesc}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Sign Out / Sign Up */}
          <View style={styles.signOutSection}>
            {isGuest ? (
              <TouchableOpacity
                style={styles.signUpBtn}
                onPress={goToAuth}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signOutGradient}
                >
                  <Text style={styles.signOutText}>{t('ui.profile.signUpContinue')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.signOutText}>{t('ui.profile.signOut')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* App version */}
          <Text style={styles.version}>{t('ui.profile.appVersion')}</Text>
        </View>
      </ScrollView>

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  scroll: { flex: 1 },

  // Hero
  hero: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  avatarBadgeText: { fontSize: 11 },

  heroMeta: { flex: 1, minWidth: 0 },
  heroName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  pillRow: { flexDirection: 'row', marginTop: 5 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  pillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroEmail: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 5 },

  // Hero Action Buttons
  heroActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtnGhost: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  actionBtnGhostText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  actionBtnPrimary: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  actionBtnGradient: { paddingVertical: 11, alignItems: 'center', borderRadius: 14 },
  actionBtnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: 8 },

  // Content
  content: { padding: 18 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: (width - 48) / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    position: 'relative',
    overflow: 'hidden',
  },
  gridCardDisabled: { opacity: 0.55 },
  gridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridIcon: { width: 26, height: 26 },
  gridTitle: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', marginBottom: 3 },
  gridDesc: { fontSize: 12, color: '#94A3B8' },
  disabledText: { color: '#64748B' },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },

  // List
  listSection: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  listIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIcon: { width: 26, height: 26 },
  listMeta: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  listDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  chevron: { fontSize: 22, color: '#64748B', fontWeight: '300' },

  // Language switcher
  langCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  langSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  langOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  langOptionActive: {
    backgroundColor: 'rgba(91,63,212,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.45)',
  },
  langOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  langOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Sign Out
  signOutSection: { marginBottom: 16 },
  signOutBtn: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.50)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  signUpBtn: { borderRadius: 18, overflow: 'hidden' },
  signOutGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    borderRadius: 18,
  },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },

  // Version
  version: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
});

export default ProfileScreen;
