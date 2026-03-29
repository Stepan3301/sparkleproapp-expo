import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Image,
  Modal,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import StepIndicator from '../components/ui/StepIndicator';
import {
  PROPERTY_SIZES,
  getServiceKey,
  calculateCost,
  getRecommendation,
} from '../utils/recommendationAlgorithm';

const { width } = Dimensions.get('window');
const ADDON_CARD_W = Math.floor((width - 36) / 3.2); // ~3 cards + peek visible

// ─── Addon icons (static require — one entry per addon ID from DB) ─────────────
const ADDON_ICONS: Record<string, any> = {
  '1':  require('../../assets/addon_3d_fridge_cleaning.png'),
  '2':  require('../../assets/addon_3d_oven_cleaning.png'),
  '3':  require('../../assets/addon_3d_balcony_cleaning.png'),
  '4':  require('../../assets/addon_3d_wardrobe_cleaning.png'),
  '5':  require('../../assets/addon_3d_ironing_service.png'),
  '11': require('../../assets/addon_3d_inside_oven.png'),
  '12': require('../../assets/addon_3d_inside_fridge.png'),
  '14': require('../../assets/addon_3d_inside_cabinets.png'),
  '15': require('../../assets/addon_3d_laundry_service.png'),
  '16': require('../../assets/addon_3d_window_cleaning.png'),
  '19': require('../../assets/addon_3d_sofa_single.png'),
  '20': require('../../assets/addon_3d_sofa_2seater.png'),
  '21': require('../../assets/addon_3d_sofa_3seater.png'),
  '22': require('../../assets/addon_3d_sofa_4seater_lshape.png'),
  '23': require('../../assets/addon_3d_sofa_5seater.png'),
  '24': require('../../assets/addon_3d_carpet_small.png'),
  '25': require('../../assets/addon_3d_carpet_medium.png'),
  '26': require('../../assets/addon_3d_carpet_large.png'),
  '27': require('../../assets/addon_3d_carpet_xl.png'),
  '28': require('../../assets/addon_3d_mattress_single.png'),
  '29': require('../../assets/addon_3d_mattress_double.png'),
  '30': require('../../assets/addon_3d_mattress_queen.png'),
  '31': require('../../assets/addon_3d_mattress_king.png'),
  '32': require('../../assets/addon_3d_curtain_small.png'),
  '33': require('../../assets/addon_3d_curtain_medium.png'),
  '34': require('../../assets/addon_3d_curtain_large.png'),
  '35': require('../../assets/addon_3d_curtain_xl.png'),
  '36': require('../../assets/addon_3d_pillows.png'),
};

// ─── Addon categories ──────────────────────────────────────────────────────────
const ADDON_CATEGORIES_CONFIG = [
  { key: 'cleaning',  label: 'Cleaning',  ids: ['1','2','3','4','5','11','12','14','15','16'] },
  { key: 'sofa',      label: 'Sofa',      ids: ['19','20','21','22','23'] },
  { key: 'carpet',    label: 'Carpet',    ids: ['24','25','26','27'] },
  { key: 'mattress',  label: 'Mattress',  ids: ['28','29','30','31'] },
  { key: 'curtains',  label: 'Curtains',  ids: ['32','33','34','35'] },
  { key: 'pillows',   label: 'Pillows',   ids: ['36'] },
] as const;

// ─── Constants ─────────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00',
];
const TIME_LABELS: Record<string, string> = {
  '08:00': '8:00 AM',  '09:00': '9:00 AM',  '10:00': '10:00 AM', '11:00': '11:00 AM',
  '12:00': '12:00 PM', '13:00': '1:00 PM',  '14:00': '2:00 PM',  '15:00': '3:00 PM',
  '16:00': '4:00 PM',  '17:00': '5:00 PM',  '18:00': '6:00 PM',  '19:00': '7:00 PM',
  '20:00': '8:00 PM',
};

const SERVICE_CATEGORY_IMAGES: Record<string, any> = {
  regular:     require('../../assets/icon_regular_cleaning.png'),
  deep:        require('../../assets/icon_deep_cleaning.png'),
  packages:    require('../../assets/icon_complete_packages.png'),
  specialized: require('../../assets/icon_window_cleaning.png'),
};

const SERVICE_CATEGORIES = [
  { key: 'regular',     title: 'Regular Cleaning',    shortTitle: 'Regular',   price: 'From 35 AED',  serviceIds: [6, 7] },
  { key: 'deep',        title: 'Deep Cleaning',        shortTitle: 'Deep',      price: 'From 45 AED',  serviceIds: [8, 9] },
  { key: 'packages',    title: 'Complete Packages',    shortTitle: 'Packages',  price: 'From 299 AED', serviceIds: [10, 11, 12, 13, 14, 15, 16] },
  { key: 'specialized', title: 'Specialized Services', shortTitle: 'Windows',   price: 'From 20 AED',  serviceIds: [17, 18, 19] },
];

// ─── Package service metadata (icons, banners, inclusions, timing) ──────────────
interface PackageMeta {
  icon: any;
  banner: any;
  richDescription: string;
  inclusions: string[];
  hoursMin: number;
  hoursMax: number;
  cleaners: number;
  isPopular?: boolean;
}

const PACKAGE_SERVICE_ASSETS: Record<number, PackageMeta> = {
  // 10: Full Villa Deep Cleaning
  10: {
    icon: require('../../assets/icon_full_villa_deep_cleaning.png'),
    banner: require('../../assets/banner_full_villa.jpg'),
    richDescription: 'A comprehensive deep clean for your entire villa, ensuring every corner is spotless and sanitized. Perfect for moving in/out or a thorough seasonal refresh.',
    inclusions: [
      'All rooms vacuumed and mopped',
      'Kitchen surfaces deep cleaned',
      'Bathrooms fully sanitized',
      'Windows wiped inside',
      'Furniture dusted and polished',
      'Skirting boards and light switches',
    ],
    hoursMin: 4, hoursMax: 6, cleaners: 2, isPopular: true,
  },
  // 11: Full Apartment Deep Cleaning
  11: {
    icon: require('../../assets/icon_full_apartment.png'),
    banner: require('../../assets/banner_full_apartment.jpg'),
    richDescription: 'Thorough deep cleaning for apartments of all sizes, focusing on detail and hygiene in every room.',
    inclusions: [
      'All rooms vacuumed and mopped',
      'Kitchen appliances & surfaces',
      'Bathrooms sanitized',
      'Windows wiped inside',
      'Furniture dusted',
      'Balcony swept and mopped',
    ],
    hoursMin: 2, hoursMax: 4, cleaners: 1,
  },
  // 12: Villa Façade Cleaning
  12: {
    icon: require('../../assets/icon_villa_facade.png'),
    banner: require('../../assets/banner_villa_facade.jpg'),
    richDescription: 'Professional exterior façade cleaning to restore the pristine look of your villa. Removes dust, algae, and stains from all exterior surfaces.',
    inclusions: [
      'Exterior walls pressure washed',
      'Ground-floor windows exterior',
      'Entrance area deep cleaned',
      'Driveway and pathway swept',
      'Garden fixtures wiped',
    ],
    hoursMin: 3, hoursMax: 5, cleaners: 2,
  },
  // 13: Move in/Move out
  13: {
    icon: require('../../assets/icon_move_in_out.png'),
    banner: require('../../assets/banner_move_in_out.jpg'),
    richDescription: 'Specialized cleaning for moving in or out, ensuring a completely fresh start. Every surface is treated so the next chapter begins spotlessly.',
    inclusions: [
      'Complete property sanitization',
      'Deep clean all rooms',
      'Kitchen & appliances inside-out',
      'Bathrooms deep cleaned',
      'Walls spot-cleaned',
      'Wardrobes and cabinets inside',
    ],
    hoursMin: 4, hoursMax: 8, cleaners: 2,
  },
  // 14: Post-construction Cleaning
  14: {
    icon: require('../../assets/icon_post_construction_final.png'),
    banner: require('../../assets/banner_post_construction.jpg'),
    richDescription: 'Intensive cleaning to remove dust, debris, and residue after renovation or construction work. Leaves your property move-in ready.',
    inclusions: [
      'Construction dust fully removed',
      'Floors deep cleaned & polished',
      'Walls and surfaces wiped',
      'Windows inside and out',
      'Fixtures and fittings cleaned',
      'Debris disposal arranged',
    ],
    hoursMin: 5, hoursMax: 8, cleaners: 2,
  },
  // 15: Kitchen Deep Cleaning
  15: {
    icon: require('../../assets/icon_kitchen_cleaning.png'),
    banner: require('../../assets/banner_kitchen.jpg'),
    richDescription: 'Focused deep cleaning of the entire kitchen area, including all appliances, cabinets, and surfaces to a hygienically clean standard.',
    inclusions: [
      'Oven & stovetop deep cleaned',
      'Refrigerator inside & outside',
      'Cabinets degreased inside-out',
      'Countertops sanitized',
      'Sink and fixtures scrubbed',
      'Floor deep mopped',
    ],
    hoursMin: 2, hoursMax: 3, cleaners: 1,
  },
  // 16: Bathroom Deep Cleaning
  16: {
    icon: require('../../assets/icon_bathroom_deep_cleaning.png'),
    banner: require('../../assets/banner_bathroom.jpg'),
    richDescription: 'Complete deep cleaning of bathrooms including tiles, grout, fixtures, and all surfaces. Sanitized to the highest hygiene standards.',
    inclusions: [
      'Tiles scrubbed and sanitized',
      'Grout deep cleaned',
      'Shower/bath descaled',
      'Toilet fully sanitized',
      'Mirror and fixtures polished',
      'Floor deep mopped',
    ],
    hoursMin: 1, hoursMax: 2, cleaners: 1,
  },
};

const isWindowService = (id?: number) => id ? [17, 18, 19].includes(id) : false;
const requiresPanels = (id?: number) => id ? [17, 18].includes(id) : false;

// ─── Types ──────────────────────────────────────────────────────────────────────
interface ServiceType { id: number; name: string; description: string; base_price: number; price_per_hour: number | null; is_active: boolean; }
interface AddonType { id: string; name: string; price: number; description?: string; }
interface Address { id: number; street: string; city: string; is_default: boolean; }

// ─── Selection Chip ─────────────────────────────────────────────────────────────
const Chip = ({ label, selected, onPress, recommended }: { label: string; selected: boolean; onPress: () => void; recommended?: boolean }) => (
  <TouchableOpacity onPress={onPress} style={[chipStyles.chip, selected && chipStyles.selected]} activeOpacity={0.75}>
    {recommended && <View style={chipStyles.badge}><Text style={chipStyles.badgeText}>Best</Text></View>}
    <Text style={[chipStyles.text, selected && chipStyles.textSelected]}>{label}</Text>
  </TouchableOpacity>
);
const chipStyles = StyleSheet.create({
  chip: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', position: 'relative', minWidth: 72 },
  selected: { borderColor: 'rgba(59,130,246,0.70)', backgroundColor: 'rgba(37,99,235,0.25)' },
  text: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  textSelected: { color: '#93C5FD' },
  badge: { position: 'absolute', top: -8, alignSelf: 'center', backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
});

// ─── Section Header ──────────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 15, fontWeight: '700', color: '#F1F5F9' }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{subtitle}</Text>}
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────────
interface BookingScreenProps { navigation: any; route?: any; }

const BookingScreen: React.FC<BookingScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, isGuest, profile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const weekStripRef = useRef<ScrollView>(null);
  const successAnim = useRef(new Animated.Value(0)).current;

  // ── Transition animation (slide + fade between steps)
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  // ── Core step state
  const [currentStep, setCurrentStep] = useState(1);

  // ── Step 1: Service Category + Sub-service
  const [services, setServices] = useState<ServiceType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    route?.params?.service ? 'regular' : null
  );
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);

  // ── Step 2: Configuration
  const [addons, setAddons] = useState<AddonType[]>([]);
  const [selectedPropertySize, setSelectedPropertySize] = useState<string | null>(null);
  const [selectedCleaners, setSelectedCleaners] = useState<number | null>(null);
  const [selectedHours, setSelectedHours] = useState<number | null>(null);
  const [ownMaterials, setOwnMaterials] = useState(false);
  const [windowPanels, setWindowPanels] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<AddonType[]>([]);

  // ── Step 3: Schedule
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState<Date>((() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })());

  // ── Step 4: Contact + Address
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newAddressFloor, setNewAddressFloor] = useState('');
  const [newAddressApt, setNewAddressApt] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // ── UI
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // ── Step 3: Availability ─────────────────────────────────────────────────────
  const [availabilitySlots, setAvailabilitySlots] = useState<{ hour: number; label: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ── Addon carousel ────────────────────────────────────────────────────────────
  const [addonCategory, setAddonCategory] = useState<string>('cleaning');
  const addonCarouselRef = useRef<FlatList<AddonType>>(null);
  // Mirror state into ref so scroll handler doesn't capture stale closure
  const addonCategoryRef = useRef('cleaning');
  useEffect(() => { addonCategoryRef.current = addonCategory; }, [addonCategory]);

  // All addons in category order for the single continuous carousel
  const allAddonsOrdered = useMemo(
    () => ADDON_CATEGORIES_CONFIG.flatMap(cat =>
      addons.filter(a => (cat.ids as readonly string[]).includes(a.id))
    ),
    [addons]
  );

  // Index where each category starts in allAddonsOrdered
  const categoryFirstIndices = useMemo(() => {
    const result: Record<string, number> = {};
    let idx = 0;
    for (const cat of ADDON_CATEGORIES_CONFIG) {
      result[cat.key] = idx;
      idx += addons.filter(a => (cat.ids as readonly string[]).includes(a.id)).length;
    }
    return result;
  }, [addons]);

  // [from, to] index ranges per category (for O(1) scroll detection)
  const categoryRanges = useMemo(() =>
    ADDON_CATEGORIES_CONFIG.map(cat => {
      const from = categoryFirstIndices[cat.key] ?? 0;
      const count = addons.filter(a => (cat.ids as readonly string[]).includes(a.id)).length;
      return { key: cat.key, from, to: from + count - 1 };
    }),
    [categoryFirstIndices, addons]
  );

  // Jump the carousel to a category (tap on tab or dot)
  const scrollToAddonCategory = useCallback((key: string) => {
    setAddonCategory(key);
    const idx = categoryFirstIndices[key] ?? 0;
    if (idx < allAddonsOrdered.length) {
      // viewOffset: 18 keeps 18 px of left padding visible
      addonCarouselRef.current?.scrollToIndex({ index: idx, animated: true, viewOffset: 18 });
    }
  }, [categoryFirstIndices, allAddonsOrdered]);

  // Update active tab while user scrolls manually
  const handleCarouselScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const step = ADDON_CARD_W + 12;
    // Which item index is centred at the LEFT edge of the viewport?
    const visibleIdx = Math.max(0, Math.round((x - 18 + step * 0.35) / step));
    for (const range of categoryRanges) {
      if (visibleIdx <= range.to) {
        if (addonCategoryRef.current !== range.key) setAddonCategory(range.key);
        break;
      }
    }
  }, [categoryRanges]);

  // ── Step 3 calendar view state
  const [calViewYear,  setCalViewYear]  = useState(() => new Date().getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(() => new Date().getMonth()); // 0-11

  // ── Package detail bottom sheet
  const [packageModalVisible, setPackageModalVisible] = useState(false);
  const [packageModalService, setPackageModalService] = useState<ServiceType | null>(null);
  const SCREEN_H = Dimensions.get('window').height;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_H)).current;
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) sheetTranslateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 90 || gs.vy > 0.55) {
          // swipe down fast enough → dismiss
          Animated.timing(sheetTranslateY, {
            toValue: SCREEN_H,
            duration: 280,
            useNativeDriver: true,
          }).start(() => {
            setPackageModalVisible(false);
            setPackageModalService(null);
          });
        } else {
          // snap back to open position
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  // ─── Reset all booking state back to step 1 ──────────────────────────────────
  const resetBooking = useCallback(() => {
    setCurrentStep(1);
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedPropertySize(null);
    setSelectedCleaners(null);
    setSelectedHours(null);
    setOwnMaterials(false);
    setWindowPanels(1);
    setSelectedAddons([]);
    setServiceDate('');
    setServiceTime('');
    setShowDatePicker(false);
    setDateObj(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; });
    setSelectedAddressId(null);
    setUseNewAddress(false);
    setNewAddress('');
    setNewAddressFloor('');
    setNewAddressApt('');
    setAdditionalNotes('');
    setPaymentMethod('cash');
    setBookingId(null);
    setAddonCategory('cleaning');
    setAvailabilitySlots([]);
    setLoadingSlots(false);
    const now = new Date();
    setCalViewYear(now.getFullYear());
    setCalViewMonth(now.getMonth());
    successAnim.setValue(0);
    slideAnim.setValue(0);
    fadeAnim.setValue(1);
  }, [successAnim, slideAnim, fadeAnim]);

  // ─── When the tab regains focus, reset if we were on the success screen ───────
  useFocusEffect(
    useCallback(() => {
      // currentStep is captured in closure; run reset only after leaving step 5
      return () => {
        // This runs when screen loses focus — if booking just finished, clean up
        if (currentStep === 5) {
          setTimeout(resetBooking, 300);
        }
      };
    }, [currentStep, resetBooking])
  );

  // ─── Load initial data ────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([fetchServices(), fetchAddons(), user ? fetchAddresses() : Promise.resolve()]);
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name, phone_number').eq('id', user.id).single();
        if (data) {
          setCustomerName(data.full_name || user.user_metadata?.full_name || '');
          setCustomerPhone(data.phone_number || user.phone || '');
        }
      }
    } finally {
      setDataLoading(false);
    }
  };

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('id,name,description,base_price,price_per_hour,is_active').eq('is_active', true).order('id');
    if (!error && data) setServices(data);
  };

  const fetchAddons = async () => {
    const { data, error } = await supabase.from('additional_services').select('id,name,price,description').eq('is_active', true).order('id');
    if (!error && data) setAddons(data.map(a => ({ ...a, id: a.id.toString(), price: parseFloat(a.price) })));
  };

  const fetchAddresses = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('addresses').select('id,street,city,is_default').eq('user_id', user.id).order('is_default', { ascending: false });
    if (!error && data) {
      setAddresses(data);
      const def = data.find(a => a.is_default);
      if (def) setSelectedAddressId(def.id);
    }
  };

  // ─── Scroll to top when step changes ─────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentStep]);

  // ─── Auto-select service when category selected ───────────────────────────────
  useEffect(() => {
    if (!selectedCategory || services.length === 0) return;
    if (selectedCategory === 'regular') {
      setSelectedService(services.find(s => s.id === 6) ?? null);
    } else if (selectedCategory === 'deep') {
      setSelectedService(services.find(s => s.id === 8) ?? null);
    }
    // For packages/specialized user picks manually
  }, [selectedCategory, services]);

  // ─── Deep-link from HomeScreen: jump straight to Step 2 with a package ───────
  useEffect(() => {
    const serviceId: number | undefined = route?.params?.serviceId;
    const goToStep2: boolean | undefined = route?.params?.goToStep2;
    if (!serviceId || !goToStep2 || services.length === 0) return;
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    setSelectedService(svc);
    setSelectedCategory('packages');
    setCurrentStep(2);
    // Clear the params so navigating back and returning doesn't re-trigger
    navigation.setParams({ serviceId: undefined, goToStep2: undefined });
  }, [services, route?.params?.serviceId, route?.params?.goToStep2]);

  // ─── Pricing ──────────────────────────────────────────────────────────────────
  const calcPricing = () => {
    if (!selectedService) return { base: 0, addonsTotal: 0, subtotal: 0, vat: 0, cashFee: 0, total: 0 };
    const addonsTotal = Math.round(selectedAddons.reduce((s, a) => s + a.price, 0));
    let base = 0;

    if (isWindowService(selectedService.id)) {
      if (selectedService.id === 19) base = Math.round(Number(selectedService.base_price));
      else base = Math.round(windowPanels * Number(selectedService.base_price));
    } else if (!selectedService.price_per_hour || selectedCategory === 'packages') {
      base = Math.round(Number(selectedService.base_price));
    } else if (selectedPropertySize && selectedCleaners && selectedHours) {
      const key = getServiceKey(selectedService.name);
      base = Math.round(calculateCost(key, selectedCleaners, selectedHours, !ownMaterials));
    }
    const subtotal = base + addonsTotal;
    const vat = Math.round(subtotal * 0.05);
    const cashFee = paymentMethod === 'cash' ? 5 : 0;
    return { base, addonsTotal, subtotal, vat, cashFee, total: subtotal + vat + cashFee };
  };

  // ─── Animated step transition ────────────────────────────────────────────────
  const animateStepChange = (newStep: number) => {
    const direction = newStep > currentStep ? 1 : -1;
    const SLIDE = width * 0.18;           // how far the slide travels (px)
    const OUT_MS = 190;                   // exit duration
    const IN_MS  = 240;                   // enter duration

    // Phase 1 — slide out + fade out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SLIDE * direction,
        duration: OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: OUT_MS,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch step while invisible
      setCurrentStep(newStep);
      // Position the new content on the entry side
      slideAnim.setValue(SLIDE * direction);

      // Phase 2 — slide in + fade in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: IN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: IN_MS,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // ─── Step navigation ──────────────────────────────────────────────────────────
  const canGoNext = (): { ok: boolean; msg?: string } => {
    if (currentStep === 1) {
      if (!selectedCategory) return { ok: false, msg: 'Please select a service category' };
      if ((selectedCategory === 'packages' || selectedCategory === 'specialized') && !selectedService)
        return { ok: false, msg: 'Please select a specific service' };
      return { ok: true };
    }
    if (currentStep === 2) {
      if (!selectedService) return { ok: false, msg: 'Please select a service first' };
      if (isWindowService(selectedService.id)) {
        if (requiresPanels(selectedService.id) && windowPanels < 1) return { ok: false, msg: 'Please enter number of panels' };
      } else if (selectedService.price_per_hour && selectedCategory !== 'packages') {
        if (!selectedPropertySize) return { ok: false, msg: 'Please select property size' };
        if (!selectedCleaners) return { ok: false, msg: 'Please select number of cleaners' };
        if (!selectedHours) return { ok: false, msg: 'Please select number of hours' };
      }
      return { ok: true };
    }
    if (currentStep === 3) {
      if (isGuest && !user) {
        Alert.alert('Sign Up Required', 'Please create an account to complete your booking.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => navigation.getParent()?.navigate('Auth') },
        ]);
        return { ok: false };
      }
      if (!serviceDate) return { ok: false, msg: 'Please select a date' };
      if (!serviceTime) return { ok: false, msg: 'Please select a time slot' };
      return { ok: true };
    }
    if (currentStep === 4) {
      if (!customerName.trim()) return { ok: false, msg: 'Please enter your name' };
      if (!customerPhone.trim()) return { ok: false, msg: 'Please enter your phone number' };
      if (!useNewAddress && !selectedAddressId) return { ok: false, msg: 'Please select or add an address' };
      if (useNewAddress && !newAddress.trim()) return { ok: false, msg: 'Please enter your address' };
      return { ok: true };
    }
    return { ok: true };
  };

  const goNext = () => {
    const { ok, msg } = canGoNext();
    if (!ok) { if (msg) Alert.alert('Missing Info', msg); return; }
    if (currentStep === 4) { submitBooking(); return; }
    animateStepChange(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep === 1) { navigation.navigate('Home'); return; }
    animateStepChange(currentStep - 1);
  };

  // ─── Submit booking ────────────────────────────────────────────────────────────
  const submitBooking = async () => {
    if (!user || !selectedService) return;
    setLoading(true);
    try {
      const pricing = calcPricing();
      const cleaners = selectedCleaners ?? 1;
      const hours = selectedHours ?? 1;
      const duration = getBookingDuration();

      const bookingData: Record<string, any> = {
        customer_id: user.id,
        service_id: selectedService.id,
        address_id: useNewAddress ? null : selectedAddressId,
        custom_address: useNewAddress ? `${newAddress}${newAddressFloor ? ` Fl ${newAddressFloor}` : ''}${newAddressApt ? ` Apt ${newAddressApt}` : ''}` : null,
        requested_date: serviceDate,
        requested_time: serviceTime,
        service_date: serviceDate,
        service_time: serviceTime,
        duration_hours: duration,
        property_size: isWindowService(selectedService.id) ? null : (selectedPropertySize || null),
        size_price: null,
        cleaners_count: isWindowService(selectedService.id) ? 1 : cleaners,
        own_materials: ownMaterials,
        window_panels_count: requiresPanels(selectedService.id) ? windowPanels : null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        additional_notes: additionalNotes.trim() || null,
        special_instructions: additionalNotes.trim() || null,
        base_price: pricing.base,
        addons_total: pricing.addonsTotal,
        total_price: pricing.subtotal,
        vat_amount: pricing.vat,
        cash_fee: pricing.cashFee,
        total_cost: pricing.total,
        status: 'pending',   // will be updated to 'confirmed' by the RPC
      };

      // ── Step A: Insert the booking (pending) ──────────────────────────────
      const { data: insertData, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();
      if (insertError) { Alert.alert('Booking Failed', insertError.message); return; }

      const newBookingId = insertData?.[0]?.id;
      if (!newBookingId) { Alert.alert('Booking Failed', 'No booking ID returned.'); return; }

      // ── Step B: Insert addons ─────────────────────────────────────────────
      if (selectedAddons.length > 0) {
        const addonRows = selectedAddons.map(a => ({
          booking_id: newBookingId,
          additional_service_id: parseInt(a.id),
          quantity: 1,
          unit_price: Math.round(a.price),
          total_price: Math.round(a.price),
        }));
        await supabase.from('booking_additional_services').insert(addonRows);
      }

      // ── Step C: Atomically assign a free team and confirm ─────────────────
      const { error: assignError } = await supabase.rpc('assign_free_team', {
        p_booking_id:     newBookingId,
        p_service_date:   serviceDate,
        p_service_time:   serviceTime,
        p_duration_hours: duration,
      });

      if (assignError) {
        // NO_TEAMS_AVAILABLE: the RPC already deleted the pending booking
        if (assignError.message?.includes('NO_TEAMS_AVAILABLE')) {
          Alert.alert(
            '⏰ Time Slot Taken',
            'Someone just booked this slot. Please go back and pick a different time.',
            [{ text: 'Choose Another Time', onPress: () => animateStepChange(3) }]
          );
          return;
        }
        // Any other error — roll back addons too
        await supabase.from('booking_additional_services').delete().eq('booking_id', newBookingId);
        await supabase.from('bookings').delete().eq('id', newBookingId);
        Alert.alert('Booking Failed', assignError.message);
        return;
      }

      setBookingId(newBookingId);
      animateStepChange(5);

      // Animate success
      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }).start();

      // Navigate to history after 3 seconds, then reset the booking form
      setTimeout(() => {
        navigation.navigate('History');
        // Reset after a short delay so the transition finishes before the screen clears
        setTimeout(resetBooking, 400);
      }, 3000);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Addons toggle ─────────────────────────────────────────────────────────────
  const toggleAddon = (addon: AddonType) => {
    setSelectedAddons(prev =>
      prev.some(a => a.id === addon.id) ? prev.filter(a => a.id !== addon.id) : [...prev, addon]
    );
  };

  // ─── Date handling ─────────────────────────────────────────────────────────────
  const onDateChange = (_: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setDateObj(date);
      const iso = date.toISOString().split('T')[0];
      setServiceDate(iso);
    }
  };

  const formatDisplayDate = (iso: string) => {
    if (!iso) return 'Select date';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ─── Booking duration helper (used for both availability check & submission) ──
  const getBookingDuration = (): number => {
    if (!selectedService) return 2;
    if (isWindowService(selectedService.id)) return 1;
    if (selectedHours) return selectedHours;
    // Package service — use hoursMax from metadata
    const meta = PACKAGE_SERVICE_ASSETS[selectedService.id];
    if (meta) return meta.hoursMax;
    return 3;
  };

  // ─── Pricing summary helper ────────────────────────────────────────────────────
  const pricing = calcPricing();

  // ─── Package bottom sheet controls ───────────────────────────────────────────
  const openPackageModal = (svc: ServiceType) => {
    setPackageModalService(svc);
    sheetTranslateY.setValue(SCREEN_H);
    setPackageModalVisible(true);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  };

  const closePackageModal = () => {
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_H,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPackageModalVisible(false);
      setPackageModalService(null);
    });
  };

  const handleAddToBooking = (svc: ServiceType) => {
    setSelectedService(svc);
    closePackageModal();
    // Let the modal animate out before triggering step transition
    setTimeout(() => animateStepChange(2), 320);
  };

  // ─── Materials toggle for regular/deep ────────────────────────────────────────
  const handleMaterials = (own: boolean) => {
    setOwnMaterials(own);
    if (selectedCategory === 'regular') setSelectedService(services.find(s => s.id === (own ? 6 : 7)) ?? null);
    else if (selectedCategory === 'deep') setSelectedService(services.find(s => s.id === (own ? 8 : 9)) ?? null);
  };

  // ─── Package detail bottom sheet ──────────────────────────────────────────────
  const renderPackageModal = () => {
    const meta = packageModalService ? PACKAGE_SERVICE_ASSETS[packageModalService.id] : null;
    if (!packageModalVisible || !packageModalService || !meta) return null;

    return (
      <Modal
        transparent
        animationType="none"
        visible={packageModalVisible}
        onRequestClose={closePackageModal}
        statusBarTranslucent
      >
        {/* Dimmed backdrop — tap anywhere outside sheet to close */}
        <TouchableOpacity
          style={bs.backdrop}
          activeOpacity={1}
          onPress={closePackageModal}
        />

        {/* Sliding sheet */}
        <Animated.View
          style={[bs.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
        >
          {/* Drag handle area */}
          <View {...sheetPanResponder.panHandlers} style={bs.handleArea}>
            <View style={bs.handle} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingBottom: 36 }}
          >
            {/* Banner image with rounded corners */}
            <Image
              source={meta.banner}
              style={bs.bannerImage}
              resizeMode="cover"
            />

            <View style={bs.content}>
              {/* Popular badge */}
              {meta.isPopular && (
                <View style={bs.popularPill}>
                  <Text style={bs.popularPillText}>⭐ Popular</Text>
                </View>
              )}

              {/* Service name */}
              <Text style={bs.serviceName}>{packageModalService.name}</Text>

              {/* Rich description */}
              <Text style={bs.serviceDesc}>{meta.richDescription}</Text>

              {/* What's included */}
              <Text style={bs.inclTitle}>What is included:</Text>
              {meta.inclusions.map((item, i) => (
                <View key={i} style={bs.inclRow}>
                  <View style={bs.checkCircle}>
                    <Text style={bs.checkMark}>✓</Text>
                  </View>
                  <Text style={bs.inclText}>{item}</Text>
                </View>
              ))}

              {/* Info badges row */}
              <View style={bs.badgesRow}>
                <View style={bs.infoBadge}>
                  <Text style={bs.infoBadgeText}>⏱  {meta.hoursMin}–{meta.hoursMax} hours</Text>
                </View>
                <View style={bs.infoBadge}>
                  <Text style={bs.infoBadgeText}>
                    👷  {meta.cleaners} cleaner{meta.cleaners > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* CTA button */}
              <TouchableOpacity
                onPress={() => handleAddToBooking(packageModalService)}
                activeOpacity={0.88}
                style={{ borderRadius: 16, overflow: 'hidden', marginTop: 24 }}
              >
                <LinearGradient
                  colors={['#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={bs.addBtn}
                >
                  <Text style={bs.addBtnText}>
                    Add to Booking — {Math.round(Number(packageModalService.base_price))} AED
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  // ─── Render steps ─────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View>
      {!selectedCategory ? (
        /* ── Main category selection grid ── */
        <>
          <SectionHeader title="Select Your Service" subtitle="Choose from our professional cleaning services" />
          <View style={s.grid2}>
            {SERVICE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={s.categoryCard}
                onPress={() => {
                  setSelectedCategory(cat.key);
                  setSelectedService(null);
                  setSelectedPropertySize(null);
                  setSelectedCleaners(null);
                  setSelectedHours(null);
                }}
                activeOpacity={0.75}
              >
                <Image source={SERVICE_CATEGORY_IMAGES[cat.key]} style={s.categoryImage} resizeMode="contain" />
                <Text style={s.categoryTitle}>{cat.title}</Text>
                <Text style={s.categoryPrice}>{cat.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        /* ── Sub-category view ── */
        <View>
          {/* Horizontal filter tabs — lets user switch between categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.filterScroll}
            contentContainerStyle={s.filterScrollContent}
          >
            {SERVICE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                onPress={() => {
                  setSelectedCategory(cat.key);
                  setSelectedService(null);
                  setSelectedPropertySize(null);
                  setSelectedCleaners(null);
                  setSelectedHours(null);
                }}
                style={[s.filterTab, selectedCategory === cat.key && s.filterTabActive]}
                activeOpacity={0.7}
              >
                <Text style={[s.filterTabText, selectedCategory === cat.key && s.filterTabTextActive]}>
                  {cat.shortTitle}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Packages: 2-column icon grid ── */}
          {selectedCategory === 'packages' && (
            <>
              <Text style={[s.sectionLabel, { marginBottom: 12 }]}>Choose Specific Service</Text>
              <View style={s.packageGrid}>
                {services
                  .filter(svc => SERVICE_CATEGORIES.find(c => c.key === 'packages')?.serviceIds.includes(svc.id))
                  .map(svc => {
                    const meta = PACKAGE_SERVICE_ASSETS[svc.id];
                    return (
                      <TouchableOpacity
                        key={svc.id}
                        style={s.pkgCard}
                        onPress={() => openPackageModal(svc)}
                        activeOpacity={0.78}
                      >
                        {meta?.isPopular && (
                          <View style={s.pkgPopular}>
                            <Text style={s.pkgPopularText}>Popular</Text>
                          </View>
                        )}
                        <View style={s.pkgIconWrap}>
                          <Image
                            source={meta?.icon}
                            style={s.pkgIcon}
                            resizeMode="contain"
                          />
                        </View>
                        <Text style={s.pkgName} numberOfLines={2}>{svc.name}</Text>
                        <Text style={s.pkgPrice}>{Math.round(Number(svc.base_price))} AED</Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </>
          )}

          {/* ── Specialized (windows): list view unchanged ── */}
          {selectedCategory === 'specialized' && (
            <View>
              <Text style={[s.sectionLabel, { marginBottom: 10 }]}>Choose Specific Service</Text>
              {services
                .filter(svc => SERVICE_CATEGORIES.find(c => c.key === 'specialized')?.serviceIds.includes(svc.id))
                .map(svc => (
                  <TouchableOpacity
                    key={svc.id}
                    style={[s.serviceRow, selectedService?.id === svc.id && s.serviceRowSelected]}
                    onPress={() => setSelectedService(svc)}
                    activeOpacity={0.75}
                  >
                    <View style={s.serviceRowInfo}>
                      <Text style={s.serviceRowName}>{svc.name}</Text>
                      <Text style={s.serviceRowDesc} numberOfLines={2}>{svc.description}</Text>
                      <Text style={s.serviceRowPrice}>
                        {svc.price_per_hour ? `${svc.base_price} AED base + ${svc.price_per_hour}/hr` : `${svc.base_price} AED`}
                      </Text>
                    </View>
                    <View style={[s.radio, selectedService?.id === svc.id && s.radioSelected]}>
                      {selectedService?.id === svc.id && <View style={s.radioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* ── Regular / Deep: auto-selected confirmation ── */}
          {(selectedCategory === 'regular' || selectedCategory === 'deep') && selectedService && (
            <>
              <LinearGradient colors={['rgba(37,99,235,0.18)', 'rgba(59,130,246,0.10)']} style={s.categoryBanner}>
                <Image
                  source={SERVICE_CATEGORY_IMAGES[selectedCategory]}
                  style={s.categoryBannerImage}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.categoryBannerTitle}>{SERVICE_CATEGORIES.find(c => c.key === selectedCategory)?.title}</Text>
                  <Text style={s.categoryBannerSubtitle}>{SERVICE_CATEGORIES.find(c => c.key === selectedCategory)?.price}</Text>
                </View>
              </LinearGradient>
              <View style={s.selectedServiceBanner}>
                <Text style={s.selectedServiceText}>✅ {selectedService.name} selected</Text>
                <Text style={s.selectedServiceHint}>Configure details in the next step</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Package detail bottom sheet (rendered here so it can overlay the whole booking) */}
      {renderPackageModal()}
    </View>
  );

  const renderStep2 = () => {
    if (!selectedService) return <View><Text style={s.emptyText}>Go back and select a service first.</Text></View>;
    const isHourly = !!selectedService.price_per_hour && selectedCategory !== 'packages';
    const isWindow = isWindowService(selectedService.id);
    const needsPanels = requiresPanels(selectedService.id);

    return (
      <View>
        <SectionHeader title="Configure Your Service" subtitle="Choose your preferences and add-ons" />

        {/* Window panels */}
        {isWindow && needsPanels && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>🪟 Number of Window Panels</Text>
            <View style={s.counterRow}>
              <TouchableOpacity style={s.counterBtn} onPress={() => setWindowPanels(Math.max(1, windowPanels - 1))}><Text style={s.counterBtnText}>−</Text></TouchableOpacity>
              <Text style={s.counterVal}>{windowPanels}</Text>
              <TouchableOpacity style={s.counterBtn} onPress={() => setWindowPanels(Math.min(100, windowPanels + 1))}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
            </View>
            <View style={s.infoBox}>
              <Text style={s.infoBoxText}>{windowPanels} panel{windowPanels !== 1 ? 's' : ''} × {selectedService.base_price} AED = {windowPanels * Number(selectedService.base_price)} AED</Text>
            </View>
          </View>
        )}

        {/* Property size */}
        {!isWindow && isHourly && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>🏠 Property Size</Text>
            <View style={s.grid2}>
              {PROPERTY_SIZES.map(opt => (
                <TouchableOpacity
                  key={opt.size}
                  style={[s.sizeCard, selectedPropertySize === opt.size && s.sizeCardSelected]}
                  onPress={() => { setSelectedPropertySize(opt.size); setSelectedCleaners(null); setSelectedHours(null); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.sizeLabel, selectedPropertySize === opt.size && s.sizeLabelSelected]}>{opt.label}</Text>
                  <Text style={[s.sizeDetail, selectedPropertySize === opt.size && s.sizeDetailSelected]}>{opt.details}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Materials */}
        {selectedService && (
          (!isWindow && (isHourly ? !!selectedPropertySize : true)) ||
          (isWindow && (selectedService.id === 19 || (needsPanels && windowPanels > 0)))
        ) && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>🧴 Cleaning Materials</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleOption, !ownMaterials && s.toggleOptionSelected]}
                onPress={() => handleMaterials(false)}
                activeOpacity={0.75}
              >
                <Text style={[s.toggleText, !ownMaterials && s.toggleTextSelected]}>Cleaners Provide</Text>
                <Text style={[s.toggleHint, !ownMaterials && s.toggleHintSelected]}>Professional supplies</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleOption, ownMaterials && s.toggleOptionSelected]}
                onPress={() => handleMaterials(true)}
                activeOpacity={0.75}
              >
                <Text style={[s.toggleText, ownMaterials && s.toggleTextSelected]}>Use Own Materials</Text>
                <Text style={[s.toggleHint, ownMaterials && s.toggleHintSelected]}>Lower cost option</Text>
              </TouchableOpacity>
            </View>
            <View style={s.ecoNote}>
              <Text style={s.ecoNoteText}>🌿 Our materials are powered by TCL eco-friendly supplies</Text>
            </View>
          </View>
        )}

        {/* Cleaners */}
        {!isWindow && isHourly && !!selectedPropertySize && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>👷 Number of Cleaners</Text>
            <View style={s.chipRow}>
              {[1, 2, 3, 4].map(n => {
                const rec = getRecommendation(getServiceKey(selectedService.name), selectedPropertySize!).recommended_cleaners;
                return (
                  <Chip
                    key={n}
                    label={`${n} ${n === 1 ? 'cleaner' : 'cleaners'}`}
                    selected={selectedCleaners === n}
                    recommended={n === rec}
                    onPress={() => { setSelectedCleaners(n); setSelectedHours(null); }}
                  />
                );
              })}
            </View>
            {selectedCleaners && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxText}>
                  💡 {selectedCleaners === 1 ? 'Single cleaner - great for small spaces' : getRecommendation(getServiceKey(selectedService.name), selectedPropertySize!, selectedCleaners).efficiency_message}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Hours */}
        {!isWindow && isHourly && !!selectedPropertySize && !!selectedCleaners && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>⏱ Duration (Hours)</Text>
            {/* paddingTop gives the floating 'Best' badge room above chips;
                marginTop compensates so layout doesn't shift */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -4, marginTop: -10 }}
              contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 4 }}
            >
              <View style={[s.chipRow, { flexWrap: 'nowrap' }]}>
                {[2, 3, 4, 5, 6, 7].map(h => {
                  const rec = Math.round(getRecommendation(getServiceKey(selectedService.name), selectedPropertySize!, selectedCleaners).recommended_hours);
                  return (
                    <Chip key={h} label={`${h}h`} selected={selectedHours === h} recommended={h === rec} onPress={() => setSelectedHours(h)} />
                  );
                })}
              </View>
            </ScrollView>
            {selectedHours && selectedCleaners && selectedPropertySize && (
              <View style={s.pricePreview}>
                <Text style={s.pricePreviewLabel}>Estimated Price</Text>
                <Text style={s.pricePreviewValue}>{Math.round(calculateCost(getServiceKey(selectedService.name), selectedCleaners, selectedHours, !ownMaterials))} AED</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Extra Services — single continuous carousel ────────────────────── */}
        {allAddonsOrdered.length > 0 && (() => {
          const visibleCats = ADDON_CATEGORIES_CONFIG.filter(cat =>
            cat.ids.some(id => addons.some(a => a.id === id))
          );
          return (
            <View style={s.carouselSection}>
              {/* Header */}
              <View style={s.carouselHeader}>
                <Text style={s.carouselTitle}>✦  Extra Services</Text>
                <Text style={s.carouselSubtitle}>Enhance your cleaning experience</Text>
              </View>

              {/* Category tabs — tap jumps the carousel to that section */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.catTabsScroll}
                contentContainerStyle={s.catTabsContent}
              >
                {visibleCats.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[s.catTab, addonCategory === cat.key && s.catTabActive]}
                    onPress={() => scrollToAddonCategory(cat.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.catTabText, addonCategory === cat.key && s.catTabTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Single FlatList — all addons in category order */}
              <FlatList
                ref={addonCarouselRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={allAddonsOrdered}
                keyExtractor={item => item.id}
                style={s.carouselScroll}
                contentContainerStyle={s.carouselContent}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                // Enables scrollToIndex without layout measurement pass
                getItemLayout={(_, index) => ({
                  length: ADDON_CARD_W,
                  offset: 18 + index * (ADDON_CARD_W + 12),
                  index,
                })}
                onScroll={handleCarouselScroll}
                scrollEventThrottle={80}
                decelerationRate="fast"
                snapToInterval={ADDON_CARD_W + 12}
                snapToAlignment="start"
                // Keeps all items rendered so images stay in memory
                initialNumToRender={allAddonsOrdered.length}
                maxToRenderPerBatch={allAddonsOrdered.length}
                windowSize={allAddonsOrdered.length}
                removeClippedSubviews={false}
                renderItem={({ item: addon }) => {
                  const isSelected = selectedAddons.some(a => a.id === addon.id);
                  const icon = ADDON_ICONS[addon.id];
                  return (
                    <TouchableOpacity
                      style={[s.addonCard2, isSelected && s.addonCard2Selected]}
                      onPress={() => toggleAddon(addon)}
                      activeOpacity={0.82}
                    >
                      <View style={s.addonCard2ImgWrap}>
                        {icon
                          ? <Image source={icon} style={s.addonCard2Img} resizeMode="contain" />
                          : <Text style={{ fontSize: 36 }}>🧹</Text>}
                      </View>
                      <View style={s.addonCard2Foot}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.addonCard2Name} numberOfLines={2}>{addon.name}</Text>
                          <Text style={s.addonCard2Price}>{addon.price} AED</Text>
                        </View>
                        <View style={[s.addonCard2Circle, isSelected && s.addonCard2CircleSel]}>
                          {isSelected && <Text style={s.addonCard2Check}>✓</Text>}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Category dot indicators — also jump to section */}
              <View style={s.catDots}>
                {visibleCats.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[s.catDot, addonCategory === cat.key && s.catDotActive]}
                    onPress={() => scrollToAddonCategory(cat.key)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>

              {/* Selected add-ons list */}
              {selectedAddons.length > 0 && (
                <View style={s.selectedAddonsList}>
                  <Text style={s.selectedAddonsTitle}>Selected Add-ons</Text>
                  {selectedAddons.map(addon => (
                    <View key={addon.id} style={s.selectedAddonRow}>
                      <Text style={s.selectedAddonName}>{addon.name}</Text>
                      <View style={s.selectedAddonRight}>
                        <Text style={s.selectedAddonPrice}>{addon.price} AED</Text>
                        <TouchableOpacity
                          style={s.selectedAddonMinus}
                          onPress={() => toggleAddon(addon)}
                          activeOpacity={0.8}
                        >
                          <Text style={s.selectedAddonMinusText}>−</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })()}
      </View>
    );
  };

  const renderStep3 = () => {
    // ── Helpers ───────────────────────────────────────────────────────────────
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Timezone-safe ISO builder
    const toIso = (y: number, m: number, d: number) =>
      `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // Week strip: all available days of the currently viewed calendar month.
    // If it's the current month, start from tomorrow; for future months, start from day 1.
    const isCurrentCalMonth =
      calViewYear === now.getFullYear() && calViewMonth === now.getMonth();
    const stripStartDay = isCurrentCalMonth ? now.getDate() + 1 : 1;
    const daysInCalViewMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();

    const stripDays: { iso: string; dayNum: number; dowLabel: string }[] = [];
    for (let d = stripStartDay; d <= daysInCalViewMonth; d++) {
      const iso = toIso(calViewYear, calViewMonth, d);
      const dateObj = new Date(calViewYear, calViewMonth, d);
      const dowLabel = DOW[(dateObj.getDay() + 6) % 7]; // Mon-start
      stripDays.push({ iso, dayNum: d, dowLabel });
    }

    // Calendar geometry
    const firstDow = (new Date(calViewYear, calViewMonth, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const totalRows = Math.ceil((firstDow + daysInMonth) / 7);

    const canGoPrev =
      calViewYear > now.getFullYear() ||
      (calViewYear === now.getFullYear() && calViewMonth > now.getMonth());

    const prevCalMonth = () => {
      if (!canGoPrev) return;
      if (calViewMonth === 0) { setCalViewYear(y => y - 1); setCalViewMonth(11); }
      else setCalViewMonth(m => m - 1);
    };
    const nextCalMonth = () => {
      if (calViewMonth === 11) { setCalViewYear(y => y + 1); setCalViewMonth(0); }
      else setCalViewMonth(m => m + 1);
    };

    const handleDaySelect = async (iso: string) => {
      setServiceDate(iso);
      setServiceTime('');          // reset time whenever date changes
      setAvailabilitySlots([]);    // clear stale slots immediately

      // Sync calendar view to selected month
      const [y, mo] = iso.split('-').map(Number);
      setCalViewYear(y);
      setCalViewMonth(mo - 1);

      // Auto-scroll the week strip so the chosen day is centred
      const idx = stripDays.findIndex(d => d.iso === iso);
      if (idx >= 0) {
        const CARD_W = 62;
        const GAP    = 8;
        const PAD    = 18;
        const step   = CARD_W + GAP;
        const cx     = PAD + idx * step + CARD_W / 2;
        const scrollX = Math.max(0, cx - width / 2);
        weekStripRef.current?.scrollTo({ x: scrollX, animated: true });
      }

      // ── Fetch real-time availability from Supabase RPC ──────────────────────
      setLoadingSlots(true);
      try {
        const duration = getBookingDuration();
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_date: iso,
          p_duration_hours: duration,
        });
        if (!error && Array.isArray(data)) {
          setAvailabilitySlots(data);
        }
      } catch (e) {
        console.error('Failed to load availability:', e);
      } finally {
        setLoadingSlots(false);
      }
    };

    return (
      <View>
        {/* ── Week strip ──────────────────────────────────────────────────────── */}
        <ScrollView
          ref={weekStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.weekStrip}
          contentContainerStyle={s.weekStripContent}
        >
          {stripDays.map(({ iso, dayNum, dowLabel }) => {
            const isSelected = iso === serviceDate;
            return (
              <TouchableOpacity
                key={iso}
                style={[s.weekDayCard, isSelected && s.weekDayCardSelected]}
                onPress={() => handleDaySelect(iso)}
                activeOpacity={0.75}
              >
                <Text style={[s.weekDayLabel, isSelected && s.weekDayLabelSel]}>{dowLabel}</Text>
                <Text style={[s.weekDayNum, isSelected && s.weekDayNumSel]}>{dayNum}</Text>
                {isSelected && <View style={s.weekDayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Custom calendar card ────────────────────────────────────────────── */}
        <View style={s.calCard}>
          {/* Month navigation */}
          <View style={s.calNavRow}>
            <TouchableOpacity onPress={prevCalMonth} style={s.calNavBtn} activeOpacity={0.7} disabled={!canGoPrev}>
              <Text style={[s.calNavArrow, !canGoPrev && s.calNavArrowDim]}>‹</Text>
            </TouchableOpacity>
            <Text style={s.calMonthTitle}>{MONTH_NAMES[calViewMonth]} {calViewYear}</Text>
            <TouchableOpacity onPress={nextCalMonth} style={s.calNavBtn} activeOpacity={0.7}>
              <Text style={s.calNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week header */}
          <View style={s.calDowRow}>
            {DOW.map(d => (
              <View key={d} style={s.calDowCell}>
                <Text style={s.calDowText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar rows */}
          {Array.from({ length: totalRows }).map((_, rowIdx) => (
            <View key={rowIdx} style={s.calRow}>
              {Array.from({ length: 7 }).map((_, colIdx) => {
                const dayNum = rowIdx * 7 + colIdx - firstDow + 1;

                // Empty cell (before first day or after last day)
                if (dayNum < 1 || dayNum > daysInMonth) {
                  return (
                    <View key={`e-${rowIdx}-${colIdx}`} style={s.calCell}>
                      <View style={s.calEmptyBox} />
                    </View>
                  );
                }

                const iso = toIso(calViewYear, calViewMonth, dayNum);
                const isPastOrToday = iso <= todayIso;
                const isToday       = iso === todayIso;
                const isSelected    = iso === serviceDate;

                return (
                  <TouchableOpacity
                    key={iso}
                    style={s.calCell}
                    onPress={() => !isPastOrToday && handleDaySelect(iso)}
                    activeOpacity={isPastOrToday ? 1 : 0.75}
                    disabled={isPastOrToday}
                  >
                    {isSelected && <View style={s.calCellSelBg} />}
                    <Text style={[
                      s.calCellText,
                      isPastOrToday && s.calCellTextDim,
                      isSelected    && s.calCellTextSel,
                    ]}>
                      {dayNum}
                    </Text>
                    {isToday && !isSelected && <View style={s.calTodayDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Preferred Time ──────────────────────────────────────────────────── */}
        <Text style={s.calSectionTitle}>
          {serviceDate ? 'Available Times' : 'Preferred Time'}
        </Text>

        {loadingSlots ? (
          /* Skeleton while fetching */
          <View style={[s.calTimeGrid, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
            <ActivityIndicator color="#22D3EE" size="small" />
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 8 }}>
              Checking availability…
            </Text>
          </View>
        ) : availabilitySlots.length > 0 ? (
          /* Dynamic availability grid */
          <View style={s.calTimeGrid}>
            {availabilitySlots.map(slot => {
              const isoTime = `${String(slot.hour).padStart(2, '0')}:00`;
              const isActive = serviceTime === isoTime;
              return (
                <TouchableOpacity
                  key={slot.hour}
                  style={[
                    s.calTimeSlot,
                    isActive && s.calTimeSlotSel,
                    !slot.available && s.calTimeSlotUnavail,
                  ]}
                  onPress={() => slot.available && setServiceTime(isoTime)}
                  disabled={!slot.available}
                  activeOpacity={slot.available ? 0.75 : 1}
                >
                  <Text style={[
                    s.calTimeSlotText,
                    isActive && s.calTimeSlotTextSel,
                    !slot.available && s.calTimeSlotTextUnavail,
                  ]}>
                    {slot.label}
                  </Text>
                  {!slot.available && (
                    <Text style={s.calTimeSlotFullLabel}>Full</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Fallback static grid when no date selected yet */
          <View style={s.calTimeGrid}>
            {TIME_SLOTS.map(slot => {
              const isActive = serviceTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[s.calTimeSlot, isActive && s.calTimeSlotSel]}
                  onPress={() => setServiceTime(slot)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.calTimeSlotText, isActive && s.calTimeSlotTextSel]}>
                    {TIME_LABELS[slot]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderStep4 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View>
        <SectionHeader title="Your Details" subtitle="We'll use this to confirm your booking" />

        {/* Contact */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>👤 Contact Information</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputLabel}>Full Name *</Text>
            <TextInput
              style={s.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Your full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={s.inputWrap}>
            <Text style={s.inputLabel}>Phone Number *</Text>
            <TextInput
              style={s.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+971 50 000 0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Address */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>📍 Service Address</Text>
          <View style={s.toggleRow}>
            {addresses.length > 0 && (
              <TouchableOpacity
                style={[s.toggleOption, !useNewAddress && s.toggleOptionSelected]}
                onPress={() => setUseNewAddress(false)}
                activeOpacity={0.75}
              >
                <Text style={[s.toggleText, !useNewAddress && s.toggleTextSelected]}>Saved Address</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.toggleOption, (useNewAddress || addresses.length === 0) && s.toggleOptionSelected]}
              onPress={() => setUseNewAddress(true)}
              activeOpacity={0.75}
            >
              <Text style={[s.toggleText, (useNewAddress || addresses.length === 0) && s.toggleTextSelected]}>New Address</Text>
            </TouchableOpacity>
          </View>

          {!useNewAddress && addresses.length > 0 ? (
            <View>
              {addresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[s.addressRow, selectedAddressId === addr.id && s.addressRowSelected]}
                  onPress={() => setSelectedAddressId(addr.id)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.addressText, selectedAddressId === addr.id && s.addressTextSelected]}>
                      {addr.street}, {addr.city}
                    </Text>
                    {addr.is_default && <Text style={s.addressDefault}>Default</Text>}
                  </View>
                  <View style={[s.radio, selectedAddressId === addr.id && s.radioSelected]}>
                    {selectedAddressId === addr.id && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <View style={s.inputWrap}>
                <Text style={s.inputLabel}>Building / Street *</Text>
                <TextInput
                  style={s.input}
                  value={newAddress}
                  onChangeText={setNewAddress}
                  placeholder="e.g. Westwood Grande, Al Barsha"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={s.grid2Tight}>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Text style={s.inputLabel}>Floor (Optional)</Text>
                  <TextInput style={s.input} value={newAddressFloor} onChangeText={setNewAddressFloor} placeholder="e.g. 5" placeholderTextColor="#9CA3AF" />
                </View>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Text style={s.inputLabel}>Apartment (Optional)</Text>
                  <TextInput style={s.input} value={newAddressApt} onChangeText={setNewAddressApt} placeholder="e.g. 501" placeholderTextColor="#9CA3AF" />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>📝 Additional Notes (Optional)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Any special instructions, access codes, or requests..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment method */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>💳 Payment Method</Text>
          <View style={s.infoBox}>
            <Text style={s.infoBoxText}>💡 Currently only cash payment is available. Apple Pay, Tabby and card payments coming soon!</Text>
          </View>
          {/* Cash - active */}
          <TouchableOpacity
            style={[s.paymentOption, paymentMethod === 'cash' && s.paymentOptionSelected]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.75}
          >
            <Text style={s.paymentIcon}>💵</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.paymentLabel, paymentMethod === 'cash' && s.paymentLabelSelected]}>Cash on Service</Text>
              <Text style={s.paymentHint}>Pay when the cleaner arrives (+5 AED fee)</Text>
            </View>
            <View style={[s.radio, paymentMethod === 'cash' && s.radioSelected]}>
              {paymentMethod === 'cash' && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
          {/* Apple Pay - disabled */}
          <View style={[s.paymentOption, s.paymentOptionDisabled]}>
            <Text style={s.paymentIcon}>🍎</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentLabelDisabled}>Apple Pay</Text>
              <Text style={s.paymentHint}>Coming Soon</Text>
            </View>
            <View style={s.badge2}><Text style={s.badge2Text}>Soon</Text></View>
          </View>
          {/* Tabby - disabled */}
          <View style={[s.paymentOption, s.paymentOptionDisabled]}>
            <Text style={s.paymentIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentLabelDisabled}>Tabby (Buy Now, Pay Later)</Text>
              <Text style={s.paymentHint}>Coming Soon</Text>
            </View>
            <View style={s.badge2}><Text style={s.badge2Text}>Soon</Text></View>
          </View>
        </View>

        {/* Order summary */}
        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>📋 Order Review</Text>
          <View style={s.summaryRows}>
            <SummaryRow label="Service" value={selectedService?.name ?? '—'} />
            {selectedPropertySize && !isWindowService(selectedService?.id) && (
              <SummaryRow label="Property Size" value={selectedPropertySize.charAt(0).toUpperCase() + selectedPropertySize.slice(1)} />
            )}
            {requiresPanels(selectedService?.id) && <SummaryRow label="Window Panels" value={`${windowPanels} panels`} />}
            {selectedCleaners && <SummaryRow label="Cleaners" value={`${selectedCleaners}`} />}
            {selectedHours && <SummaryRow label="Duration" value={`${selectedHours} hours`} />}
            <SummaryRow label="Materials" value={ownMaterials ? 'Customer provided' : 'Cleaner provided'} />
            {serviceDate && serviceTime && <SummaryRow label="Date & Time" value={`${formatDisplayDate(serviceDate)} at ${TIME_LABELS[serviceTime]}`} />}
            {selectedAddons.length > 0 && <SummaryRow label="Extra Services" value={selectedAddons.map(a => a.name).join(', ')} />}
          </View>

          <View style={s.divider} />
          <Text style={s.summaryTitle}>💰 Payment Summary</Text>
          <View style={s.summaryRows}>
            <SummaryRow label="Service Price" value={`${pricing.base} AED`} />
            {pricing.addonsTotal > 0 && <SummaryRow label="Extra Services" value={`${pricing.addonsTotal} AED`} />}
            <SummaryRow label="VAT (5%)" value={`${pricing.vat} AED`} />
            {pricing.cashFee > 0 && <SummaryRow label="Cash Fee" value={`${pricing.cashFee} AED`} />}
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{pricing.total} AED</Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderStep5 = () => {
    const scale = successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
    return (
      <View style={s.successContainer}>
        <Animated.View style={[s.successIcon, { transform: [{ scale }], opacity: successAnim }]}>
          <LinearGradient colors={['#10B981', '#34D399']} style={s.successIconGradient}>
            <Text style={s.successEmoji}>✓</Text>
          </LinearGradient>
        </Animated.View>
        <Text style={s.successTitle}>Booking Confirmed! 🎉</Text>
        <Text style={s.successSubtitle}>
          Your booking #{bookingId} has been submitted successfully. We'll contact you shortly to confirm the details.
        </Text>
        <View style={s.successDetails}>
          {serviceDate && <Text style={s.successDetail}>📅 {formatDisplayDate(serviceDate)}</Text>}
          {serviceTime && <Text style={s.successDetail}>🕐 {TIME_LABELS[serviceTime]}</Text>}
          {selectedService && <Text style={s.successDetail}>🧹 {selectedService.name}</Text>}
          <Text style={s.successDetail}>💰 Total: {pricing.total} AED</Text>
        </View>
        <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 20 }} />
        <Text style={s.successRedirect}>Redirecting to your bookings...</Text>
      </View>
    );
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading services...</Text>
      </View>
    );
  }

  const stepContent: Record<number, React.ReactNode> = {
    1: renderStep1(),
    2: renderStep2(),
    3: renderStep3(),
    4: renderStep4(),
    5: renderStep5(),
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goPrev} style={s.headerBack} activeOpacity={0.7}>
          <Text style={s.headerBackText}>{currentStep === 1 ? '✕' : '‹'}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {currentStep === 1 ? 'Choose Service'
            : currentStep === 2 ? 'Service Details'
            : currentStep === 3 ? 'Schedule Your Service'
            : currentStep === 4 ? 'Your Details'
            : 'Booking Confirmed'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator (steps 1-4 only) */}
        {currentStep < 5 && (
          <View style={s.stepIndicatorWrap}>
            <StepIndicator currentStep={currentStep} totalSteps={4} />
          </View>
        )}

        {/* Step content — wrapped in animated view for slide+fade transitions */}
        <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: fadeAnim }}>
          {stepContent[currentStep]}
        </Animated.View>
      </ScrollView>

      {/* Footer CTA */}
      {currentStep < 5 && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom + 80, 90) }]}>
          {/* Floating price */}
          {pricing.total > 0 && currentStep > 1 && (
            <View style={s.priceBar}>
              {currentStep === 3 ? (
                <Text style={s.priceBarCyan}>Estimated Total: {pricing.total} AED</Text>
              ) : (
                <>
                  <Text style={s.priceBarLabel}>Estimated Total</Text>
                  <Text style={s.priceBarValue}>{pricing.total} AED</Text>
                </>
              )}
            </View>
          )}
          <TouchableOpacity
            onPress={goNext}
            activeOpacity={0.85}
            disabled={loading}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={currentStep === 4 ? ['#10B981', '#34D399'] : ['#2563EB', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.ctaBtn}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.ctaBtnText}>
                  {currentStep === 4 ? '✓ Confirm Booking' : `Continue →`}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Off-screen image preloader ────────────────────────────────────────
          Render ALL app images at mount time so the OS decodes & caches them
          before the user reaches the screen that needs them.
          pointerEvents="none" prevents any touch interception.                 */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: -9999, top: -9999 }}
      >
        {/* Addon 3D icons (step 2 carousel) */}
        {Object.values(ADDON_ICONS).map((src, i) => (
          <Image key={`a${i}`} source={src} style={{ width: ADDON_CARD_W, height: ADDON_CARD_W }} resizeMode="contain" />
        ))}
        {/* Service category hero images (step 1 tabs) */}
        {Object.values(SERVICE_CATEGORY_IMAGES).map((src, i) => (
          <Image key={`sc${i}`} source={src} style={{ width: 80, height: 80 }} resizeMode="contain" />
        ))}
        {/* Package service icons & banners (step 1 packages grid + modal) */}
        {Object.values(PACKAGE_SERVICE_ASSETS).map((meta, i) => (
          <React.Fragment key={`p${i}`}>
            {meta.icon   && <Image source={meta.icon}   style={{ width: 80, height: 80 }}  resizeMode="contain" />}
            {meta.banner && <Image source={meta.banner} style={{ width: 120, height: 80 }} resizeMode="cover"   />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

// ─── Summary Row Helper ────────────────────────────────────────────────────────
const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <View style={sumStyles.row}>
    <Text style={sumStyles.label}>{label}</Text>
    <Text style={sumStyles.value} numberOfLines={2}>{value}</Text>
  </View>
);
const sumStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  label: { fontSize: 13, color: '#94A3B8', flex: 1 },
  value: { fontSize: 13, fontWeight: '600', color: '#F1F5F9', flex: 1.5, textAlign: 'right' },
});

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B18' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' },
  headerBack: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  headerBackText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 8 },
  stepIndicatorWrap: { marginBottom: 8 },

  // Step 1 - Categories
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: (width - 48) / 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', gap: 10 },
  categoryImage: { width: 76, height: 76 },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' },
  categoryPrice: { fontSize: 13, fontWeight: '800', color: '#93C5FD', textAlign: 'center' },

  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backLinkText: { fontSize: 14, color: '#93C5FD', fontWeight: '600' },

  categoryBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 16 },
  categoryBannerImage: { width: 48, height: 48 },
  categoryBannerTitle: { fontSize: 15, fontWeight: '700', color: '#93C5FD' },
  categoryBannerSubtitle: { fontSize: 12, fontWeight: '700', color: '#60A5FA', marginTop: 2 },

  serviceRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  serviceRowSelected: { borderColor: 'rgba(59,130,246,0.65)', backgroundColor: 'rgba(37,99,235,0.20)' },
  serviceRowInfo: { flex: 1, gap: 3 },
  serviceRowName: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  serviceRowDesc: { fontSize: 12, color: '#94A3B8' },
  serviceRowPrice: { fontSize: 12, fontWeight: '700', color: '#93C5FD' },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  radioSelected: { borderColor: '#2563EB', backgroundColor: '#2563EB' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },

  selectedServiceBanner: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)', marginTop: 8 },
  selectedServiceText: { fontSize: 14, fontWeight: '700', color: '#6EE7B7' },
  selectedServiceHint: { fontSize: 12, color: '#34D399', marginTop: 4 },

  infoBox: { backgroundColor: 'rgba(37,99,235,0.12)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', marginTop: 8 },
  infoBoxText: { fontSize: 12, color: '#93C5FD', lineHeight: 18 },

  emptyText: { textAlign: 'center', color: '#64748B', fontSize: 14, padding: 32 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#CBD5E1' },

  // Step 2 - Config
  configSection: { marginBottom: 24 },
  configLabel: { fontSize: 14, fontWeight: '700', color: '#CBD5E1', marginBottom: 12 },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
  counterVal: { fontSize: 20, fontWeight: '800', color: '#F1F5F9', minWidth: 36, textAlign: 'center' },

  sizeCard: { width: (width - 48) / 2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  sizeCardSelected: { borderColor: 'rgba(59,130,246,0.65)', backgroundColor: 'rgba(37,99,235,0.20)' },
  sizeLabel: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  sizeLabelSelected: { color: '#93C5FD' },
  sizeDetail: { fontSize: 12, color: '#64748B', marginTop: 3 },
  sizeDetailSelected: { color: '#60A5FA' },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  toggleOption: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  toggleOptionSelected: { borderColor: 'rgba(59,130,246,0.65)', backgroundColor: 'rgba(37,99,235,0.20)' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  toggleTextSelected: { color: '#93C5FD' },
  toggleHint: { fontSize: 11, color: '#64748B', marginTop: 3 },
  toggleHintSelected: { color: '#60A5FA' },

  ecoNote: { backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.20)' },
  ecoNoteText: { fontSize: 12, color: '#34D399' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  pricePreview: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pricePreviewLabel: { fontSize: 12, color: '#94A3B8' },
  pricePreviewValue: { fontSize: 22, fontWeight: '900', color: '#93C5FD', marginTop: 4 },

  // ── Extra Services Carousel ────────────────────────────────────────────────
  carouselSection: { marginBottom: 8 },
  carouselHeader: { marginBottom: 14 },
  carouselTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  carouselSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },

  // Category tabs — break out of parent padding so they go edge-to-edge
  catTabsScroll: { marginBottom: 14, marginHorizontal: -18 },
  catTabsContent: { gap: 8, paddingHorizontal: 18, paddingRight: 22 },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)' },
  catTabActive: { backgroundColor: 'rgba(34,211,238,0.12)', borderColor: 'rgba(34,211,238,0.45)' },
  catTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catTabTextActive: { color: '#22D3EE' },

  // Carousel scroll container
  carouselScroll: { marginHorizontal: -18 },
  carouselContent: { paddingHorizontal: 18, gap: 12, paddingBottom: 6 },

  // Individual addon card
  addonCard2: {
    width: ADDON_CARD_W,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  addonCard2Selected: {
    borderColor: '#22D3EE',
    backgroundColor: 'rgba(34,211,238,0.07)',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  addonCard2ImgWrap: {
    height: ADDON_CARD_W,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  addonCard2Img: { width: '90%', height: '90%' },
  addonCard2Foot: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, paddingTop: 7, gap: 5 },
  addonCard2Name: { fontSize: 11, fontWeight: '700', color: '#F1F5F9', lineHeight: 15 },
  addonCard2Price: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 3 },
  addonCard2Circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addonCard2CircleSel: { backgroundColor: '#22D3EE', borderColor: '#22D3EE' },
  addonCard2Check: { fontSize: 11, fontWeight: '900', color: '#070B18' },

  // Category dot indicators
  catDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 2 },
  catDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  catDotActive: { width: 20, borderRadius: 3, backgroundColor: '#22D3EE' },

  // Selected addons list
  selectedAddonsList: { marginTop: 20 },
  selectedAddonsTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 12 },
  selectedAddonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  selectedAddonName: { flex: 1, fontSize: 14, color: '#E2E8F0', fontWeight: '500' },
  selectedAddonRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedAddonPrice: { fontSize: 14, fontWeight: '700', color: '#22D3EE' },
  selectedAddonMinus: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(34,211,238,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,211,238,0.30)' },
  selectedAddonMinusText: { fontSize: 18, fontWeight: '700', color: '#22D3EE', lineHeight: 22 },

  // ── Legacy (kept for references elsewhere) ──────────────────────────────────
  addonRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 8, gap: 10 },
  addonRowActive: { borderColor: 'rgba(34,211,238,0.55)', backgroundColor: 'rgba(34,211,238,0.10)' },
  addonInfo: { flex: 1 },
  addonName: { fontSize: 13, fontWeight: '600', color: '#F1F5F9' },
  addonNameActive: { color: '#22D3EE' },
  addonDesc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  addonRight: { alignItems: 'flex-end', gap: 6 },
  addonPrice: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  addonPriceActive: { color: '#22D3EE' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: '#22D3EE', backgroundColor: '#22D3EE' },
  checkmark: { color: '#070B18', fontSize: 13, fontWeight: '900' },

  // Step 3 - Schedule
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', padding: 14 },
  datePickerText: { fontSize: 14, fontWeight: '600', color: '#F1F5F9' },
  datePickerPlaceholder: { color: '#64748B' },
  datePickerArrow: { fontSize: 18 },

  timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)' },
  timeSlotSelected: { borderColor: 'rgba(59,130,246,0.65)', backgroundColor: 'rgba(37,99,235,0.25)' },
  timeSlotText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  timeSlotTextSelected: { color: '#93C5FD' },

  scheduleSummary: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)', marginTop: 8 },
  scheduleSummaryTitle: { fontSize: 12, color: '#34D399', fontWeight: '700', marginBottom: 4 },
  scheduleSummaryValue: { fontSize: 14, fontWeight: '700', color: '#6EE7B7' },

  // Step 4 - Contact
  inputWrap: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#F1F5F9' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  grid2Tight: { flexDirection: 'row', gap: 12 },

  addressRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  addressRowSelected: { borderColor: 'rgba(59,130,246,0.65)', backgroundColor: 'rgba(37,99,235,0.20)' },
  addressText: { fontSize: 13, fontWeight: '600', color: '#F1F5F9' },
  addressTextSelected: { color: '#93C5FD' },
  addressDefault: { fontSize: 11, color: '#60A5FA', marginTop: 3 },

  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10, gap: 10 },
  paymentOptionSelected: { borderColor: 'rgba(59,130,246,0.65)', backgroundColor: 'rgba(37,99,235,0.20)' },
  paymentOptionDisabled: { opacity: 0.5, backgroundColor: 'rgba(255,255,255,0.04)' },
  paymentIcon: { fontSize: 22 },
  paymentLabel: { fontSize: 14, fontWeight: '600', color: '#F1F5F9' },
  paymentLabelSelected: { color: '#93C5FD' },
  paymentLabelDisabled: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  paymentHint: { fontSize: 11, color: '#64748B', marginTop: 2 },
  badge2: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badge2Text: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },

  summaryBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginTop: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', marginBottom: 12 },
  summaryRows: { gap: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#F1F5F9' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#93C5FD' },

  // Step 5 - Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  successIcon: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', marginBottom: 24 },
  successIconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successEmoji: { fontSize: 40, color: '#FFF', fontWeight: '900' },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#34D399', marginBottom: 12, textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 16 },
  successDetails: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 16, padding: 16, width: '100%', gap: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)' },
  successDetail: { fontSize: 13, color: '#34D399', fontWeight: '600' },
  successRedirect: { fontSize: 13, color: '#64748B', marginTop: 10 },

  // Footer
  footer: { backgroundColor: 'rgba(7,11,24,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 18, paddingTop: 12 },
  priceBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priceBarLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  priceBarValue: { fontSize: 18, fontWeight: '900', color: '#2563EB' },
  priceBarCyan: { fontSize: 16, fontWeight: '700', color: '#22D3EE' },
  ctaBtn: { paddingVertical: 17, alignItems: 'center', borderRadius: 16 },
  ctaBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // ── Step 3 – Week strip ────────────────────────────────────────────────────
  weekStrip: { marginHorizontal: -18, marginBottom: 20 },
  weekStripContent: { paddingHorizontal: 18, gap: 8 },
  weekDayCard: {
    width: 62,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 6,
  },
  weekDayCardSelected: {
    backgroundColor: '#0891B2',
    borderColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  weekDayLabel:    { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.8 },
  weekDayLabelSel: { color: 'rgba(255,255,255,0.80)' },
  weekDayNum:      { fontSize: 22, fontWeight: '800', color: '#E2E8F0' },
  weekDayNumSel:   { color: '#FFFFFF' },
  weekDayDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: '#22D3EE',
    marginTop: 2,
  },

  // ── Step 3 – Calendar card ─────────────────────────────────────────────────
  calCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  calNavBtn:        { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  calNavArrow:      { fontSize: 26, fontWeight: '700', color: '#22D3EE', lineHeight: 30 },
  calNavArrowDim:   { color: 'rgba(255,255,255,0.18)' },
  calMonthTitle:    { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  calDowRow:        { flexDirection: 'row', marginBottom: 6 },
  calDowCell:       { flex: 1, alignItems: 'center', paddingVertical: 6 },
  calDowText:       { fontSize: 11, fontWeight: '700', color: '#22D3EE', letterSpacing: 0.5 },
  calRow:           { flexDirection: 'row', marginBottom: 2 },
  calCell: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellSelBg: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0891B2',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
  },
  calCellText:    { fontSize: 14, fontWeight: '600', color: '#E2E8F0', zIndex: 1 },
  calCellTextDim: { color: 'rgba(255,255,255,0.28)', fontWeight: '400' },
  calCellTextSel: { color: '#FFFFFF', fontWeight: '800', zIndex: 2 },
  calEmptyBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  calTodayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#22D3EE',
  },

  // ── Step 3 – Section title & time slots ───────────────────────────────────
  calSectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#F1F5F9',
    marginBottom: 14,
  },
  calTimeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  calTimeSlot: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  calTimeSlotSel: {
    backgroundColor: '#0891B2',
    borderColor: '#22D3EE',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
  calTimeSlotText:        { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  calTimeSlotTextSel:     { color: '#FFFFFF', fontWeight: '700' },
  calTimeSlotUnavail:     { opacity: 0.32, borderColor: 'rgba(255,255,255,0.06)' },
  calTimeSlotTextUnavail: { color: 'rgba(255,255,255,0.30)', textDecorationLine: 'line-through' },
  calTimeSlotFullLabel:   { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  // Category filter tabs
  filterScroll: { marginBottom: 18 },
  filterScrollContent: { gap: 8, paddingRight: 4 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(37,99,235,0.65)',
    borderColor: 'rgba(59,130,246,0.80)',
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  filterTabTextActive: { color: '#FFFFFF' },

  // Package 2-column grid
  packageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pkgCard: {
    width: (width - 48) / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  pkgIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgIcon: { width: 56, height: 56 },
  pkgName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    lineHeight: 18,
  },
  pkgPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#93C5FD',
    textAlign: 'center',
  },
  pkgPopular: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pkgPopularText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
});

// ─── Bottom Sheet styles ───────────────────────────────────────────────────────
const CARD_MARGIN = 16;
const bs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: Dimensions.get('window').height * 0.90,
    backgroundColor: '#0D1526',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 24,
  },
  handleArea: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  // Banner image — inset with rounded corners
  bannerImage: {
    marginHorizontal: CARD_MARGIN,
    width: Dimensions.get('window').width - CARD_MARGIN * 2,
    height: 200,
    borderRadius: 18,
  },

  // Content section
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  popularPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  popularPillText: { fontSize: 12, fontWeight: '800', color: '#FFF' },

  serviceName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 8,
    lineHeight: 30,
  },
  serviceDesc: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 20,
  },

  inclTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  inclRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 13, color: '#FFF', fontWeight: '900' },
  inclText: { fontSize: 14, color: '#CBD5E1', flex: 1 },

  // Info badges
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },

  // CTA button
  addBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default BookingScreen;
