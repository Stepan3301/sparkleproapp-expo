// Business-Optimized Cleaning Service Recommendation Algorithm
// Copied from web app for use in React Native mobile app

export interface RecommendationResult {
  recommended_cleaners: number;
  recommended_hours: number;
  estimated_cost: number;
  efficiency_message: string;
}

export const PROPERTY_SIZES = [
  { size: 'small', label: 'Small', details: '< 50 sqm', multiplier: 1.2 },
  { size: 'medium', label: 'Medium', details: '50–100 sqm', multiplier: 1.6 },
  { size: 'large', label: 'Large', details: '100–200 sqm', multiplier: 2.4 },
  { size: 'villa', label: 'Villa', details: '> 200 sqm', multiplier: 3.2 },
];

export const PROPERTY_SIZE_MAP: Record<string, { label: string; details: string; multiplier: number }> = {
  small:  { label: 'Small',  details: '< 50 sqm',    multiplier: 1.2 },
  medium: { label: 'Medium', details: '50–100 sqm',  multiplier: 1.6 },
  large:  { label: 'Large',  details: '100–200 sqm', multiplier: 2.4 },
  villa:  { label: 'Villa',  details: '> 200 sqm',   multiplier: 3.2 },
};

const SERVICE_COEFFICIENTS: Record<string, number> = {
  regular: 1.0, deep: 1.3, move: 1.5, office: 1.0,
  postconstruction: 1.7, kitchen: 1.2, bathroom: 1.1,
};

const BASE_HOURS: Record<string, Record<string, number>> = {
  regular:          { small: 4, medium: 6, large: 8,  villa: 12 },
  deep:             { small: 5, medium: 7, large: 10, villa: 15 },
  move:             { small: 6, medium: 8, large: 12, villa: 18 },
  office:           { small: 4, medium: 6, large: 8,  villa: 12 },
  postconstruction: { small: 7, medium: 9, large: 14, villa: 20 },
  kitchen:          { small: 3, medium: 3.5, large: 4, villa: 5 },
  bathroom:         { small: 2.5, medium: 3, large: 3.5, villa: 4 },
};

const TEAM_EFFICIENCY: Record<number, number> = { 1: 1.0, 2: 0.75, 3: 0.55, 4: 0.45 };

const HOURLY_RATES: Record<string, { with_materials: number; without_materials: number }> = {
  regular:          { with_materials: 45, without_materials: 35 },
  deep:             { with_materials: 55, without_materials: 45 },
  move:             { with_materials: 55, without_materials: 45 },
  office:           { with_materials: 45, without_materials: 35 },
  postconstruction: { with_materials: 65, without_materials: 55 },
  kitchen:          { with_materials: 55, without_materials: 45 },
  bathroom:         { with_materials: 50, without_materials: 40 },
};

export function getServiceKey(serviceName: string): string {
  const n = serviceName.toLowerCase();
  if (n.includes('regular')) return 'regular';
  if (n.includes('deep') && !n.includes('villa') && !n.includes('apartment')) return 'deep';
  if (n.includes('move')) return 'move';
  if (n.includes('office')) return 'office';
  if (n.includes('construction')) return 'postconstruction';
  if (n.includes('kitchen')) return 'kitchen';
  if (n.includes('bathroom')) return 'bathroom';
  return 'regular';
}

export function recommendCleaners(serviceType: string, propertySize: string): number {
  const serviceCoeff = SERVICE_COEFFICIENTS[serviceType] ?? 1.0;
  const sizeMultiplier = PROPERTY_SIZES.find(p => p.size === propertySize)?.multiplier ?? 1.2;
  const idx = serviceCoeff * sizeMultiplier;
  if (idx <= 1.8) return 2;
  if (idx <= 2.8) return 3;
  return 4;
}

export function recommendHours(serviceType: string, propertySize: string, cleaners: number): number {
  const baseHours = BASE_HOURS[serviceType]?.[propertySize] ?? 4;
  const efficiency = TEAM_EFFICIENCY[cleaners] ?? 1.0;
  let t = baseHours * efficiency + 0.5;
  t = Math.ceil(t * 2) / 2;
  return Math.max(2.5, Math.min(7, t));
}

export function calculateCost(serviceType: string, cleaners: number, hours: number, withMaterials: boolean): number {
  const rates = HOURLY_RATES[serviceType] ?? HOURLY_RATES.regular;
  return cleaners * hours * (withMaterials ? rates.with_materials : rates.without_materials);
}

export function getRecommendation(
  serviceType: string,
  propertySize: string,
  selectedCleaners?: number,
  selectedHours?: number,
  withMaterials = true,
): RecommendationResult {
  const recommendedCleaners = recommendCleaners(serviceType, propertySize);
  const cleanersToUse = selectedCleaners ?? recommendedCleaners;
  const recommendedHours = recommendHours(serviceType, propertySize, cleanersToUse);
  const hoursToUse = selectedHours ?? recommendedHours;
  const estimatedCost = calculateCost(serviceType, cleanersToUse, hoursToUse, withMaterials);
  const msg: Record<number, string> = {
    2: 'Optimal team size for quality and efficiency',
    3: 'Enhanced team for faster completion and superior results',
    4: 'Maximum efficiency team for comprehensive cleaning',
  };
  return {
    recommended_cleaners: recommendedCleaners,
    recommended_hours: recommendedHours,
    estimated_cost: estimatedCost,
    efficiency_message: msg[cleanersToUse] ?? '',
  };
}
