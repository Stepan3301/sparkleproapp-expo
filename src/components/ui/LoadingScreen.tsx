import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleTranslation } from '../../utils/i18n';

interface LoadingScreenProps {
  isLoading: boolean;
  onLoadingComplete?: () => void;
  minDuration?: number;
  smartLoading?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading,
  onLoadingComplete,
  minDuration = 800,
  smartLoading = false,
}) => {
  const { t } = useSimpleTranslation();
  const [showLoader, setShowLoader] = useState(isLoading);
  const [fadeOut, setFadeOut] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      setFadeOut(false);
      startTimeRef.current = Date.now();
    } else {
      const endTime = Date.now();
      const loadTime = startTimeRef.current ? endTime - startTimeRef.current : 0;

      if (smartLoading) {
        const smartDuration = Math.max(loadTime + 100, 300);
        const timer = setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            setShowLoader(false);
            onLoadingComplete?.();
          }, 300);
        }, smartDuration);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            setShowLoader(false);
            onLoadingComplete?.();
          }, 300);
        }, minDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, minDuration, smartLoading]);

  if (!showLoader) return null;

  return (
    <View style={[styles.container, { opacity: fadeOut ? 0 : 1 }]}>
      <LinearGradient
        colors={['#070B18', '#0D1526', '#0F172A']}
        style={StyleSheet.absoluteFill}
      />
      <ActivityIndicator size="large" color="#22D3EE" />
      <Text style={styles.brandText}>{t('app.name', 'SparklePro')}</Text>
      <Text style={styles.loadingText}>{t('navigation.loading', 'Loading...')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  brandText: {
    color: '#22D3EE',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default LoadingScreen;
