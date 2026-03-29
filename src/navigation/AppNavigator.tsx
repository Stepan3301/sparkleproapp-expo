import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen                    from '../components/ui/LoadingScreen';
import AuthScreen                       from '../screens/auth/AuthScreen';
import TestScreen                       from '../screens/TestScreen';
import MainTabNavigator                 from './MainTabNavigator';
import AdminTabNavigator                from './AdminTabNavigator';
import AdminOrderDetailScreen           from '../screens/admin/AdminOrderDetailScreen';
import AdminChatConversationScreen      from '../screens/admin/AdminChatConversationScreen';
import PersonalInfoScreen               from '../screens/profile/PersonalInfoScreen';
import AddressesScreen                  from '../screens/profile/AddressesScreen';
import HelpSupportScreen                from '../screens/profile/HelpSupportScreen';
import NotificationsScreen              from '../screens/profile/NotificationsScreen';
import PrivacySecurityScreen            from '../screens/profile/PrivacySecurityScreen';
import AddAddressScreen                 from '../screens/profile/AddAddressScreen';
import { RootStackParamList }           from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * AppNavigator
 * ─────────────
 * Branches into three trees:
 *   • Not authenticated → AuthScreen
 *   • Admin role        → AdminTabNavigator  (5-tab admin panel)
 *   • Customer / guest  → MainTabNavigator   (4-tab customer app)
 */
const AppNavigator: React.FC = () => {
  const { user, loading, isGuest, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen isLoading />;
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!user && !isGuest) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    );
  }

  // ── Admin ────────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="AdminTabs"             component={AdminTabNavigator}           />
        <Stack.Screen name="AdminOrderDetail"      component={AdminOrderDetailScreen}
          options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="AdminChatConversation" component={AdminChatConversationScreen}
          options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    );
  }

  // ── Customer / Guest ─────────────────────────────────────────────────────
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Test"     component={TestScreen}
        options={{ headerShown: true, title: 'Component Test' }} />
      {/* Profile sub-screens — slide in from the right */}
      <Stack.Screen name="PersonalInfo"    component={PersonalInfoScreen}    options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Addresses"       component={AddressesScreen}       options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AddAddress"      component={AddAddressScreen}      options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="HelpSupport"     component={HelpSupportScreen}     options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Notifications"   component={NotificationsScreen}   options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
