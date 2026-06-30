import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import AdminDashboardScreen      from '../screens/admin/AdminDashboardScreen';
import AdminOrdersScreen         from '../screens/admin/AdminOrdersScreen';
import AdminTeamScreen           from '../screens/admin/AdminTeamScreen';
import AdminChatScreen           from '../screens/admin/AdminChatScreen';
import AdminSettingsScreen       from '../screens/admin/AdminSettingsScreen';

import { AdminTabParamList } from './types';
import { useSimpleTranslation } from '../utils/i18n';

const Tab = createBottomTabNavigator<AdminTabParamList>();

const ACTIVE_COLOR   = '#38BDF8';
const INACTIVE_COLOR = '#5A6A7A';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface AdminTab {
  name: keyof AdminTabParamList;
  iconActive:   IoniconName;
  iconInactive: IoniconName;
  labelKey: string;
  labelFallback: string;
}

const TABS: AdminTab[] = [
  { name: 'AdminDashboard', iconActive: 'grid',          iconInactive: 'grid-outline',          labelKey: 'ui.admin.tabs.dashboard', labelFallback: 'Dashboard' },
  { name: 'AdminOrders',    iconActive: 'reader',         iconInactive: 'reader-outline',         labelKey: 'ui.admin.tabs.orders',    labelFallback: 'Orders'    },
  { name: 'AdminTeam',      iconActive: 'people',         iconInactive: 'people-outline',         labelKey: 'ui.admin.tabs.team',      labelFallback: 'Team'      },
  { name: 'AdminChat',      iconActive: 'chatbubbles',    iconInactive: 'chatbubbles-outline',    labelKey: 'ui.admin.tabs.chat',      labelFallback: 'Chat'      },
  { name: 'AdminSettings',  iconActive: 'settings',       iconInactive: 'settings-outline',       labelKey: 'ui.admin.tabs.settings',  labelFallback: 'Settings'  },
];

const AdminTabBar = ({ state, navigation }: any) => {
  const { t } = useSimpleTranslation();

  return (
    <View style={s.barWrapper}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[s.bar, Platform.OS === 'android' && s.barAndroid]}>
        <View style={s.topBorder} />
        <View style={s.inner}>
          {TABS.map((tab) => {
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

const renderTabBar = (props: any) => <AdminTabBar {...props} />;

const AdminTabNavigator: React.FC = () => (
  <Tab.Navigator tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Tab.Screen name="AdminOrders"    component={AdminOrdersScreen}    />
    <Tab.Screen name="AdminTeam"      component={AdminTeamScreen}      />
    <Tab.Screen name="AdminChat"      component={AdminChatScreen}      />
    <Tab.Screen name="AdminSettings"  component={AdminSettingsScreen}  />
  </Tab.Navigator>
);

export default AdminTabNavigator;

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
  inner: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 4,
  },
  tabWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, minHeight: 58, position: 'relative' },
  activePill: {
    position: 'absolute', top: 0, width: 60, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(56,189,248,0.14)',
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)',
  },
  label:       { fontSize: 9.5, color: INACTIVE_COLOR, fontWeight: '600', marginTop: 3, letterSpacing: 0.2 },
  labelActive: { color: ACTIVE_COLOR, fontWeight: '700' },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: ACTIVE_COLOR, marginTop: 2,
    shadowColor: ACTIVE_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
});
