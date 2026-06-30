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
import { useGoToAuth } from '../hooks/useGoToAuth';
import { supabase } from '../lib/supabase';
import StepIndicator from '../components/ui/StepIndicator';
import {
  PROPERTY_SIZES,
  getServiceKey,
  getRecommendation,
} from '../utils/recommendationAlgorithm';
import { useSimpleTranslation } from '../utils/i18n';
import { translatePropertySize, getMonthNames, getDayNamesShort, getPackageCopy, formatLocalizedDate, formatLocalizedTime } from '../utils/translateStatus';
import AddressMapForm, { EMPTY_ADDRESS_FORM, formatAddressFormValue, type AddressFormValue } from '../components/address/AddressMapForm';
import DeepCleaningPackagesSection from '../components/booking/DeepCleaningPackagesSection';
import { MIN_BOOKING_HOURS, WINDOW_HOURLY_RATE, isWeekendDate } from '../constants/bookingRules';
import { DEEP_PACKAGE_SERVICE_IDS, getDeepPackagePrice, VILLA_DEEP_PACKAGES } from '../constants/deepCleaningPackages';
import { calcBookingPricing, getEffectiveHours } from '../utils/bookingPricing';

const WINDOW_SERVICE_ID = 17;
const { width } = Dimensions.get('window');
const ADDON_CARD_W = Math.floor((width - 36) / 3.2); // ~3 cards + peek visible

// ─── Addon icons (static require — one entry per addon ID from DB) ─────────────
const ADDON_ICONS: Record<string, any> = {
  '1':  require('../../assets/addon_3d_fridge_cleaning.webp'),
  '2':  require('../../assets/addon_3d_oven_cleaning.webp'),
  '3':  require('../../assets/addon_3d_balcony_cleaning.webp'),
  '4':  require('../../assets/addon_3d_wardrobe_cleaning.webp'),
  '5':  require('../../assets/addon_3d_ironing_service.webp'),
  '11': require('../../assets/addon_3d_inside_oven.webp'),
  '12': require('../../assets/addon_3d_inside_fridge.webp'),
  '14': require('../../assets/addon_3d_inside_cabinets.webp'),
  '15': require('../../assets/addon_3d_laundry_service.webp'),
  '16': require('../../assets/addon_3d_window_cleaning.webp'),
  '19': require('../../assets/addon_3d_sofa_single.webp'),
  '20': require('../../assets/addon_3d_sofa_2seater.webp'),
  '21': require('../../assets/addon_3d_sofa_3seater.webp'),
  '22': require('../../assets/addon_3d_sofa_4seater_lshape.webp'),
  '23': require('../../assets/addon_3d_sofa_5seater.webp'),
  '24': require('../../assets/addon_3d_carpet_small.webp'),
  '25': require('../../assets/addon_3d_carpet_medium.webp'),
  '26': require('../../assets/addon_3d_carpet_large.webp'),
  '27': require('../../assets/addon_3d_carpet_xl.webp'),
  '28': require('../../assets/addon_3d_mattress_single.webp'),
  '29': require('../../assets/addon_3d_mattress_double.webp'),
  '30': require('../../assets/addon_3d_mattress_queen.webp'),
  '31': require('../../assets/addon_3d_mattress_king.webp'),
  '32': require('../../assets/addon_3d_curtain_small.webp'),
  '33': require('../../assets/addon_3d_curtain_medium.webp'),
  '34': require('../../assets/addon_3d_curtain_large.webp'),
  '35': require('../../assets/addon_3d_curtain_xl.webp'),
  '36': require('../../assets/addon_3d_pillows.webp'),
};

// ─── Addon categories ──────────────────────────────────────────────────────────
const ADDON_CATEGORIES_CONFIG = [
  { key: 'cleaning',  ids: ['1','2','3','4','5','11','12','14','15','16'] },
  { key: 'sofa',      ids: ['19','20','21','22','23'] },
  { key: 'carpet',    ids: ['24','25','26','27'] },
  { key: 'mattress',  ids: ['28','29','30','31'] },
  { key: 'curtains',  ids: ['32','33','34','35'] },
  { key: 'pillows',   ids: ['36'] },
] as const;

// ─── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_CATEGORY_IMAGES: Record<string, any> = {
  regular:     require('../../assets/icon_regular_cleaning.webp'),
  deep:        require('../../assets/icon_deep_cleaning.webp'),
  packages:    require('../../assets/icon_complete_packages.webp'),
  specialized: require('../../assets/icon_window_cleaning.webp'),
};

const SERVICE_CATEGORIES = [
  { key: 'regular',     priceAmount: 35,  serviceIds: [6, 7] },
  { key: 'deep',        priceAmount: 45,  serviceIds: [8, 9] },
  { key: 'packages',    priceAmount: 350, serviceIds: [10, 20, 21, 22, 23, 24, 25, 26, 27, 30] },
  { key: 'specialized', priceAmount: 50,  serviceIds: [17] },
];

// ─── Package service metadata (icons, banners, inclusions, timing) ──────────────
interface PackageMeta {
  icon: any;
  banner: any;
  hoursMin: number;
  hoursMax: number;
  cleaners: number;
  isPopular?: boolean;
}

const PACKAGE_SERVICE_ASSETS: Record<number, PackageMeta> = {
  10: {
    icon: require('../../assets/icon_full_villa_deep_cleaning.webp'),
    banner: require('../../assets/banner_full_villa.webp'),
    hoursMin: 4, hoursMax: 6, cleaners: 2, isPopular: true,
  },
  11: {
    icon: require('../../assets/icon_full_apartment.webp'),
    banner: require('../../assets/banner_full_apartment.webp'),
    hoursMin: 2, hoursMax: 4, cleaners: 1,
  },
  12: {
    icon: require('../../assets/icon_villa_facade.webp'),
    banner: require('../../assets/banner_villa_facade.webp'),
    hoursMin: 3, hoursMax: 5, cleaners: 2,
  },
  13: {
    icon: require('../../assets/icon_move_in_out.webp'),
    banner: require('../../assets/banner_move_in_out.webp'),
    hoursMin: 4, hoursMax: 8, cleaners: 2,
  },
  14: {
    icon: require('../../assets/icon_post_construction_final.webp'),
    banner: require('../../assets/banner_post_construction.webp'),
    hoursMin: 5, hoursMax: 8, cleaners: 2,
  },
  15: {
    icon: require('../../assets/icon_kitchen_cleaning.webp'),
    banner: require('../../assets/banner_kitchen.webp'),
    hoursMin: 2, hoursMax: 3, cleaners: 1,
  },
  16: {
    icon: require('../../assets/icon_bathroom_deep_cleaning.webp'),
    banner: require('../../assets/banner_bathroom.webp'),
    hoursMin: 1, hoursMax: 2, cleaners: 1,
  },
  20: {
    icon: require('../../assets/icon_full_apartment.webp'),
    banner: require('../../assets/banner_full_apartment.webp'),
    hoursMin: 2, hoursMax: 4, cleaners: 2,
  },
  21: {
    icon: require('../../assets/icon_full_apartment.webp'),
    banner: require('../../assets/banner_full_apartment.webp'),
    hoursMin: 2, hoursMax: 4, cleaners: 2,
  },
  22: {
    icon: require('../../assets/icon_full_apartment.webp'),
    banner: require('../../assets/banner_full_apartment.webp'),
    hoursMin: 3, hoursMax: 5, cleaners: 2, isPopular: true,
  },
  23: {
    icon: require('../../assets/icon_full_apartment.webp'),
    banner: require('../../assets/banner_full_apartment.webp'),
    hoursMin: 4, hoursMax: 6, cleaners: 2,
  },
  24: {
    icon: require('../../assets/icon_full_apartment.webp'),
    banner: require('../../assets/banner_full_apartment.webp'),
    hoursMin: 4, hoursMax: 6, cleaners: 3,
  },
  25: {
    icon: require('../../assets/icon_full_villa_deep_cleaning.webp'),
    banner: require('../../assets/banner_full_villa.webp'),
    hoursMin: 4, hoursMax: 6, cleaners: 2,
  },
  26: {
    icon: require('../../assets/icon_full_villa_deep_cleaning.webp'),
    banner: require('../../assets/banner_full_villa.webp'),
    hoursMin: 5, hoursMax: 7, cleaners: 2,
  },
  27: {
    icon: require('../../assets/icon_full_villa_deep_cleaning.webp'),
    banner: require('../../assets/banner_full_villa.webp'),
    hoursMin: 6, hoursMax: 8, cleaners: 3,
  },
  30: {
    icon: require('../../assets/icon_post_construction_final.webp'),
    banner: require('../../assets/banner_post_construction.webp'),
    hoursMin: 4, hoursMax: 8, cleaners: 2,
  },
};

const isDeepPackageService = (id?: number) => (id ? DEEP_PACKAGE_SERVICE_IDS.includes(id) : false);
const isWindowCategory = (category: string | null) => category === 'specialized';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface ServiceType { id: number; name: string; description: string; base_price: number; price_per_hour: number | null; is_active: boolean; }
interface AddonType { id: string; name: string; price: number; description?: string; }
interface Address { id: number; street: string; city: string; is_default: boolean; }

// ─── Selection Chip ─────────────────────────────────────────────────────────────
const Chip = ({ label, selected, onPress, recommended, bestLabel }: { label: string; selected: boolean; onPress: () => void; recommended?: boolean; bestLabel?: string }) => (
  <TouchableOpacity onPress={onPress} style={[chipStyles.chip, selected && chipStyles.selected]} activeOpacity={0.75}>
    {recommended && bestLabel && <View style={chipStyles.badge}><Text style={chipStyles.badgeText}>{bestLabel}</Text></View>}
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
  const goToAuth = useGoToAuth();
  const { t, tPlural, i18n } = useSimpleTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const timeSectionRef = useRef<View>(null);
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
  const [deepPropertyType, setDeepPropertyType] = useState<'villa' | 'townhouse'>('villa');

  // ── Step 3: Schedule
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState<Date>((() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })());

  // ── Step 4: Contact + Address
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState<AddressFormValue>({ ...EMPTY_ADDRESS_FORM });
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // ── UI
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // ── Step 3: Availability ─────────────────────────────────────────────────────
  const [availabilitySlots, setAvailabilitySlots] = useState<{ slot_time: string; label: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsLoadError, setSlotsLoadError] = useState(false);
  const scrollAfterSlotsLoadRef = useRef(false);

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
  const scrollToTimeSection = useCallback(() => {
    requestAnimationFrame(() => {
      if (!timeSectionRef.current || !scrollContentRef.current) return;
      timeSectionRef.current.measureLayout(
        scrollContentRef.current,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
        },
        () => {}
      );
    });
  }, []);

  const getBookingDuration = useCallback((): number => {
    if (!selectedService) return MIN_BOOKING_HOURS;
    if (isWindowCategory(selectedCategory)) return getEffectiveHours(selectedHours);
    if (isDeepPackageService(selectedService.id)) return MIN_BOOKING_HOURS;
    if (selectedHours) return Math.max(MIN_BOOKING_HOURS, selectedHours);
    const meta = PACKAGE_SERVICE_ASSETS[selectedService.id];
    if (meta) return Math.max(MIN_BOOKING_HOURS, meta.hoursMax);
    return MIN_BOOKING_HOURS;
  }, [selectedService, selectedCategory, selectedHours]);

  const bookingDuration = useMemo(() => getBookingDuration(), [getBookingDuration]);

  const fetchAvailabilitySlots = useCallback(async (iso: string) => {
    setLoadingSlots(true);
    setSlotsLoadError(false);
    setAvailabilitySlots([]);
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_date: iso,
        p_duration_hours: getBookingDuration(),
      });
      if (error) throw error;
      if (Array.isArray(data)) {
        setAvailabilitySlots(data);
        setServiceTime(prev => {
          if (!prev) return prev;
          const slot = data.find((s: { slot_time: string; available: boolean }) => s.slot_time === prev);
          return slot?.available ? prev : '';
        });
      }
    } catch (e) {
      console.error('Failed to load availability:', e);
      setSlotsLoadError(true);
    } finally {
      setLoadingSlots(false);
      if (scrollAfterSlotsLoadRef.current) {
        scrollAfterSlotsLoadRef.current = false;
        scrollToTimeSection();
      }
    }
  }, [getBookingDuration, scrollToTimeSection]);

  useEffect(() => {
    if (currentStep === 3 && serviceDate) {
      fetchAvailabilitySlots(serviceDate);
    }
  }, [currentStep, serviceDate, bookingDuration, fetchAvailabilitySlots]);
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
    setDeepPropertyType('villa');
    setServiceDate('');
    setServiceTime('');
    setShowDatePicker(false);
    setDateObj(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; });
    setSelectedAddressId(null);
    setUseNewAddress(false);
    setNewAddressForm({ ...EMPTY_ADDRESS_FORM });
    setAdditionalNotes('');
    setPaymentMethod('cash');
    setBookingId(null);
    setAddonCategory('cleaning');
    setAvailabilitySlots([]);
    setLoadingSlots(false);
    setSlotsLoadError(false);
    scrollAfterSlotsLoadRef.current = false;
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
    } else if (selectedCategory === 'specialized') {
      setSelectedService(services.find(s => s.id === WINDOW_SERVICE_ID) ?? null);
    }
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

  const handleSelectDeepPackage = (serviceId: number, propertyType: 'villa' | 'townhouse') => {
    setDeepPropertyType(propertyType);
    const svc = services.find(s => s.id === serviceId);
    if (svc) setSelectedService(svc);
  };

  const handleSelectPostConstruction = () => {
    const svc = services.find(s => s.id === 30);
    if (svc) setSelectedService(svc);
  };

  // ─── Pricing ──────────────────────────────────────────────────────────────────
  const calcPricing = () => {
    const addonsTotal = Math.round(selectedAddons.reduce((s, a) => s + a.price, 0));
    if (!selectedService) {
      return { base: 0, weekendSurcharge: 0, addonsTotal, subtotal: 0, vat: 0, cashFee: 0, total: 0 };
    }
    return calcBookingPricing({
      selectedCategory,
      selectedService,
      selectedPropertySize,
      selectedCleaners,
      selectedHours,
      ownMaterials,
      serviceDate,
      selectedAddonsTotal: addonsTotal,
      paymentMethod,
      deepPropertyType,
      isDeepPackage: isDeepPackageService(selectedService.id),
    });
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
      if (!selectedCategory) return { ok: false, msg: t('booking.validation.selectCategory', 'Please select a service category') };
      if (selectedCategory === 'specialized') {
        return { ok: !!selectedService };
      }
      if (selectedCategory === 'packages' && !selectedService)
        return { ok: false, msg: t('booking.validation.selectService', 'Please select a specific service') };
      return { ok: true };
    }
    if (currentStep === 2) {
      if (!selectedService) return { ok: false, msg: t('alerts.pleaseSelectService', 'Please select a service first') };

      if (isWindowCategory(selectedCategory)) {
        if (!selectedHours || selectedHours < MIN_BOOKING_HOURS) {
          return { ok: false, msg: t('booking.validation.minHours', 'Minimum booking duration is 2 hours') };
        }
        return { ok: true };
      }

      if (isDeepPackageService(selectedService.id)) {
        return { ok: true };
      }

      if (selectedService.price_per_hour && selectedCategory !== 'packages') {
        if (!selectedPropertySize) return { ok: false, msg: t('alerts.pleaseSelectPropertySize', 'Please select property size') };
        if (!selectedCleaners) return { ok: false, msg: t('alerts.pleaseCompleteServiceConfig', 'Please select number of cleaners') };
        if (!selectedHours || selectedHours < MIN_BOOKING_HOURS) {
          return { ok: false, msg: t('booking.validation.minHours', 'Minimum booking duration is 2 hours') };
        }
      }
      return { ok: true };
    }
    if (currentStep === 3) {
      if (isGuest && !user) {
        Alert.alert(t('ui.signUpRequired', 'Sign Up Required'), t('ui.bookingFlow.signUpToBook', 'Please create an account to complete your booking.'), [
          { text: t('navigation.cancel', 'Cancel'), style: 'cancel' },
          { text: t('ui.signUp', 'Sign Up'), onPress: goToAuth },
        ]);
        return { ok: false };
      }
      if (!serviceDate) return { ok: false, msg: t('booking.validation.selectDateTime', 'Please select a date') };
      if (!serviceTime) return { ok: false, msg: t('booking.validation.selectDateTime', 'Please select a time slot') };
      return { ok: true };
    }
    if (currentStep === 4) {
      if (!customerName.trim()) return { ok: false, msg: t('ui.authExtra.validationName', 'Please enter your name') };
      if (!customerPhone.trim()) return { ok: false, msg: t('ui.authExtra.validationPhone', 'Please enter your phone number') };
      if (!useNewAddress && !selectedAddressId) return { ok: false, msg: t('alerts.pleaseSelectAddress', 'Please select or add an address') };
      if (useNewAddress && !newAddressForm.detectedAddress.trim() && !newAddressForm.apartment.trim()) {
        return { ok: false, msg: t('ui.addresses.searchOrMoveMap', 'Please search or move the map to set your address') };
      }
      return { ok: true };
    }
    return { ok: true };
  };

  const goNext = () => {
    const { ok, msg } = canGoNext();
    if (!ok) { if (msg) Alert.alert(t('ui.bookingFlow.missingInfo', 'Missing Info'), msg); return; }
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
      const duration = getBookingDuration();

      const deepTypeNote = VILLA_DEEP_PACKAGES.some(p => p.serviceId === selectedService.id)
        ? `Property type: ${deepPropertyType === 'townhouse' ? 'Townhouse' : 'Villa'}`
        : '';
      const addressNotes = useNewAddress ? newAddressForm.notes.trim() : '';
      const combinedNotes = [additionalNotes.trim(), addressNotes, deepTypeNote].filter(Boolean).join('\n');

      const bookingData: Record<string, any> = {
        customer_id: user.id,
        service_id: selectedService.id,
        address_id: useNewAddress ? null : selectedAddressId,
        custom_address: useNewAddress ? formatAddressFormValue(newAddressForm) : null,
        requested_date: serviceDate,
        requested_time: serviceTime,
        service_date: serviceDate,
        service_time: serviceTime,
        duration_hours: duration,
        property_size: isWindowCategory(selectedCategory) ? null : (selectedPropertySize || null),
        size_price: null,
        cleaners_count: isWindowCategory(selectedCategory) ? 1 : cleaners,
        own_materials: ownMaterials,
        window_panels_count: null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        additional_notes: combinedNotes || null,
        special_instructions: combinedNotes || null,
        base_price: pricing.base,
        addons_total: pricing.addonsTotal,
        total_price: pricing.subtotal,
        vat_amount: pricing.vat,
        cash_fee: pricing.cashFee,
        total_cost: pricing.total,
        status: 'pending',
      };

      // ── Step A: Insert the booking (pending) ──────────────────────────────
      const { data: insertData, error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select();
      if (insertError) { Alert.alert(t('ui.bookingFlow.bookingFailed', 'Booking Failed'), insertError.message); return; }

      const newBookingId = insertData?.[0]?.id;
      if (!newBookingId) { Alert.alert(t('ui.bookingFlow.bookingFailed', 'Booking Failed'), t('ui.bookingFlow.noBookingId', 'No booking ID returned.')); return; }

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
      Alert.alert(t('common.error', 'Error'), err?.message || t('alerts.errorCreatingBooking', 'Failed to create booking. Please try again.'));
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
    if (!iso) return t('ui.bookingFlow.selectDate', 'Select date');
    return formatLocalizedDate(iso, i18n.language);
  };

  const formatTimeLabel = (slot: string) => formatLocalizedTime(slot, i18n.language);

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
    const pkgCopy = getPackageCopy(t, packageModalService.id, i18n.language);

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
                  <Text style={bs.popularPillText}>{t('ui.home.popularBadge', '⭐ Popular')}</Text>
                </View>
              )}

              {/* Service name */}
              <Text style={bs.serviceName}>{packageModalService.name}</Text>

              {/* Rich description */}
              <Text style={bs.serviceDesc}>{pkgCopy.richDescription}</Text>

              {/* What's included */}
              <Text style={bs.inclTitle}>{t('ui.home.whatIncluded', 'What is included:')}</Text>
              {pkgCopy.inclusions.map((item, i) => (
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
                  <Text style={bs.infoBadgeText}>{t('ui.home.hoursRange', '⏱  {{min}}–{{max}} hours', { values: { min: meta.hoursMin, max: meta.hoursMax } })}</Text>
                </View>
                <View style={bs.infoBadge}>
                  <Text style={bs.infoBadgeText}>
                    {tPlural('ui.home.cleanersCount', meta.cleaners, `👷  ${meta.cleaners} cleaner`)}
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
                    {t('ui.bookingFlow.addToBooking', 'Add to Booking — {{price}} AED', { values: { price: Math.round(Number(packageModalService.base_price)) } })}
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
          <SectionHeader title={t('booking.steps.selectService', 'Select Your Service')} subtitle={t('booking.steps.selectServiceDesc', 'Choose from our professional cleaning services')} />
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
                <Text style={s.categoryTitle}>{t(`ui.bookingFlow.categories.${cat.key}`, cat.key)}</Text>
                <Text style={s.categoryPrice}>{t('ui.bookingFlow.fromPrice', 'From {{price}} AED', { values: { price: cat.priceAmount } })}</Text>
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
                  {t(`ui.bookingFlow.${cat.key}`, cat.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Packages: 2-column icon grid ── */}
          {selectedCategory === 'packages' && (
            <DeepCleaningPackagesSection
              t={t}
              selectedServiceId={selectedService?.id ?? null}
              deepPropertyType={deepPropertyType}
              onSelectPackage={handleSelectDeepPackage}
              onSelectPostConstruction={handleSelectPostConstruction}
            />
          )}

          {selectedCategory === 'specialized' && (
            <View style={s.windowInfoCard}>
              <Text style={s.windowInfoTitle}>
                {t('ui.bookingFlow.windowHourlyTitle', 'Window Cleaning')}
              </Text>
              <Text style={s.windowInfoPrice}>
                {t('ui.bookingFlow.windowHourlyRate', '{{rate}} AED / hour · min {{min}} hours', {
                  values: { rate: WINDOW_HOURLY_RATE, min: MIN_BOOKING_HOURS },
                })}
              </Text>
              <Text style={s.windowInfoHint}>
                {t('ui.bookingFlow.windowHourlyHint', 'Choose duration in the next step. Weekend surcharge +5 AED/hour applies Sat–Sun.')}
              </Text>
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
                  <Text style={s.categoryBannerTitle}>{t(`ui.bookingFlow.categories.${selectedCategory}`, selectedCategory)}</Text>
                  <Text style={s.categoryBannerSubtitle}>{t('ui.bookingFlow.fromPrice', 'From {{price}} AED', { values: { price: SERVICE_CATEGORIES.find(c => c.key === selectedCategory)?.priceAmount ?? 0 } })}</Text>
                </View>
              </LinearGradient>
              <View style={s.selectedServiceBanner}>
                <Text style={s.selectedServiceText}>{t('ui.bookingFlow.serviceSelected', '✅ {{name}} selected', { values: { name: selectedService.name } })}</Text>
                <Text style={s.selectedServiceHint}>{t('ui.bookingFlow.configureNextStep', 'Configure details in the next step')}</Text>
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
    if (!selectedService) return <View><Text style={s.emptyText}>{t('ui.bookingFlow.selectServiceFirst', 'Go back and select a service first.')}</Text></View>;
    const isWindow = isWindowCategory(selectedCategory);
    const isDeepPkg = isDeepPackageService(selectedService.id);
    const isHourly = !!selectedService.price_per_hour && selectedCategory !== 'packages' && !isDeepPkg;

    return (
      <View>
        <SectionHeader title={t('ui.bookingFlow.configureService', 'Configure Your Service')} subtitle={t('ui.bookingFlow.configureSubtitle', 'Choose your preferences and add-ons')} />

        {isDeepPkg && (
          <View style={s.infoBox}>
            <Text style={s.infoBoxText}>
              {t('ui.deepCleaning.packageSelected', 'Deep cleaning package selected. See scope of work on the previous step.')}
            </Text>
            {serviceDate && isWeekendDate(serviceDate) && (
              <Text style={[s.infoBoxText, { marginTop: 6 }]}>
                {t('ui.bookingFlow.weekendNote', 'Weekend surcharge +5 AED/hour applies to hourly services only.')}
              </Text>
            )}
          </View>
        )}

        {isWindow && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>{t('ui.bookingFlow.durationHours', '⏱ Duration (Hours)')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }} contentContainerStyle={{ paddingHorizontal: 4 }}>
              <View style={[s.chipRow, { flexWrap: 'nowrap' }]}>
                {[2, 3, 4, 5, 6, 7, 8].map(h => (
                  <Chip
                    key={h}
                    label={`${h}h`}
                    selected={selectedHours === h}
                    onPress={() => setSelectedHours(h)}
                  />
                ))}
              </View>
            </ScrollView>
            {selectedHours && (
              <View style={s.pricePreview}>
                <Text style={s.pricePreviewLabel}>{t('ui.bookingFlow.estimatedPrice', 'Estimated Price')}</Text>
                <Text style={s.pricePreviewValue}>
                  {Math.round(selectedHours * WINDOW_HOURLY_RATE + (serviceDate && isWeekendDate(serviceDate) ? selectedHours * 5 : 0))} {t('ui.aed', 'AED')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Property size */}
        {!isWindow && !isDeepPkg && isHourly && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>{t('ui.bookingFlow.propertySize', '🏠 Property Size')}</Text>
            <View style={s.grid2}>
              {PROPERTY_SIZES.map(opt => (
                <TouchableOpacity
                  key={opt.size}
                  style={[s.sizeCard, selectedPropertySize === opt.size && s.sizeCardSelected]}
                  onPress={() => { setSelectedPropertySize(opt.size); setSelectedCleaners(null); setSelectedHours(null); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.sizeLabel, selectedPropertySize === opt.size && s.sizeLabelSelected]}>{translatePropertySize(t, opt.size)}</Text>
                  <Text style={[s.sizeDetail, selectedPropertySize === opt.size && s.sizeDetailSelected]}>{opt.details}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Materials */}
        {selectedService && !isWindow && !isDeepPkg && isHourly && !!selectedPropertySize && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>{t('ui.bookingFlow.materialsTitle', '🧴 Cleaning Materials')}</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleOption, !ownMaterials && s.toggleOptionSelected]}
                onPress={() => handleMaterials(false)}
                activeOpacity={0.75}
              >
                <Text style={[s.toggleText, !ownMaterials && s.toggleTextSelected]}>{t('ui.bookingFlow.cleanersProvide', 'Cleaners Provide')}</Text>
                <Text style={[s.toggleHint, !ownMaterials && s.toggleHintSelected]}>{t('ui.bookingFlow.professionalSupplies', 'Professional supplies')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleOption, ownMaterials && s.toggleOptionSelected]}
                onPress={() => handleMaterials(true)}
                activeOpacity={0.75}
              >
                <Text style={[s.toggleText, ownMaterials && s.toggleTextSelected]}>{t('ui.bookingFlow.useOwnMaterials', 'Use Own Materials')}</Text>
                <Text style={[s.toggleHint, ownMaterials && s.toggleHintSelected]}>{t('ui.bookingFlow.lowerCost', 'Lower cost option')}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.ecoNote}>
              <Text style={s.ecoNoteText}>{t('ui.bookingFlow.ecoMaterials', '🌿 Our materials are powered by TCL eco-friendly supplies')}</Text>
            </View>
          </View>
        )}

        {/* Cleaners */}
        {!isWindow && isHourly && !!selectedPropertySize && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>{t('ui.bookingFlow.numCleaners', '👷 Number of Cleaners')}</Text>
            <View style={s.chipRow}>
              {[1, 2, 3, 4].map(n => {
                const rec = getRecommendation(getServiceKey(selectedService.name), selectedPropertySize!).recommended_cleaners;
                return (
                  <Chip
                    key={n}
                    label={tPlural('booking.cleaners', n, `${n} cleaner`)}
                    selected={selectedCleaners === n}
                    recommended={n === rec}
                    bestLabel={t('ui.best', 'Best')}
                    onPress={() => { setSelectedCleaners(n); setSelectedHours(null); }}
                  />
                );
              })}
            </View>
            {selectedCleaners && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxText}>
                  💡 {selectedCleaners === 1
                    ? t('ui.bookingFlow.singleCleanerHint', 'Single cleaner - great for small spaces')
                    : t(
                        `ui.bookingFlow.efficiencyMsg${selectedCleaners}`,
                        getRecommendation(getServiceKey(selectedService.name), selectedPropertySize!, selectedCleaners).efficiency_message,
                      )}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Hours */}
        {!isWindow && isHourly && !!selectedPropertySize && !!selectedCleaners && (
          <View style={s.configSection}>
            <Text style={s.configLabel}>{t('ui.bookingFlow.durationHours', '⏱ Duration (Hours)')}</Text>
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
                    <Chip key={h} label={`${h}h`} selected={selectedHours === h} recommended={h === rec} bestLabel={t('ui.best', 'Best')} onPress={() => setSelectedHours(h)} />
                  );
                })}
              </View>
            </ScrollView>
            {selectedHours && selectedCleaners && selectedPropertySize && (
              <View style={s.pricePreview}>
                <Text style={s.pricePreviewLabel}>{t('ui.bookingFlow.estimatedPrice', 'Estimated Price')}</Text>
                <Text style={s.pricePreviewValue}>
                  {calcPricing().subtotal - calcPricing().addonsTotal} {t('ui.aed', 'AED')}
                </Text>
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
                <Text style={s.carouselTitle}>{t('ui.bookingFlow.extraServices', '✦  Extra Services')}</Text>
                <Text style={s.carouselSubtitle}>{t('ui.bookingFlow.extraServicesSubtitle', 'Enhance your cleaning experience')}</Text>
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
                      {t(`ui.bookingFlow.addonCategories.${cat.key}`, cat.key)}
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
                          <Text style={s.addonCard2Price}>{addon.price} {t('ui.aed', 'AED')}</Text>
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
                  <Text style={s.selectedAddonsTitle}>{t('ui.bookingFlow.selectedAddons', 'Selected Add-ons')}</Text>
                  {selectedAddons.map(addon => (
                    <View key={addon.id} style={s.selectedAddonRow}>
                      <Text style={s.selectedAddonName}>{addon.name}</Text>
                      <View style={s.selectedAddonRight}>
                        <Text style={s.selectedAddonPrice}>{addon.price} {t('ui.aed', 'AED')}</Text>
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

    const DOW = getDayNamesShort(t);
    const MONTH_NAMES = getMonthNames(t);

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

    const handleDaySelect = (iso: string) => {
      setServiceDate(iso);
      setServiceTime('');
      scrollAfterSlotsLoadRef.current = true;

      const [y, mo] = iso.split('-').map(Number);
      setCalViewYear(y);
      setCalViewMonth(mo - 1);

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
        <View ref={timeSectionRef} collapsable={false}>
        <Text style={s.calSectionTitle}>
          {serviceDate ? t('ui.bookingFlow.availableTimes', 'Available Times') : t('ui.bookingFlow.preferredTime', 'Preferred Time')}
        </Text>

        {loadingSlots ? (
          /* Skeleton while fetching */
          <View style={[s.calTimeGrid, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
            <ActivityIndicator color="#22D3EE" size="small" />
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 8 }}>
              {t('ui.bookingFlow.checkingAvailability', 'Checking availability…')}
            </Text>
          </View>
        ) : slotsLoadError ? (
          <View style={[s.calTimeGrid, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
              {t('ui.bookingFlow.slotsLoadFailed', 'Could not load available times. Please try again.')}
            </Text>
            <TouchableOpacity
              style={[s.calTimeSlot, { minWidth: 120 }]}
              onPress={() => serviceDate && fetchAvailabilitySlots(serviceDate)}
              activeOpacity={0.75}
            >
              <Text style={s.calTimeSlotText}>{t('ui.bookingFlow.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : availabilitySlots.length > 0 ? (
          <View style={s.calTimeGrid}>
            {availabilitySlots.map(slot => {
              const isoTime = slot.slot_time;
              const isActive = serviceTime === isoTime;
              return (
                <TouchableOpacity
                  key={slot.slot_time}
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
                    <Text style={s.calTimeSlotFullLabel}>{t('ui.full', 'Full')}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : serviceDate ? (
          <View style={[s.calTimeGrid, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' }}>
              {t('ui.bookingFlow.noSlotsAvailable', 'No available times for this date. Try another day.')}
            </Text>
          </View>
        ) : (
          <View style={[s.calTimeGrid, { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }]}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' }}>
              {t('ui.bookingFlow.selectDateForTimes', 'Select a date above to see available times.')}
            </Text>
          </View>
        )}
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View>
        <SectionHeader title={t('ui.bookingFlow.yourDetails', 'Your Details')} subtitle={t('ui.bookingFlow.contactSubtitle', "We'll use this to confirm your booking")} />

        {/* Contact */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>{t('ui.bookingFlow.contactInfo', '👤 Contact Information')}</Text>
          <View style={s.inputWrap}>
            <Text style={s.inputLabel}>{t('ui.bookingFlow.fullNameRequired', 'Full Name *')}</Text>
            <TextInput
              style={s.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder={t('placeholders.enterYourFullName', 'Your full name')}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={s.inputWrap}>
            <Text style={s.inputLabel}>{t('ui.bookingFlow.phoneRequired', 'Phone Number *')}</Text>
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
          <Text style={s.configLabel}>{t('ui.bookingFlow.serviceAddress', '📍 Service Address')}</Text>
          <View style={s.toggleRow}>
            {addresses.length > 0 && (
              <TouchableOpacity
                style={[s.toggleOption, !useNewAddress && s.toggleOptionSelected]}
                onPress={() => setUseNewAddress(false)}
                activeOpacity={0.75}
              >
                <Text style={[s.toggleText, !useNewAddress && s.toggleTextSelected]}>{t('ui.bookingFlow.savedAddress', 'Saved Address')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.toggleOption, (useNewAddress || addresses.length === 0) && s.toggleOptionSelected]}
              onPress={() => setUseNewAddress(true)}
              activeOpacity={0.75}
            >
              <Text style={[s.toggleText, (useNewAddress || addresses.length === 0) && s.toggleTextSelected]}>{t('ui.bookingFlow.newAddress', 'New Address')}</Text>
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
                    {addr.is_default && <Text style={s.addressDefault}>{t('ui.default', 'Default')}</Text>}
                  </View>
                  <View style={[s.radio, selectedAddressId === addr.id && s.radioSelected]}>
                    {selectedAddressId === addr.id && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <AddressMapForm
              variant="embedded"
              value={newAddressForm}
              onChange={setNewAddressForm}
            />
          )}
        </View>

        {/* Notes */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>{t('ui.bookingFlow.additionalNotes', '📝 Additional Notes (Optional)')}</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder={t('booking.notesPlaceholder', 'Any special instructions, access codes, or requests...')}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment method */}
        <View style={s.configSection}>
          <Text style={s.configLabel}>{t('ui.bookingFlow.paymentMethod', '💳 Payment Method')}</Text>
          <View style={s.infoBox}>
            <Text style={s.infoBoxText}>💡 {t('ui.bookingFlow.cashOnlyInfo', 'Currently only cash payment is available. Card and digital payments coming soon.')}</Text>
          </View>
          {/* Cash - active */}
          <TouchableOpacity
            style={[s.paymentOption, paymentMethod === 'cash' && s.paymentOptionSelected]}
            onPress={() => setPaymentMethod('cash')}
            activeOpacity={0.75}
          >
            <Text style={s.paymentIcon}>💵</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.paymentLabel, paymentMethod === 'cash' && s.paymentLabelSelected]}>{t('ui.bookingFlow.cashOnService', 'Cash on Service')}</Text>
              <Text style={s.paymentHint}>{t('ui.bookingFlow.cashOnServiceDesc', 'Pay when the cleaner arrives (+5 AED fee)')}</Text>
            </View>
            <View style={[s.radio, paymentMethod === 'cash' && s.radioSelected]}>
              {paymentMethod === 'cash' && <View style={s.radioDot} />}
            </View>
          </TouchableOpacity>
          {/* Apple Pay - disabled */}
          <View style={[s.paymentOption, s.paymentOptionDisabled]}>
            <Text style={s.paymentIcon}>🍎</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentLabelDisabled}>{t('ui.bookingFlow.applePay', 'Apple Pay')}</Text>
              <Text style={s.paymentHint}>{t('ui.comingSoon', 'Coming Soon')}</Text>
            </View>
            <View style={s.badge2}><Text style={s.badge2Text}>{t('ui.soon', 'Soon')}</Text></View>
          </View>
          {/* Tabby - disabled */}
          <View style={[s.paymentOption, s.paymentOptionDisabled]}>
            <Text style={s.paymentIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentLabelDisabled}>{t('ui.bookingFlow.tabby', 'Tabby (Buy Now, Pay Later)')}</Text>
              <Text style={s.paymentHint}>{t('ui.comingSoon', 'Coming Soon')}</Text>
            </View>
            <View style={s.badge2}><Text style={s.badge2Text}>{t('ui.soon', 'Soon')}</Text></View>
          </View>
        </View>

        {/* Order summary */}
        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>{t('ui.bookingFlow.orderReview', '📋 Order Review')}</Text>
          <View style={s.summaryRows}>
            <SummaryRow
              label={t('ui.bookingFlow.service', 'Service')}
              value={selectedService?.name ?? '—'}
            />
            {selectedPropertySize && !isWindowCategory(selectedCategory) && (
              <SummaryRow label={t('ui.bookingFlow.propertySize', 'Property Size')} value={translatePropertySize(t, selectedPropertySize)} />
            )}
            {selectedCleaners && !isWindowCategory(selectedCategory) && <SummaryRow label={t('ui.bookingFlow.cleaners', 'Cleaners')} value={`${selectedCleaners}`} />}
            {selectedHours && <SummaryRow label={t('ui.bookingFlow.duration', 'Duration')} value={tPlural('ui.bookingFlow.hoursCount', selectedHours, `${selectedHours} hour`)} />}
            {!isWindowCategory(selectedCategory) && !isDeepPackageService(selectedService?.id) && (
              <SummaryRow label={t('ui.bookingFlow.materials', 'Materials')} value={ownMaterials ? t('ui.bookingFlow.customerProvided', 'Customer provided') : t('ui.bookingFlow.cleanerProvided', 'Cleaner provided')} />
            )}
            {serviceDate && serviceTime && <SummaryRow label={t('ui.bookingFlow.dateTime', 'Date & Time')} value={`${formatDisplayDate(serviceDate)} ${t('ui.at', 'at')} ${formatTimeLabel(serviceTime)}`} />}
            {selectedAddons.length > 0 && <SummaryRow label={t('ui.bookingFlow.extraServicesLabel', 'Extra Services')} value={selectedAddons.map(a => a.name).join(', ')} />}
          </View>

          <View style={s.divider} />
          <Text style={s.summaryTitle}>{t('ui.bookingFlow.paymentSummary', '💰 Payment Summary')}</Text>
          <View style={s.summaryRows}>
            <SummaryRow label={t('ui.bookingFlow.servicePrice', 'Service Price')} value={`${pricing.base} ${t('ui.aed', 'AED')}`} />
            {pricing.weekendSurcharge > 0 && (
              <SummaryRow label={t('ui.bookingFlow.weekendSurcharge', 'Weekend surcharge')} value={`${pricing.weekendSurcharge} ${t('ui.aed', 'AED')}`} />
            )}
            {pricing.addonsTotal > 0 && <SummaryRow label={t('ui.bookingFlow.extraServicesLabel', 'Extra Services')} value={`${pricing.addonsTotal} ${t('ui.aed', 'AED')}`} />}
            <SummaryRow label={t('ui.bookingFlow.vat', 'VAT (5%)')} value={`${pricing.vat} ${t('ui.aed', 'AED')}`} />
            {pricing.cashFee > 0 && <SummaryRow label={t('ui.bookingFlow.cashFee', 'Cash Fee')} value={`${pricing.cashFee} ${t('ui.aed', 'AED')}`} />}
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{t('ui.bookingFlow.total', 'Total')}</Text>
            <Text style={s.totalValue}>{pricing.total} {t('ui.aed', 'AED')}</Text>
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
        <Text style={s.successTitle}>{t('ui.bookingFlow.bookingSuccess', 'Booking Submitted! 🎉')}</Text>
        <Text style={s.successSubtitle}>
          {t('ui.bookingFlow.bookingSuccessDesc', "Your booking #{{id}} is pending admin confirmation. We'll contact you shortly.", { values: { id: bookingId ?? '' } })}
        </Text>
        <View style={s.successDetails}>
          {serviceDate && <Text style={s.successDetail}>📅 {formatDisplayDate(serviceDate)}</Text>}
          {serviceTime && <Text style={s.successDetail}>🕐 {formatTimeLabel(serviceTime)}</Text>}
          {selectedService && <Text style={s.successDetail}>🧹 {selectedService.name}</Text>}
          <Text style={s.successDetail}>💰 {t('ui.bookingFlow.total', 'Total')}: {pricing.total} {t('ui.aed', 'AED')}</Text>
        </View>
        <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 20 }} />
        <Text style={s.successRedirect}>{t('ui.bookingFlow.redirecting', 'Redirecting to your bookings...')}</Text>
      </View>
    );
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>{t('ui.bookingFlow.loadingServices', 'Loading services...')}</Text>
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
          {currentStep === 1 ? t('ui.bookingFlow.chooseService', 'Choose Service')
            : currentStep === 2 ? t('ui.bookingFlow.serviceDetails', 'Service Details')
            : currentStep === 3 ? t('ui.bookingFlow.scheduleService', 'Schedule Your Service')
            : currentStep === 4 ? t('ui.bookingFlow.yourDetails', 'Your Details')
            : t('ui.bookingFlow.bookingConfirmed', 'Booking Confirmed')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={currentStep === 4 && useNewAddress}
      >
        <View ref={scrollContentRef} collapsable={false}>
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
        </View>
      </ScrollView>

      {/* Footer CTA */}
      {currentStep < 5 && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom + 80, 90) }]}>
          {/* Floating price */}
          {pricing.total > 0 && currentStep > 1 && (
            <View style={s.priceBar}>
              {currentStep === 3 ? (
                <Text style={s.priceBarCyan}>{t('ui.bookingFlow.estimatedTotalValue', 'Estimated Total: {{price}} AED', { values: { price: pricing.total } })}</Text>
              ) : (
                <>
                  <Text style={s.priceBarLabel}>{t('ui.bookingFlow.estimatedTotal', 'Estimated Total')}</Text>
                  <Text style={s.priceBarValue}>{pricing.total} {t('ui.aed', 'AED')}</Text>
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
                  {currentStep === 4 ? t('ui.bookingFlow.confirmBooking', '✓ Confirm Booking') : t('ui.bookingFlow.continue', 'Continue →')}
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

  serviceRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10, gap: 12 },
  serviceRowSelected: { borderColor: 'rgba(59,130,246,0.70)', backgroundColor: 'rgba(37,99,235,0.18)' },
  serviceRowDisabled: { opacity: 0.45 },
  serviceRowInfo: { flex: 1 },
  serviceRowName: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', marginBottom: 2 },
  serviceRowNameDisabled: { color: '#94A3B8' },
  serviceRowDesc: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  serviceRowPrice: { fontSize: 13, fontWeight: '700', color: '#38BDF8' },
  specializedHint: { fontSize: 12, color: '#94A3B8', marginBottom: 12, lineHeight: 18 },
  specializedGroupLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  windowInfoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.35)',
    backgroundColor: 'rgba(37,99,235,0.12)',
    marginTop: 8,
  },
  windowInfoTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 6 },
  windowInfoPrice: { fontSize: 14, fontWeight: '700', color: '#93C5FD', marginBottom: 6 },
  windowInfoHint: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.25)' },
  checkboxDisabled: { borderColor: 'rgba(255,255,255,0.12)' },
  checkboxMark: { color: '#38BDF8', fontSize: 13, fontWeight: '800' },
  radioDisabled: { borderColor: 'rgba(255,255,255,0.12)' },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
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
  addonCheckbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
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
