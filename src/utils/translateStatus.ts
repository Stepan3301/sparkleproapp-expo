import enTranslations from '../i18n/locales/en.json';
import ruTranslations from '../i18n/locales/ru.json';
import { BookingStatus } from '../types/booking';
import { TOptions } from './i18n';

type TranslateFn = (key: string, fallback?: string, options?: TOptions) => string;

const translationData = { en: enTranslations, ru: ruTranslations };

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

export const getPackageCopy = (
  t: TranslateFn,
  id: number,
  lang: string,
): { richDescription: string; inclusions: string[] } => {
  const data = translationData[lang as keyof typeof translationData] || translationData.en;
  const inclusions = getNestedValue(data as Record<string, unknown>, `ui.packages.${id}.inclusions`);
  return {
    richDescription: t(`ui.packages.${id}.richDescription`),
    inclusions: Array.isArray(inclusions) ? (inclusions as string[]) : [],
  };
};

export const translateBookingStatus = (t: TranslateFn, status: string): string => {
  const map: Record<string, string> = {
    pending: 'history.status.pending',
    confirmed: 'history.status.confirmed',
    in_progress: 'history.status.inProgress',
    completed: 'history.status.completed',
    cancelled: 'history.status.cancelled',
    scheduled: 'ui.admin.status.scheduled',
  };
  const key = map[status];
  return key ? t(key, status) : status;
};

export const translatePropertySize = (t: TranslateFn, size: string): string => {
  const map: Record<string, string> = {
    small: 'booking.propertySize.small',
    medium: 'booking.propertySize.medium',
    large: 'booking.propertySize.large',
    villa: 'booking.propertySize.villa',
  };
  return map[size] ? t(map[size], size) : size;
};

export const getMonthNames = (t: TranslateFn): string[] =>
  Array.from({ length: 12 }, (_, i) => t(`ui.months.${i + 1}`, ''));

export const getDayNamesShort = (t: TranslateFn): string[] =>
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => t(`ui.daysShort.${d}`, d.toUpperCase()));

export const getDateLocaleTag = (lang: string): string => (lang === 'ru' ? 'ru-RU' : 'en-AE');

export const formatLocalizedDate = (dateStr: string, lang: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString(getDateLocaleTag(lang), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatLocalizedTime = (timeStr: string, lang: string): string => {
  try {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString(getDateLocaleTag(lang), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return timeStr;
  }
};
