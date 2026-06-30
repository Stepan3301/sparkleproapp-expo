import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useGoToAuth } from '../../hooks/useGoToAuth';
import { useSimpleTranslation } from '../../utils/i18n';

interface BottomNavigationProps {
  state: any;
  navigation: any;
  descriptors: any;
  insets: any;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  routeName: string;
  iconActive: IoniconName;
  iconInactive: IoniconName;
  labelKey: string;
  labelFallback: string;
  requiresAuth?: boolean;
}

const TAB_CONFIG: TabConfig[] = [
  { routeName: 'Home', iconActive: 'home', iconInactive: 'home-outline', labelKey: 'navigation.home', labelFallback: 'Home' },
  { routeName: 'Booking', iconActive: 'calendar', iconInactive: 'calendar-outline', labelKey: 'navigation.booking', labelFallback: 'Book' },
  { routeName: 'History', iconActive: 'time', iconInactive: 'time-outline', labelKey: 'navigation.history', labelFallback: 'History', requiresAuth: true },
  { routeName: 'Profile', iconActive: 'person', iconInactive: 'person-outline', labelKey: 'navigation.profile', labelFallback: 'Profile', requiresAuth: true },
];

const ACTIVE_COLOR = '#38BDF8';
const INACTIVE_COLOR = '#94A3B8';

const BottomNavigation: React.FC<BottomNavigationProps> = ({ state, navigation, insets }) => {
  const { isGuest } = useAuth();
  const goToAuth = useGoToAuth();
  const { t } = useSimpleTranslation();
  const bottomPad = Math.max(insets?.bottom ?? 0, 10);

  const tabs = useMemo(
    () => TAB_CONFIG.map((tab) => ({
      ...tab,
      label: t(tab.labelKey, tab.labelFallback),
    })),
    [t],
  );

  const handlePress = (tab: (typeof tabs)[number], index: number) => {
    if (tab.requiresAuth && isGuest) {
      Alert.alert(
        t('ui.signUpRequired', 'Sign Up Required'),
        t('ui.signUpToAccess', 'Sign up to access {{label}}', { values: { label: tab.label } }),
        [
          { text: t('navigation.cancel', 'Cancel'), style: 'cancel' },
          { text: t('ui.signUp', 'Sign Up'), onPress: goToAuth },
        ],
      );
      return;
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index]?.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(tab.routeName);
    }
  };

  const inner = (
    <View style={[styles.inner, { paddingBottom: bottomPad }]}>
      {tabs.map((tab, index) => {
        const isActive = state.routes[state.index]?.name === tab.routeName;

        return (
          <TouchableOpacity
            key={tab.routeName}
            onPress={() => handlePress(tab, index)}
            style={styles.tab}
            activeOpacity={0.75}
          >
            {isActive && <View style={styles.activePill} />}
            {isActive && <View style={[styles.glowLayer, { shadowColor: ACTIVE_COLOR }]} />}
            <Ionicons
              name={isActive ? tab.iconActive : tab.iconInactive}
              size={22}
              color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={90} tint="dark" style={styles.container}>
        <View style={styles.glassOverlayDark} />
        <View style={styles.glassOverlayTint} />
        <View style={styles.topBorder} />
        {inner}
      </BlurView>
    );
  }

  return (
    <View style={[styles.container, styles.androidFallback]}>
      <View style={styles.topBorder} />
      {inner}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.50,
    shadowRadius: 24,
    elevation: 28,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  androidFallback: {
    backgroundColor: 'rgba(7,11,24,0.96)',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  glassOverlayDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,11,24,0.82)' },
  glassOverlayTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,30,64,0.30)' },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  inner: { flexDirection: 'row', paddingTop: 10, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, minHeight: 58, position: 'relative' },
  activePill: {
    position: 'absolute', top: 0, width: 60, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.16)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.28)',
    shadowColor: '#38BDF8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.20, shadowRadius: 10,
  },
  glowLayer: {
    position: 'absolute', top: 6, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.80, shadowRadius: 14,
  },
  label: { fontSize: 10, color: INACTIVE_COLOR, fontWeight: '600', marginTop: 4, letterSpacing: 0.2 },
  labelActive: { color: ACTIVE_COLOR, fontWeight: '700' },
  dot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: ACTIVE_COLOR, marginTop: 3,
    shadowColor: ACTIVE_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
  },
});

export default BottomNavigation;
