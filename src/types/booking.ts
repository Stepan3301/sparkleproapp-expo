// TypeScript types for the booking system (copied from web app)

export interface Address {
  id: number;
  user_id: string;
  street: string;
  apartment?: string;
  city: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  phone_number?: string;
  role?: 'customer' | 'admin';
  member_since?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export type PropertySize = 'small' | 'medium' | 'large' | 'villa';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Booking {
  id: number;
  customer_id: string;
  
  // Service details
  service_id?: number;
  property_size: PropertySize;
  size_price: number;
  cleaners_count: number;
  duration_hours: number; // Number of hours for the service
  own_materials: boolean;
  window_panels_count?: number; // For window cleaning services
  
  // Schedule
  service_date: string; // ISO date string
  service_time: string; // HH:MM format
  
  // Customer info
  customer_name: string;
  customer_phone: string;
  
  // Address
  address_id?: number;
  custom_address?: string;
  
  // Additional info
  additional_notes?: string;
  
  // Addons
  addons: Addon[];
  detailed_addons?: Array<{
    id: number;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    price_per_unit: number;
  }>;
  
  // Pricing
  base_price: number;
  addons_total: number;
  total_price: number;
  total_cost?: number; // Final total including VAT and cash fees
  vat_amount?: number; // VAT amount (5% of base price)
  cash_fee?: number; // Cash payment fee (5 AED if cash, 0 if other payment methods)
  
  // Status
  status: BookingStatus;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateBookingData {
  customer_id: string;
  property_size: PropertySize;
  size_price: number;
  cleaners_count: number;
  own_materials: boolean;
  service_date: string;
  service_time: string;
  customer_name: string;
  customer_phone: string;
  address_id?: number;
  custom_address?: string;
  additional_notes?: string;
  addons: Addon[];
  base_price: number;
  addons_total: number;
  total_price: number;
  status?: BookingStatus;
}

export interface BookingFormData {
  propertySize: PropertySize;
  sizePrice: number;
  cleanersCount: number;
  ownMaterials: boolean;
  selectedAddons: Addon[];
  serviceDate: string;
  serviceTime: string;
  customerName: string;
  customerPhone: string;
  selectedAddressId?: number;
  newAddress?: string;
  additionalNotes?: string;
}

// Pre-defined service options
export interface SizeOption {
  size: PropertySize;
  label: string;
  details: string;
  price: number;
}

export const SIZE_OPTIONS: SizeOption[] = [
  { size: 'small', label: 'Small', details: '< 40 sqm', price: 100 },
  { size: 'medium', label: 'Medium', details: '40-80 sqm', price: 150 },
  { size: 'large', label: 'Large', details: '80-100 sqm', price: 200 },
  { size: 'villa', label: 'Villa', details: '> 100 sqm', price: 300 },
];

export const ADDON_OPTIONS: Addon[] = [
  { id: 'windows', name: 'Window Cleaning', price: 60 },
  { id: 'carpet', name: 'Carpet Deep Clean', price: 100 },
  { id: 'oven', name: 'Oven Cleaning', price: 80 },
  { id: 'fridge', name: 'Fridge Cleaning', price: 50 },
  { id: 'balcony', name: 'Balcony/Patio', price: 90 },
  { id: 'laundry', name: 'Laundry Service', price: 40 },
];

export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', 
  '14:00', '15:00', '16:00'
];

export const TIME_SLOT_LABELS: Record<string, string> = {
  '08:00': '8:00 AM',
  '09:00': '9:00 AM',
  '10:00': '10:00 AM',
  '11:00': '11:00 AM',
  '14:00': '2:00 PM',
  '15:00': '3:00 PM',
  '16:00': '4:00 PM',
};

// Helper functions
export const formatTimeSlot = (time: string): string => {
  return TIME_SLOT_LABELS[time] || time;
};

export const calculateBookingTotal = (
  sizePrice: number,
  cleanersCount: number,
  ownMaterials: boolean,
  addons: Addon[],
  hours: number = 2 // Minimum 2 hours
): { basePrice: number; addonsTotal: number; total: number } => {
  const materialsCharge = ownMaterials ? 0 : 10 * cleanersCount;
  const basePrice = (sizePrice + materialsCharge) * cleanersCount * hours;
  const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
  const total = basePrice + addonsTotal;
  
  return { basePrice, addonsTotal, total };
};

export const getBookingStatusLabel = (status: BookingStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pending Confirmation';
    case 'confirmed':
      return 'Confirmed';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

export const getBookingStatusColor = (status: BookingStatus): { textColor: string; bgColor: string } => {
  switch (status) {
    case 'pending':
      return { textColor: '#D97706', bgColor: '#FEF3C7' };
    case 'confirmed':
      return { textColor: '#2563EB', bgColor: '#DBEAFE' };
    case 'in_progress':
      return { textColor: '#9333EA', bgColor: '#E9D5FF' };
    case 'completed':
      return { textColor: '#059669', bgColor: '#D1FAE5' };
    case 'cancelled':
      return { textColor: '#DC2626', bgColor: '#FEE2E2' };
    default:
      return { textColor: '#6B7280', bgColor: '#F3F4F6' };
  }
};
