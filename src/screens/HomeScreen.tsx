import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Share,
  StatusBar,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useSimpleTranslation } from '../utils/i18n';
import HomeHeader from '../components/ui/HomeHeader';
import Toast from '../components/ui/Toast';
import LoadingScreen from '../components/ui/LoadingScreen';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Package service metadata (banners, descriptions, inclusions) ─────────────
const PKG_ASSETS: Record<number, {
  icon: any; banner: any; richDescription: string;
  inclusions: string[]; hoursMin: number; hoursMax: number;
  cleaners: number; isPopular?: boolean;
}> = {
  10: {
    icon: require('../../assets/icon_full_villa_deep_cleaning.png'),
    banner: require('../../assets/banner_full_villa.jpg'),
    richDescription: 'A comprehensive deep clean for your entire villa, ensuring every corner is spotless and sanitized. Perfect for moving in/out or a thorough seasonal refresh.',
    inclusions: ['All rooms vacuumed and mopped','Kitchen surfaces deep cleaned','Bathrooms fully sanitized','Windows wiped inside','Furniture dusted and polished','Skirting boards and light switches'],
    hoursMin: 4, hoursMax: 6, cleaners: 2, isPopular: true,
  },
  11: {
    icon: require('../../assets/icon_full_apartment.png'),
    banner: require('../../assets/banner_full_apartment.jpg'),
    richDescription: 'Thorough deep cleaning for apartments of all sizes, focusing on detail and hygiene in every room.',
    inclusions: ['All rooms vacuumed and mopped','Kitchen appliances & surfaces','Bathrooms sanitized','Windows wiped inside','Furniture dusted','Balcony swept and mopped'],
    hoursMin: 2, hoursMax: 4, cleaners: 1,
  },
  12: {
    icon: require('../../assets/icon_villa_facade.png'),
    banner: require('../../assets/banner_villa_facade.jpg'),
    richDescription: 'Professional exterior façade cleaning to restore the pristine look of your villa.',
    inclusions: ['Exterior walls pressure washed','Ground-floor windows exterior','Entrance area deep cleaned','Driveway and pathway swept','Garden fixtures wiped'],
    hoursMin: 3, hoursMax: 5, cleaners: 2,
  },
  13: {
    icon: require('../../assets/icon_move_in_out.png'),
    banner: require('../../assets/banner_move_in_out.jpg'),
    richDescription: 'Specialized cleaning for moving in or out, ensuring a completely fresh start. Every surface is treated so the next chapter begins spotlessly.',
    inclusions: ['Complete property sanitization','Deep clean all rooms','Kitchen & appliances inside-out','Bathrooms deep cleaned','Walls spot-cleaned','Wardrobes and cabinets inside'],
    hoursMin: 4, hoursMax: 8, cleaners: 2,
  },
  14: {
    icon: require('../../assets/icon_post_construction_final.png'),
    banner: require('../../assets/banner_post_construction.jpg'),
    richDescription: 'Intensive cleaning to remove dust, debris, and residue after renovation or construction work.',
    inclusions: ['Construction dust fully removed','Floors deep cleaned & polished','Walls and surfaces wiped','Windows inside and out','Fixtures and fittings cleaned','Debris disposal arranged'],
    hoursMin: 5, hoursMax: 8, cleaners: 2,
  },
  15: {
    icon: require('../../assets/icon_kitchen_cleaning.png'),
    banner: require('../../assets/banner_kitchen.jpg'),
    richDescription: 'Focused deep cleaning of the entire kitchen area, including all appliances, cabinets, and surfaces.',
    inclusions: ['Oven & stovetop deep cleaned','Refrigerator inside & outside','Cabinets degreased inside-out','Countertops sanitized','Sink and fixtures scrubbed','Floor deep mopped'],
    hoursMin: 2, hoursMax: 3, cleaners: 1,
  },
  16: {
    icon: require('../../assets/icon_bathroom_deep_cleaning.png'),
    banner: require('../../assets/banner_bathroom.jpg'),
    richDescription: 'Complete deep cleaning of bathrooms including tiles, grout, fixtures, and all surfaces.',
    inclusions: ['Tiles scrubbed and sanitized','Grout deep cleaned','Shower/bath descaled','Toilet fully sanitized','Mirror and fixtures polished','Floor deep mopped'],
    hoursMin: 1, hoursMax: 2, cleaners: 1,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserStats {
  totalBookings: number;
  averageRating: number;
  totalAddresses: number;
}

interface ActiveBooking {
  id: number;
  service_date: string;
  service_time: string;
  status: string;
  total_price: number;
  service_name: string;
  service_image_url?: string;
  property_size: string;
}

interface ServiceData {
  id: number;
  name: string;
  description: string;
  base_price: number;
  price_per_hour: number | null;
  is_active: boolean;
  image_url: string;
}

interface HomeScreenProps {
  navigation: any;
  route: any;
}

// ─── Glass card helper ────────────────────────────────────────────────────────
const GlassCard: React.FC<{ style?: any; children: React.ReactNode }> = ({
  style,
  children,
}) => (
  <View style={[glassStyles.card, style]}>
    <View style={glassStyles.border} pointerEvents="none" />
    {children}
  </View>
);

const glassStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, isGuest } = useAuth();
  const { t } = useSimpleTranslation();
  const insets = useSafeAreaInsets();

  const [userStats, setUserStats] = useState<UserStats>({
    totalBookings: 0,
    averageRating: 4.9,
    totalAddresses: 0,
  });
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Package carousel bottom sheet
  const [sheetService, setSheetService] = useState<ServiceData | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const sheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) sheetAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 90 || gs.vy > 0.55) {
          Animated.timing(sheetAnim, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }).start(() => {
            setSheetVisible(false); setSheetService(null);
          });
        } else {
          Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
        }
      },
    })
  ).current;

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // ── Stable user id (string) avoids re-running effects when Supabase
  //    fires TOKEN_REFRESHED and creates a new User object reference for
  //    the same user — using the ID (primitive) is safe.
  const userId = user?.id ?? null;

  // ── Data fetching (all wrapped in useCallback for stable references) ──────
  const fetchUserStats = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: bookings } = await supabase.from('bookings').select('id').eq('customer_id', userId);
      const { data: addresses } = await supabase.from('addresses').select('id').eq('user_id', userId);
      setUserStats({
        totalBookings: bookings?.length || 0,
        averageRating: 4.9,
        totalAddresses: addresses?.length || 0,
      });
    } catch (e) { console.error(e); }
  }, [userId]);

  const fetchLocalProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();
      if (data) setProfile(data);
    } catch (e) { console.error(e); }
  }, [userId]);

  const fetchServices = useCallback(async () => {
    try {
      const { data } = await supabase.from('services').select('id, name, description, base_price, price_per_hour, is_active, image_url').eq('is_active', true).order('id');
      setServices(data || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchActiveBookings = useCallback(async () => {
    if (!userId) return;
    try {
      const now = new Date().toISOString();
      const { data: bookings } = await supabase.from('bookings').select(`id, service_date, service_time, status, total_price, property_size, services (name, image_url)`).eq('customer_id', userId).in('status', ['confirmed', 'in_progress']).gte('service_date', now.split('T')[0]).order('service_date', { ascending: true }).limit(3);
      const transformed = (bookings || []).map((b: any) => ({
        ...b,
        service_name: b.services?.[0]?.name || 'Cleaning Service',
        service_image_url: b.services?.[0]?.image_url || '',
      }));
      setActiveBookings(transformed);
    } catch (e) { console.error(e); }
  }, [userId]);

  // loadAllData is stable as long as userId/isGuest/individual fetch fns don't change
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      if (userId) {
        await Promise.all([
          fetchUserStats(), fetchLocalProfile(), fetchActiveBookings(), fetchServices(),
        ]);
      } else if (isGuest) {
        await fetchServices();
      }
    } catch (e) {
      console.error('Error loading homepage data:', e);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [userId, isGuest, fetchUserStats, fetchLocalProfile, fetchActiveBookings, fetchServices]);

  // Run once when auth identity (userId/isGuest) actually changes
  useEffect(() => { loadAllData(); }, [loadAllData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Services with package metadata (IDs 10-16)
  const packageServices = services.filter(s => PKG_ASSETS[s.id]);

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'EEE, MMM d'); } catch { return d; }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setIsToastVisible(true);
  };

  const openSheet = (service: ServiceData) => {
    setSheetService(service);
    sheetAnim.setValue(SCREEN_H);
    setSheetVisible(true);
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetAnim, { toValue: SCREEN_H, duration: 300, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
      setSheetService(null);
    });
  };

  const handleBookNow = (service: ServiceData) => {
    closeSheet();
    setTimeout(() => {
      navigation.navigate('Booking', { serviceId: service.id, goToStep2: true });
    }, 320);
  };

  const handleProfileClick = () => {
    if (isGuest) {
      Alert.alert('Sign Up Required', 'Sign up to access your profile', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Up', onPress: () => navigation.getParent()?.navigate('Auth') },
      ]);
    } else {
      navigation.navigate('Profile');
    }
  };

  const handleInviteFriend = async () => {
    const userName = profile?.full_name || user?.email?.split('@')[0] || 'A friend';
    const shareUrl = `https://sparklepro.ae?ref=${user?.id || 'guest'}`;
    try {
      await Share.share({ message: `${userName} invited you to SparklePro! ${shareUrl}`, title: 'Invite to SparklePro' });
    } catch (e: any) {
      showToast('Failed to share. Please try again.', 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen dark gradient background */}
      <LinearGradient
        colors={['#070B18', '#0D1B35', '#070B18']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LoadingScreen isLoading={initialLoading} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D4FF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ─────────────────────────────────────────────── */}
        <HomeHeader
          userStats={{ totalBookings: userStats.totalBookings, totalAddresses: userStats.totalAddresses }}
          onProfileClick={handleProfileClick}
        />

        {/* ── Content ─────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Quick Book */}
          <TouchableOpacity
            style={styles.quickBookCard}
            onPress={() => navigation.navigate('Booking')}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#1A4FCC', '#0A9FD9', '#00D4FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quickBookGrad}
            >
              {/* Left icon circle */}
              <View style={styles.qbIconWrap}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']}
                  style={styles.qbIconGrad}
                >
                  <Ionicons name="flash" size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Text */}
              <View style={styles.qbText}>
                <Text style={styles.qbTitle}>Quick Book</Text>
                <Text style={styles.qbSubtitle}>Get instant cleaning in 2 taps</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>

            {/* Glow border */}
            <View style={styles.quickBookBorder} pointerEvents="none" />
          </TouchableOpacity>

          {/* ── Active Booking ──────────────────────────────────────── */}
          {!loading && activeBookings.length > 0 && user && (
            <View style={styles.section}>
              <SectionTitle icon="refresh-circle" label="Your Next Cleaning" />
              <TouchableOpacity
                style={styles.activeBookingCard}
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.8}
              >
                <View style={styles.abBorder} pointerEvents="none" />
                {activeBookings[0].service_image_url ? (
                  <Image source={{ uri: activeBookings[0].service_image_url }} style={styles.abImage} />
                ) : (
                  <View style={[styles.abImage, styles.abImageFallback]}>
                    <Ionicons name="sparkles-outline" size={28} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <View style={styles.abInfo}>
                  <Text style={styles.abServiceName} numberOfLines={1}>
                    {activeBookings[0].service_name}
                  </Text>
                  <View style={styles.abDateRow}>
                    <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.abDate}>
                      {formatDate(activeBookings[0].service_date)} at {activeBookings[0].service_time || '09:00'}
                    </Text>
                  </View>
                  <View style={styles.abFooter}>
                    <View style={[styles.statusBadge, activeBookings[0].status === 'confirmed' ? styles.statusConfirmed : styles.statusInProgress]}>
                      <Text style={styles.statusText}>
                        {activeBookings[0].status === 'confirmed' ? 'Confirmed' : 'In Progress'}
                      </Text>
                    </View>
                    <Text style={styles.abPrice}>{activeBookings[0].total_price} AED</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Services Carousel ────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionTitle icon="sparkles" label="Our Services" />
            {loading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }}
                contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}>
                {[0, 1, 2].map(i => <View key={i} style={styles.pkgSkeleton} />)}
              </ScrollView>
            ) : (
              <FlatList
                data={packageServices}
                horizontal
                keyExtractor={item => String(item.id)}
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -18 }}
                contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}
                renderItem={({ item }) => {
                  const meta = PKG_ASSETS[item.id];
                  if (!meta) return null;
                  return (
                    <TouchableOpacity
                      style={styles.pkgCard}
                      onPress={() => openSheet(item)}
                      activeOpacity={0.85}
                    >
                      <Image source={meta.banner} style={styles.pkgBanner} resizeMode="cover" />
                      {/* Dark overlay gradient */}
                      <LinearGradient
                        colors={['transparent', 'rgba(5,14,31,0.85)']}
                        style={styles.pkgOverlay}
                      />
                      {/* Popular badge */}
                      {meta.isPopular && (
                        <View style={styles.pkgPopularBadge}>
                          <Text style={styles.pkgPopularText}>⭐ Popular</Text>
                        </View>
                      )}
                      {/* Bottom info */}
                      <View style={styles.pkgInfo}>
                        <Text style={styles.pkgName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.pkgPrice}>
                          {Math.round(Number(item.base_price))} AED
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* ── Offer banner ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <LinearGradient
              colors={['#1F1650', '#2E1B73', '#1F1650']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.offerCard}
            >
              <View style={styles.offerBorder} pointerEvents="none" />
              <View style={styles.offerRow}>
                <View style={styles.offerIconWrap}>
                  <Text style={styles.offerEmoji}>🎁</Text>
                </View>
                <View style={styles.offerTextBlock}>
                  <Text style={styles.offerTitle}>Special Offer!</Text>
                  <Text style={styles.offerDesc}>
                    {userStats.totalBookings === 0
                      ? 'Get 15% off your first cleaning. Use code FIRST15'
                      : 'Invite a friend and get 10% off your next booking!'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.offerBtn}
                onPress={userStats.totalBookings === 0 ? () => navigation.navigate('Booking') : handleInviteFriend}
                activeOpacity={0.85}
              >
                <Text style={styles.offerBtnText}>
                  {userStats.totalBookings === 0 ? 'Book Now' : 'Invite Friend'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* ── Stats row ────────────────────────────────────────────── */}
          <GlassCard style={styles.statsCard}>
            <StatItem value={`${userStats.totalBookings}`} label="Bookings" icon="checkmark-circle-outline" color="#00D4FF" />
            <View style={styles.statDivider} />
            <StatItem value={`${userStats.averageRating}★`} label="Our Rating" icon="star-outline" color="#F59E0B" />
            <View style={styles.statDivider} />
            <StatItem value="24/7" label="Support" icon="headset-outline" color="#00FF88" />
          </GlassCard>

        </View>
      </ScrollView>


      {/* ── Package detail bottom sheet ─────────────────────────── */}
      {sheetVisible && sheetService && (() => {
        const meta = PKG_ASSETS[sheetService.id];
        if (!meta) return null;
        return (
          <Modal transparent animationType="none" visible={sheetVisible} onRequestClose={closeSheet} statusBarTranslucent>
            <TouchableOpacity style={pkgSheet.backdrop} activeOpacity={1} onPress={closeSheet} />
            <Animated.View style={[pkgSheet.sheet, { transform: [{ translateY: sheetAnim }] }]}>
              {/* Drag handle */}
              <View {...sheetPan.panHandlers} style={pkgSheet.handleArea}>
                <View style={pkgSheet.handle} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Banner */}
                <Image source={meta.banner} style={pkgSheet.banner} resizeMode="cover" />
                <View style={pkgSheet.content}>
                  {/* Popular badge */}
                  {meta.isPopular && (
                    <View style={pkgSheet.popularPill}>
                      <Text style={pkgSheet.popularPillText}>⭐ Popular</Text>
                    </View>
                  )}
                  {/* Name */}
                  <Text style={pkgSheet.name}>{sheetService.name}</Text>
                  {/* Description */}
                  <Text style={pkgSheet.desc}>{meta.richDescription}</Text>
                  {/* Inclusions */}
                  <Text style={pkgSheet.inclTitle}>What is included:</Text>
                  {meta.inclusions.map((item, i) => (
                    <View key={i} style={pkgSheet.inclRow}>
                      <View style={pkgSheet.checkCircle}><Text style={pkgSheet.checkMark}>✓</Text></View>
                      <Text style={pkgSheet.inclText}>{item}</Text>
                    </View>
                  ))}
                  {/* Info badges */}
                  <View style={pkgSheet.badgesRow}>
                    <View style={pkgSheet.badge}><Text style={pkgSheet.badgeText}>⏱  {meta.hoursMin}–{meta.hoursMax} hours</Text></View>
                    <View style={pkgSheet.badge}><Text style={pkgSheet.badgeText}>👷  {meta.cleaners} cleaner{meta.cleaners > 1 ? 's' : ''}</Text></View>
                  </View>
                  {/* Book Now CTA */}
                  <TouchableOpacity
                    onPress={() => handleBookNow(sheetService)}
                    activeOpacity={0.88}
                    style={{ borderRadius: 16, overflow: 'hidden', marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={['#2563EB', '#3B82F6']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={pkgSheet.bookBtn}
                    >
                      <Text style={pkgSheet.bookBtnText}>
                        Book Now — {Math.round(Number(sheetService.base_price))} AED
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </Modal>
        );
      })()}

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </View>
  );
};

// ─── Small reusable sub-components ────────────────────────────────────────────
const SectionTitle: React.FC<{ icon: any; label: string }> = ({ icon, label }) => (
  <View style={stSub.row}>
    <Ionicons name={icon} size={18} color="#00D4FF" />
    <Text style={stSub.text}>{label}</Text>
  </View>
);

const StatItem: React.FC<{ value: string; label: string; icon: any; color: string }> = ({ value, label, icon, color }) => (
  <View style={stSub.statItem}>
    <Ionicons name={icon} size={16} color={color} style={{ marginBottom: 4 }} />
    <Text style={[stSub.statVal, { color }]}>{value}</Text>
    <Text style={stSub.statLabel}>{label}</Text>
  </View>
);

const SkeletonCard: React.FC = () => (
  <View style={stSub.skeleton} />
);

const stSub = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  text: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  skeleton: {
    width: '48%',
    height: 190,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    marginBottom: 12,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingTop: 20 },

  // ── Quick Book
  quickBookCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  quickBookGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
    borderRadius: 22,
  },
  quickBookBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  qbIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
  },
  qbIconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  qbText: { flex: 1 },
  qbTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  qbSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 2 },

  // ── Section
  section: { marginBottom: 26 },

  // ── Active booking
  activeBookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  abBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  abImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  abImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  abInfo: { flex: 1 },
  abServiceName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  abDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  abDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  abFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusConfirmed: { backgroundColor: 'rgba(37,99,235,0.3)' },
  statusInProgress: { backgroundColor: 'rgba(139,92,246,0.3)' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#93C5FD' },
  abPrice: { fontSize: 13, fontWeight: '700', color: '#00FF88' },

  // ── Package carousel
  pkgCard: {
    width: 200,
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pkgBanner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  pkgOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  pkgPopularBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#F97316',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pkgPopularText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  pkgInfo: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  pkgName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  pkgPrice: { color: '#00D4FF', fontSize: 15, fontWeight: '800' },
  pkgSkeleton: {
    width: 200,
    height: 240,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // ── Offer card
  offerCard: {
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
  },
  offerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  offerRow: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'center' },
  offerIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerEmoji: { fontSize: 28 },
  offerTextBlock: { flex: 1 },
  offerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 5 },
  offerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 19 },
  offerBtn: {
    backgroundColor: 'rgba(0,212,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.4)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  offerBtnText: { color: '#00D4FF', fontSize: 15, fontWeight: '700' },

  // ── Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginBottom: 8,
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});

// ─── Package detail bottom sheet styles ──────────────────────────────────────
const pkgSheet = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D1B35',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.88,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  banner: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 20,
  },
  popularPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  popularPillText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 21, marginBottom: 18 },
  inclTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  inclRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(34,211,238,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: '#22D3EE', fontSize: 13, fontWeight: '800' },
  inclText: { color: 'rgba(255,255,255,0.80)', fontSize: 13, flex: 1 },
  badgesRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  badge: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  badgeText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  bookBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  bookBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});

export default HomeScreen;
