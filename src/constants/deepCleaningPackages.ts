export const SUMMER_OFFER_LABEL = 'Summer offer 30%';

export const DEEP_CLEANING_SCOPE_KEYS = [
  'scope1', 'scope2', 'scope3', 'scope4', 'scope5', 'scope6',
  'scope7', 'scope8', 'scope9', 'scope10', 'scope11', 'scope12',
] as const;

export interface DeepPackageOption {
  serviceId: number;
  labelKey: string;
  labelFallback: string;
  price: number;
  townhousePrice?: number;
  isPopular?: boolean;
}

export const APARTMENT_DEEP_PACKAGES: DeepPackageOption[] = [
  { serviceId: 20, labelKey: 'studio', labelFallback: 'Studio', price: 350 },
  { serviceId: 21, labelKey: '1br', labelFallback: '1 Bedroom', price: 599 },
  { serviceId: 22, labelKey: '2br', labelFallback: '2 Bedroom', price: 799, isPopular: true },
  { serviceId: 23, labelKey: '3brMaid', labelFallback: '3 Bedroom + Maid', price: 1050 },
  { serviceId: 24, labelKey: '4brMaid', labelFallback: '4 Bedroom + Maid', price: 1399 },
];

export const VILLA_DEEP_PACKAGES: DeepPackageOption[] = [
  { serviceId: 10, labelKey: '1br', labelFallback: '1 Bedroom', price: 899, townhousePrice: 799 },
  { serviceId: 25, labelKey: '2br', labelFallback: '2 Bedroom', price: 1299, townhousePrice: 1099 },
  { serviceId: 26, labelKey: '3br', labelFallback: '3 Bedroom', price: 1499, townhousePrice: 1299 },
  { serviceId: 27, labelKey: '4br', labelFallback: '4 Bedroom', price: 2199, townhousePrice: 1799 },
];

export const POST_CONSTRUCTION_PACKAGE = {
  serviceId: 30,
  labelFallback: 'Post-construction Deep Cleaning',
  startingPrice: 699,
};

export const DEEP_PACKAGE_SERVICE_IDS = [
  ...APARTMENT_DEEP_PACKAGES.map(p => p.serviceId),
  ...VILLA_DEEP_PACKAGES.map(p => p.serviceId),
  POST_CONSTRUCTION_PACKAGE.serviceId,
];

export function getDeepPackagePrice(
  serviceId: number,
  propertyType: 'villa' | 'townhouse',
): number | null {
  const apt = APARTMENT_DEEP_PACKAGES.find(p => p.serviceId === serviceId);
  if (apt) return apt.price;
  const villa = VILLA_DEEP_PACKAGES.find(p => p.serviceId === serviceId);
  if (villa) {
    return propertyType === 'townhouse' && villa.townhousePrice != null
      ? villa.townhousePrice
      : villa.price;
  }
  if (serviceId === POST_CONSTRUCTION_PACKAGE.serviceId) {
    return POST_CONSTRUCTION_PACKAGE.startingPrice;
  }
  return null;
}
