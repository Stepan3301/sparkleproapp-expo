import {
  MIN_BOOKING_HOURS,
  WINDOW_HOURLY_RATE,
  getWeekendSurcharge,
  HOURLY_RATES_CLIENT,
} from '../constants/bookingRules';
import { getDeepPackagePrice } from '../constants/deepCleaningPackages';
import { calculateCost, getServiceKey } from './recommendationAlgorithm';

export interface PricingInput {
  selectedCategory: string | null;
  selectedService: { id: number; name: string; base_price: number; price_per_hour: number | null } | null;
  selectedPropertySize: string | null;
  selectedCleaners: number | null;
  selectedHours: number | null;
  ownMaterials: boolean;
  serviceDate: string;
  selectedAddonsTotal: number;
  paymentMethod: string;
  deepPropertyType: 'villa' | 'townhouse';
  isDeepPackage: boolean;
}

export function getEffectiveHours(selectedHours: number | null): number {
  return Math.max(MIN_BOOKING_HOURS, selectedHours ?? MIN_BOOKING_HOURS);
}

export function calcBookingPricing(input: PricingInput) {
  const {
    selectedCategory,
    selectedService,
    selectedPropertySize,
    selectedCleaners,
    selectedHours,
    ownMaterials,
    serviceDate,
    selectedAddonsTotal,
    paymentMethod,
    deepPropertyType,
    isDeepPackage,
  } = input;

  if (!selectedService) {
    return { base: 0, weekendSurcharge: 0, addonsTotal: 0, subtotal: 0, vat: 0, cashFee: 0, total: 0, duration: MIN_BOOKING_HOURS };
  }

  const duration = getEffectiveHours(
    selectedCategory === 'specialized'
      ? selectedHours
      : selectedCategory === 'packages' || isDeepPackage
        ? null
        : selectedHours,
  );

  let base = 0;
  let billableDuration = duration;

  if (selectedCategory === 'specialized') {
    billableDuration = getEffectiveHours(selectedHours);
    base = Math.round(billableDuration * WINDOW_HOURLY_RATE);
  } else if (isDeepPackage || (selectedCategory === 'packages' && !selectedService.price_per_hour)) {
    const pkgPrice = getDeepPackagePrice(selectedService.id, deepPropertyType);
    base = Math.round(pkgPrice ?? Number(selectedService.base_price));
    billableDuration = MIN_BOOKING_HOURS;
  } else if (selectedService.price_per_hour && selectedCategory !== 'packages') {
    const cleaners = selectedCleaners ?? 1;
    billableDuration = getEffectiveHours(selectedHours);
    const key = getServiceKey(selectedService.name);
    const rates = HOURLY_RATES_CLIENT[key as keyof typeof HOURLY_RATES_CLIENT] ?? HOURLY_RATES_CLIENT.regular;
    const rate = ownMaterials ? rates.without_materials : rates.with_materials;
    base = Math.round(cleaners * billableDuration * rate);
  } else {
    base = Math.round(Number(selectedService.base_price));
    billableDuration = MIN_BOOKING_HOURS;
  }

  const weekendSurcharge = getWeekendSurcharge(serviceDate, billableDuration);
  const addonsTotal = Math.round(selectedAddonsTotal);
  const subtotal = base + weekendSurcharge + addonsTotal;
  const vat = Math.round(subtotal * 0.05);
  const cashFee = paymentMethod === 'cash' ? 5 : 0;

  return {
    base,
    weekendSurcharge,
    addonsTotal,
    subtotal,
    vat,
    cashFee,
    total: subtotal + vat + cashFee,
    duration: billableDuration,
  };
}

/** @deprecated use calcBookingPricing */
export { calculateCost };
