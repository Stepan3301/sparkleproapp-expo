import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initI18n, LanguageProvider } from './src/utils/i18n';
import { preloadAssets } from './src/utils/assetPreloader';

const STARTUP_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.warn(`[startup] ${label} timed out after ${ms}ms — continuing`);
      resolve(undefined as T);
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        console.warn(`[startup] ${label} failed:`, error);
        resolve(undefined as T);
      });
  });
}

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      await Promise.all([
        withTimeout(initI18n(), STARTUP_TIMEOUT_MS, 'initI18n'),
        withTimeout(preloadAssets(), STARTUP_TIMEOUT_MS, 'preloadAssets'),
      ]);
      if (mounted) setAppReady(true);
    }

    void prepare();

    return () => {
      mounted = false;
    };
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
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </LanguageProvider>
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
