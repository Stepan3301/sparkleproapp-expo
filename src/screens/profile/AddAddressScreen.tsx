import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'AddAddress'>;

// ── Dark map style ────────────────────────────────────────────────────────────
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a2a3a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d5080' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e6ea6' }] },
];

const LABELS = ['Home', 'Work', 'Parents', 'Other'] as const;
type Label = typeof LABELS[number];

const LABEL_ICONS: Record<Label, string> = {
  Home: 'home',
  Work: 'briefcase',
  Parents: 'heart',
  Other: 'add-circle',
};

const INITIAL_REGION: Region = {
  latitude: 25.0802,
  longitude: 55.1403,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

const AddAddressScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detect edit mode ──────────────────────────────────────────────────────
  const editAddress = route.params?.editAddress;
  const isEditMode = !!editAddress;

  // ── Initial values (pre-filled when editing) ──────────────────────────────
  const getInitialRegion = (): Region => {
    if (editAddress?.lat && editAddress?.lng) {
      return {
        latitude: editAddress.lat,
        longitude: editAddress.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
    }
    return INITIAL_REGION;
  };

  const [region, setRegion] = useState<Region>(getInitialRegion);
  const [apartment, setApartment] = useState(editAddress?.apartment ?? '');
  const [buildingName, setBuildingName] = useState(editAddress?.building_name ?? '');
  const [detectedAddress, setDetectedAddress] = useState(editAddress?.formatted_address ?? '');
  const [notes, setNotes] = useState(editAddress?.notes ?? '');
  const [label, setLabel] = useState<Label>((editAddress?.label as Label) ?? 'Home');
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Reverse geocode ──────────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!GOOGLE_KEY || GOOGLE_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        setDetectedAddress(data.results[0].formatted_address ?? '');
        const premise = data.results[0].address_components?.find(
          (c: any) => c.types.includes('premise') || c.types.includes('establishment')
        );
        if (premise) setBuildingName(premise.long_name);
      }
    } catch (_) {
      // silently ignore
    } finally {
      setGeocoding(false);
    }
  }, []);

  // ── Debounced region change ──────────────────────────────────────────────
  const handleRegionChangeComplete = useCallback(
    (r: Region) => {
      setRegion(r);
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeTimer.current = setTimeout(() => {
        reverseGeocode(r.latitude, r.longitude);
      }, 600);
    },
    [reverseGeocode]
  );

  useEffect(() => {
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, []);

  // ── Save / Update handler ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user?.id) { Alert.alert('Error', 'You must be logged in.'); return; }
    if (!detectedAddress && !apartment) {
      Alert.alert('Incomplete', 'Please search for an address or move the map pin.');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && editAddress) {
        // ── UPDATE existing address ────────────────────────────────────────
        const { error } = await supabase
          .from('addresses')
          .update({
            label,
            apartment: apartment || null,
            building_name: buildingName || null,
            street: detectedAddress,
            formatted_address: detectedAddress,
            notes: notes || null,
            lat: region.latitude,
            lng: region.longitude,
          })
          .eq('id', editAddress.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // ── INSERT new address ─────────────────────────────────────────────
        const { count } = await supabase
          .from('addresses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { error } = await supabase.from('addresses').insert({
          user_id: user.id,
          label,
          apartment: apartment || null,
          building_name: buildingName || null,
          street: detectedAddress,
          formatted_address: detectedAddress,
          notes: notes || null,
          lat: region.latitude,
          lng: region.longitude,
          city: 'Dubai',
          emirate: 'Dubai',
          country: 'AE',
          is_default: (count ?? 0) === 0,
        });

        if (error) throw error;
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── 1. MAP ─────────────────────────────────────────────────────────── */}
      <View style={[styles.mapContainer, { paddingTop: insets.top }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={getInitialRegion()}
          customMapStyle={darkMapStyle}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
        />

        {/* Fixed pin — tip anchored at exact map centre */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.pinCenteringBox}>
            <View style={styles.pinWrapper}>
              <View style={styles.pinGlow} />
              <Ionicons name="location" size={46} color="#00e5ff" />
            </View>
          </View>
        </View>

        {/* "Move map" hint */}
        <View style={styles.mapHintWrapper} pointerEvents="none">
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Move map to set location</Text>
          </View>
        </View>

        {/* Geocoding spinner */}
        {geocoding && (
          <View style={styles.geocodingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#00e5ff" />
          </View>
        )}

        {/* Header */}
        <View style={[styles.header, { top: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Address' : 'Add New Address'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ── 2. SEARCH BAR (outside ScrollView — avoids VirtualizedList nesting) */}
      <View style={styles.searchSection}>
        <GooglePlacesAutocomplete
          placeholder="Search for your address..."
          fetchDetails
          enablePoweredByContainer={false}
          minLength={2}
          onPress={(data, details = null) => {
            if (details?.geometry?.location) {
              const { lat, lng } = details.geometry.location;
              const newRegion: Region = {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              };
              mapRef.current?.animateToRegion(newRegion, 500);
              setRegion(newRegion);
              setDetectedAddress(details.formatted_address ?? data.description);
            }
          }}
          query={{ key: GOOGLE_KEY, language: 'en', components: 'country:ae' }}
          styles={{
            container: { flex: 0, zIndex: 20 },
            textInputContainer: styles.placesInputContainer,
            textInput: styles.placesInput,
            listView: styles.placesDropdown,
            row: styles.placesRow,
            description: styles.placesRowText,
            poweredContainer: { display: 'none' },
            separator: { height: 1, backgroundColor: 'rgba(0,229,255,0.08)' },
          }}
          renderLeftButton={() => (
            <Ionicons name="search" size={18} color="#8899aa" style={styles.searchIcon} />
          )}
        />
      </View>

      {/* ── 3. FORM ─────────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.form}
          contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ADDRESS DETAILS */}
          <Text style={styles.sectionLabel}>ADDRESS DETAILS</Text>

          <View style={styles.inputGroup}>
            {/* Apt / Villa */}
            <View style={styles.inputRow}>
              <View style={styles.inputIconBadge}>
                <Ionicons name="business" size={16} color="#00e5ff" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Apartment / Villa / Floor"
                placeholderTextColor="#4a5a6a"
                value={apartment}
                onChangeText={setApartment}
              />
            </View>

            <View style={styles.separator} />

            {/* Building name */}
            <View style={styles.inputRow}>
              <View style={styles.inputIconBadge}>
                <Ionicons name="layers" size={16} color="#00e5ff" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Building Name"
                placeholderTextColor="#4a5a6a"
                value={buildingName}
                onChangeText={setBuildingName}
              />
            </View>

            <View style={styles.separator} />

            {/* Street / Area */}
            <View style={styles.inputRow}>
              <View style={styles.inputIconBadge}>
                <Ionicons name="navigate" size={16} color="#00e5ff" />
              </View>
              <View style={styles.inputStack}>
                <Text style={styles.inputFloatLabel}>Street / Area</Text>
                <TextInput
                  style={[styles.input, styles.inputFilled]}
                  placeholder="Will be filled from map…"
                  placeholderTextColor="#4a5a6a"
                  value={detectedAddress}
                  onChangeText={setDetectedAddress}
                />
              </View>
            </View>

            <View style={styles.separator} />

            {/* Notes */}
            <View style={styles.inputRow}>
              <View style={[styles.inputIconBadge, { marginTop: 2 }]}>
                <Ionicons name="document-text" size={16} color="#00e5ff" />
              </View>
              <View style={styles.inputStack}>
                <Text style={styles.inputFloatLabel}>Additional Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Gate code, landmark, instructions..."
                  placeholderTextColor="#4a5a6a"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* LABEL */}
          <Text style={styles.sectionLabel}>LABEL</Text>
          <View style={styles.labelRow}>
            {LABELS.map((l) => {
              const active = label === l;
              return (
                <TouchableOpacity
                  key={l}
                  style={[styles.labelPill, active && styles.labelPillActive]}
                  onPress={() => setLabel(l)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={LABEL_ICONS[l] as any}
                    size={14}
                    color={active ? '#0d1b2a' : '#8899aa'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.labelText, active && styles.labelTextActive]}>{l}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            <LinearGradient
              colors={['#00e5ff', '#0097a7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnInner}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0d1b2a" />
              ) : (
                <>
                  <Text style={styles.saveBtnText}>
                    {isEditMode ? 'Save Changes' : 'Save Address'}
                  </Text>
                  <Ionicons
                    name={isEditMode ? 'checkmark-circle' : 'checkmark'}
                    size={18}
                    color="#0d1b2a"
                    style={{ marginLeft: 6 }}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AddAddressScreen;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1b2a' },
  flex: { flex: 1 },

  mapContainer: {
    height: '38%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0d1b2a',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13,27,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,229,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // Pin
  pinCenteringBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pinWrapper: {
    alignItems: 'center',
    transform: [{ translateY: -23 }],
  },
  pinGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,229,255,0.18)',
    top: -6,
  },

  // Map hint
  mapHintWrapper: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapHint: {
    backgroundColor: 'rgba(13,27,42,0.82)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.22)',
  },
  mapHintText: { color: '#cde8f0', fontSize: 13, fontWeight: '500' },

  geocodingOverlay: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(13,27,42,0.72)',
    borderRadius: 12,
    padding: 6,
  },

  // Search
  searchSection: {
    zIndex: 20,
    backgroundColor: '#0d1b2a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  placesInputContainer: {
    borderRadius: 14,
    backgroundColor: '#1a2a3a',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.22)',
    paddingHorizontal: 12,
    height: 48,
  },
  placesInput: {
    backgroundColor: 'transparent',
    color: '#e8f4f8',
    fontSize: 14,
    height: 46,
  },
  placesDropdown: {
    backgroundColor: '#1a2a3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
    marginTop: 4,
  },
  placesRow: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placesRowText: { color: '#cde8f0', fontSize: 13 },
  searchIcon: { alignSelf: 'center', marginRight: 8 },

  // Form
  form: { flex: 1 },
  formContent: { paddingHorizontal: 16, paddingTop: 14 },

  sectionLabel: {
    color: '#8899aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },

  inputGroup: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
    marginBottom: 22,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,229,255,0.08)',
    marginHorizontal: 14,
  },
  inputIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,229,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inputStack: { flex: 1 },
  inputFloatLabel: {
    color: '#8899aa',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    color: '#e8f4f8',
    fontSize: 14,
    paddingVertical: 0,
    minHeight: 28,
  },
  inputFilled: { flex: undefined, width: '100%' },
  textArea: {
    flex: undefined,
    width: '100%',
    minHeight: 72,
    lineHeight: 20,
  },

  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  labelPillActive: { backgroundColor: '#00e5ff', borderColor: '#00e5ff' },
  labelText: { color: '#8899aa', fontSize: 13, fontWeight: '600' },
  labelTextActive: { color: '#0d1b2a' },

  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  saveBtnInner: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#0d1b2a', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
