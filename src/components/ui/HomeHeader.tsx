import React from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useSimpleTranslation } from '../../utils/i18n';

// Luxury interior hero image (already preloaded at startup)
const HERO_IMG = require('../../../assets/banner_full_apartment.jpg');

interface HomeHeaderProps {
  userStats: {
    totalBookings: number;
    totalAddresses: number;
  };
  onProfileClick: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ userStats, onProfileClick }) => {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { t } = useSimpleTranslation();

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greeting.morning', 'Good morning');
    if (h < 17) return t('home.greeting.afternoon', 'Good afternoon');
    return t('home.greeting.evening', 'Good evening');
  };

  const getUserName = () =>
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const getAvatarSrc = () => {
    if (profile?.avatar_url) return { uri: profile.avatar_url };
    const name = getUserName();
    return {
      uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ABDC6&color=fff&size=120`,
    };
  };

  return (
    <ImageBackground
      source={HERO_IMG}
      style={[styles.container, { paddingTop: insets.top + 16 }]}
      imageStyle={styles.bgImage}
    >
      {/* Gradient overlay: dark top & bottom, transparent middle */}
      <LinearGradient
        colors={[
          'rgba(7,11,24,0.72)',
          'rgba(7,11,24,0.28)',
          'rgba(7,11,24,0.78)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Top row: avatar + greeting + bell ─────────────────────────── */}
      <View style={styles.topRow}>
        {/* Avatar with cyan glow ring */}
        <TouchableOpacity onPress={onProfileClick} activeOpacity={0.85}>
          <View style={styles.avatarRing}>
            <Image source={getAvatarSrc()} style={styles.avatar} />
          </View>
        </TouchableOpacity>

        {/* Greeting block */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingLine}>{getGreeting()},</Text>
          <Text style={styles.nameLine} numberOfLines={1}>
            {getUserName()}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color="#00D4FF" />
            <Text style={styles.locationText}>Dubai, UAE</Text>
          </View>
        </View>

        {/* Bell button */}
        <View style={styles.bellBtn}>
          <View style={styles.bellDot} />
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        </View>
      </View>

      {/* ── Glass stat pills ───────────────────────────────────────────── */}
      <View style={styles.pillsRow}>
        <View style={styles.pill}>
          <Ionicons name="home-outline" size={14} color="#00D4FF" />
          <Text style={styles.pillText}>
            {userStats.totalBookings} cleaning{userStats.totalBookings !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="location-outline" size={14} color="#00FF88" />
          <Text style={styles.pillText}>
            {userStats.totalAddresses} address{userStats.totalAddresses !== 1 ? 'es' : ''}
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    minHeight: 230,
  },
  bgImage: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  // ── Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#00D4FF',
    padding: 2,
    marginRight: 14,
    marginTop: 2,
    // Glow on iOS
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  greetingBlock: {
    flex: 1,
  },
  greetingLine: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  nameLine: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },

  // Bell
  bellBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 2,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    zIndex: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(10,14,26,0.9)',
  },

  // ── Stat pills
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default HomeHeader;
