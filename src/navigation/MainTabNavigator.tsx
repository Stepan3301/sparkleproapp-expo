import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen    from '../screens/HomeScreen';
import BookingScreen from '../screens/BookingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BottomNavigation from '../components/ui/BottomNavigation';

import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * renderTabBar is defined OUTSIDE the component so its reference is
 * completely stable — it never changes between renders.
 *
 * React Navigation internally does `useEffect([tabBar, ...])`.
 * If `tabBar` were an inline arrow function or a useCallback whose
 * deps include a value that changes on every render (e.g. the insets
 * object from useSafeAreaInsets), that effect would re-run on every
 * render, causing a "Maximum update depth exceeded" loop.
 *
 * By hoisting the render function outside the component we guarantee
 * it is a static module-level constant — the safest possible approach.
 *
 * React Navigation already passes the correct `insets` through its own
 * BottomTabBarProps, so BottomNavigation receives them without us
 * having to call useSafeAreaInsets() here at all.
 */
const renderTabBar = (props: any) => <BottomNavigation {...props} />;

/**
 * MainTabNavigator
 * ─────────────────
 * Wraps the four main tabs in a bottom-tab navigator.
 *
 * Key decisions:
 *  • unmountOnBlur: false (default) → once visited, screens stay mounted.
 *    Switching back is instant and there are no re-mount re-renders.
 *  • lazy: true (default) → screens mount on FIRST visit, not all at startup.
 *    This prevents 4 heavy screens mounting simultaneously and causing cascading
 *    state updates that exceed React's maximum update depth.
 *  • tabBar is a module-level constant → always the same reference.
 */
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Booking" component={BookingScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
