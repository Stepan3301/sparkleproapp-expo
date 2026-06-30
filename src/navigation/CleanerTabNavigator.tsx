import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import CleanerJobsScreen from '../screens/cleaner/CleanerJobsScreen';
import CleanerProfileScreen from '../screens/cleaner/CleanerProfileScreen';
import { CleanerTabParamList } from './types';
import { useSimpleTranslation } from '../utils/i18n';

const Tab = createBottomTabNavigator<CleanerTabParamList>();

const ACTIVE_COLOR   = '#38BDF8';
const INACTIVE_COLOR = '#5A6A7A';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: {
  name: keyof CleanerTabParamList;
  iconActive: IoniconName;
  iconInactive: IoniconName;
  labelKey: string;
  labelFallback: string;
}[] = [
  { name: 'CleanerJobs', iconActive: 'briefcase', iconInactive: 'briefcase-outline', labelKey: 'ui.cleaner.tabs.jobs', labelFallback: 'My Jobs' },
  { name: 'CleanerProfile', iconActive: 'person', iconInactive: 'person-outline', labelKey: 'ui.cleaner.tabs.profile', labelFallback: 'Profile' },
];

const CleanerTabBar = ({ state, navigation }: any) => {
  const { t } = useSimpleTranslation();
  return (
    <View style={s.barWrapper}>
      {Platform.OS === 'ios' ? <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <View style={[s.bar, Platform.OS === 'android' && s.barAndroid]}>
        <View style={s.topBorder} />
        <View style={s.inner}>
          {TABS.map(tab => {
            const isActive = state.routes[state.index]?.name === tab.name;
            return (
              <View key={tab.name} style={s.tabWrap}>
                {isActive && <View style={s.activePill} />}
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={22}
                  color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
                  onPress={() => navigation.navigate(tab.name)}
                />
                <Text style={[s.label, isActive && s.labelActive]}>
                  {t(tab.labelKey, tab.labelFallback)}
                </Text>
                {isActive && <View style={s.dot} />}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const CleanerTabNavigator: React.FC = () => (
  <Tab.Navigator tabBar={(props) => <CleanerTabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="CleanerJobs" component={CleanerJobsScreen} />
    <Tab.Screen name="CleanerProfile" component={CleanerProfileScreen} />
  </Tab.Navigator>
);

export default CleanerTabNavigator;

const s = StyleSheet.create({
  barWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bar: {
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: 'rgba(7,11,24,0.94)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 26,
  },
  barAndroid: { borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.09)' },
  topBorder: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  inner: { flexDirection: 'row', paddingTop: 10, paddingBottom: 28, paddingHorizontal: 24 },
  tabWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, minHeight: 58, position: 'relative' },
  activePill: {
    position: 'absolute', top: 0, width: 72, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.14)',
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)',
  },
  label: { fontSize: 10, color: INACTIVE_COLOR, fontWeight: '600', marginTop: 3 },
  labelActive: { color: ACTIVE_COLOR, fontWeight: '700' },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: ACTIVE_COLOR, marginTop: 2,
  },
});
