import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initI18n } from './src/utils/i18n';
import { preloadAssets } from './src/utils/assetPreloader';

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      // Run both tasks in parallel — i18n init + asset preloading
      await Promise.all([
        initI18n(),
        preloadAssets(),
      ]);
      setAppReady(true);
    }
    prepare();
  }, []);

  // Keep the splash-style loader until assets are decoded and cached
  if (!appReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
