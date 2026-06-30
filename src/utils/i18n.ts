// Simple translation utility for React Native
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import enTranslations from '../i18n/locales/en.json';
import ruTranslations from '../i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  ru: ruTranslations,
} as const;

const STORAGE_KEY = 'i18nextLng';

export type TOptions = {
  count?: number;
  values?: Record<string, string | number>;
};

let cachedLanguage = 'en';

const getNestedValue = (data: Record<string, unknown>, key: string): unknown => {
  let result: unknown = data;
  for (const part of key.split('.')) {
    if (result && typeof result === 'object' && part in (result as Record<string, unknown>)) {
      result = (result as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return result;
};

const applyOptions = (text: string, options?: TOptions): string => {
  let result = text;
  if (options?.count !== undefined) {
    result = result.replace(/\{\{count\}\}/g, String(options.count));
  }
  if (options?.values) {
    for (const [key, value] of Object.entries(options.values)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
  }
  return result;
};

export const resolveTranslation = (
  lang: string,
  key: string,
  fallback?: string,
  options?: TOptions,
): string => {
  const translationData = translations[lang as keyof typeof translations] || translations.en;

  if (options?.count !== undefined) {
    const pluralValue = getNestedValue(translationData as Record<string, unknown>, `${key}_plural`);
    if (typeof pluralValue === 'string' && options.count !== 1) {
      return applyOptions(pluralValue, options);
    }
  }

  const value = getNestedValue(translationData as Record<string, unknown>, key);
  if (typeof value === 'string') {
    return applyOptions(value, options);
  }

  return applyOptions(fallback ?? key, options);
};

export const getCurrentLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
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

export const initI18n = async (): Promise<void> => {
  cachedLanguage = await getCurrentLanguage();
};

export const tSync = (key: string, fallback?: string, options?: TOptions): string =>
  resolveTranslation(cachedLanguage, key, fallback, options);

export const t = async (key: string, fallback?: string, options?: TOptions): Promise<string> => {
  const lang = await getCurrentLanguage();
  return resolveTranslation(lang, key, fallback, options);
};

interface LanguageContextValue {
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  changeLanguage: async () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState(cachedLanguage);

  useEffect(() => {
    initI18n().then(() => setLanguageState(cachedLanguage));
  }, []);

  const changeLanguage = useCallback(async (lang: string) => {
    await setLanguage(lang);
    cachedLanguage = lang;
    setLanguageState(lang);
  }, []);

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, changeLanguage } },
    children,
  );
};

export const useSimpleTranslation = () => {
  const { language, changeLanguage } = useContext(LanguageContext);

  const tBound = useCallback(
    (key: string, fallback?: string, options?: TOptions) =>
      resolveTranslation(language, key, fallback, options),
    [language],
  );

  return useMemo(
    () => ({
      t: tBound,
      tPlural: (key: string, count: number, fallback?: string, values?: Record<string, string | number>) =>
        tBound(key, fallback, { count, values }),
      i18n: { language, changeLanguage },
    }),
    [language, changeLanguage, tBound],
  );
};
