// Simple translation utility for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import enTranslations from '../i18n/locales/en.json';
import ruTranslations from '../i18n/locales/ru.json';

type Translations = typeof enTranslations;

const translations = {
  en: enTranslations,
  ru: ruTranslations
} as const;

const STORAGE_KEY = 'i18nextLng';

export const getCurrentLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    
    // Get device language
    const deviceLang = Localization.locale.split('-')[0];
    return deviceLang === 'ru' ? 'ru' : 'en';
  } catch {
    return 'en';
  }
};

export const setLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export const t = async (key: string, fallback?: string, options?: { count?: number }): Promise<string> => {
  const lang = (await getCurrentLanguage()) as keyof typeof translations;
  const translationData = translations[lang] || translations.en;
  
  // Simple nested key access
  let result: any = translationData;
  
  // Handle pluralization
  if (options?.count !== undefined) {
    // Try to find plural key first
    const pluralKey = `${key}_plural`;
    const keys = pluralKey.split('.');
    
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        break;
      }
    }
    
    // If plural key exists and count > 1, use it
    if (typeof result === 'string' && options.count > 1) {
      return result.replace('{{count}}', options.count.toString());
    }
    
    // Reset for singular key
    result = translationData;
  }
  
  // Regular key access
  const keys = key.split('.');
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return fallback || key;
    }
  }
  
  let finalResult = typeof result === 'string' ? result : (fallback || key);
  
  // Replace placeholders
  if (options?.count !== undefined) {
    finalResult = finalResult.replace('{{count}}', options.count.toString());
  }
  
  return finalResult;
};

// Synchronous version for use in components (uses cached language)
let cachedLanguage: string = 'en';

export const initI18n = async (): Promise<void> => {
  cachedLanguage = await getCurrentLanguage();
};

export const tSync = (key: string, fallback?: string, options?: { count?: number }): string => {
  const lang = cachedLanguage as keyof typeof translations;
  const translationData = translations[lang] || translations.en;
  
  let result: any = translationData;
  
  if (options?.count !== undefined) {
    const pluralKey = `${key}_plural`;
    const keys = pluralKey.split('.');
    
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        break;
      }
    }
    
    if (typeof result === 'string' && options.count > 1) {
      return result.replace('{{count}}', options.count.toString());
    }
    
    result = translationData;
  }
  
  const keys = key.split('.');
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      return fallback || key;
    }
  }
  
  let finalResult = typeof result === 'string' ? result : (fallback || key);
  
  if (options?.count !== undefined) {
    finalResult = finalResult.replace('{{count}}', options.count.toString());
  }
  
  return finalResult;
};

export const useSimpleTranslation = () => {
  const changeLanguage = async (lang: string) => {
    await setLanguage(lang);
    cachedLanguage = lang;
  };
  
  return {
    t: tSync,
    tPlural: (key: string, count: number, fallback?: string) => tSync(key, fallback, { count }),
    i18n: {
      language: cachedLanguage,
      changeLanguage
    }
  };
};
