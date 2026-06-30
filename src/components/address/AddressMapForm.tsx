import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import { useSimpleTranslation } from '../../utils/i18n';

export const ADDRESS_LABELS = ['Home', 'Work', 'Parents', 'Other'] as const;
export type AddressLabel = typeof ADDRESS_LABELS[number];

const LABEL_ICONS: Record<AddressLabel, string> = {
  Home: 'home',
  Work: 'briefcase',
  Parents: 'heart',
  Other: 'add-circle',
};

const LABEL_I18N: Record<AddressLabel, string> = {
  Home: 'ui.addresses.labels.home',
  Work: 'ui.addresses.labels.work',
  Parents: 'ui.addresses.labels.parents',
  Other: 'ui.addresses.labels.other',
};

export const DARK_MAP_STYLE = [
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

export const INITIAL_MAP_REGION: Region = {
  latitude: 25.0802,
  longitude: 55.1403,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export interface AddressFormValue {
  apartment: string;
  buildingName: string;
  detectedAddress: string;
  notes: string;
  latitude: number;
  longitude: number;
}

export const EMPTY_ADDRESS_FORM: AddressFormValue = {
  apartment: '',
  buildingName: '',
  detectedAddress: '',
  notes: '',
  latitude: INITIAL_MAP_REGION.latitude,
  longitude: INITIAL_MAP_REGION.longitude,
};

export function formatAddressFormValue(value: AddressFormValue): string {
  const street = value.detectedAddress.trim();
  const building = value.buildingName.trim();
  const apt = value.apartment.trim();
  const main = [building, street].filter(Boolean).join(', ');
  return [main, apt ? `Apt ${apt}` : ''].filter(Boolean).join(' · ');
}

interface AddressMapFormProps {
  value: AddressFormValue;
  onChange: (value: AddressFormValue) => void;
  variant?: 'full' | 'embedded';
  showLabelPicker?: boolean;
  label?: AddressLabel;
  onLabelChange?: (label: AddressLabel) => void;
}

const AddressMapForm: React.FC<AddressMapFormProps> = ({
  value,
  onChange,
  variant = 'full',
  showLabelPicker = false,
  label = 'Home',
  onLabelChange,
}) => {
  const { t } = useSimpleTranslation();
  const mapRef = useRef<MapView>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const patch = useCallback(
    (partial: Partial<AddressFormValue>) => onChange({ ...value, ...partial }),
    [onChange, value],
  );

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`,
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        const formatted = data.results[0].formatted_address ?? '';
        const premise = data.results[0].address_components?.find(
          (c: { types: string[]; long_name: string }) =>
            c.types.includes('premise') || c.types.includes('establishment'),
        );
        patch({
          detectedAddress: formatted,
          buildingName: premise?.long_name ?? value.buildingName,
        });
      }
    } catch {
      // ignore
    } finally {
      setGeocoding(false);
    }
  }, [patch, value.buildingName]);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      patch({ latitude: region.latitude, longitude: region.longitude });
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeTimer.current = setTimeout(() => {
        reverseGeocode(region.latitude, region.longitude);
      }, 600);
    },
    [patch, reverseGeocode],
  );

  useEffect(() => () => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
  }, []);

  const mapHeight = variant === 'embedded' ? 220 : undefined;
  const initialRegion: Region = {
    latitude: value.latitude,
    longitude: value.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={variant === 'embedded' ? styles.embeddedRoot : styles.fullRoot}>
      <View style={[styles.mapContainer, variant === 'embedded' ? { height: mapHeight } : styles.mapContainerFull]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          customMapStyle={DARK_MAP_STYLE}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
        />

        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.pinCenteringBox}>
            <View style={styles.pinWrapper}>
              <View style={styles.pinGlow} />
              <Ionicons name="location" size={variant === 'embedded' ? 38 : 46} color="#00e5ff" />
            </View>
          </View>
        </View>

        <View style={styles.mapHintWrapper} pointerEvents="none">
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>{t('ui.addresses.moveMap', 'Move map to set location')}</Text>
          </View>
        </View>

        {geocoding && (
          <View style={styles.geocodingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#00e5ff" />
          </View>
        )}
      </View>

      <View style={styles.searchSection}>
        <GooglePlacesAutocomplete
          placeholder={t('addresses.searchPlaceholder', 'Search for your address')}
          fetchDetails
          enablePoweredByContainer={false}
          minLength={2}
          onPress={(_data, details = null) => {
            if (details?.geometry?.location) {
              const { lat, lng } = details.geometry.location;
              const newRegion: Region = {
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              };
              mapRef.current?.animateToRegion(newRegion, 500);
              patch({
                latitude: lat,
                longitude: lng,
                detectedAddress: details.formatted_address ?? _data.description,
              });
            }
          }}
          query={{ key: GOOGLE_MAPS_KEY, language: 'en', components: 'country:ae' }}
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
          textInputProps={{
            placeholderTextColor: '#4a5a6a',
          }}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionLabel}>{t('ui.addresses.addressDetails', 'ADDRESS DETAILS')}</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <View style={styles.inputIconBadge}>
              <Ionicons name="business" size={16} color="#00e5ff" />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('ui.addresses.aptPlaceholder', 'Apt / Villa No.')}
              placeholderTextColor="#4a5a6a"
              value={value.apartment}
              onChangeText={(apartment) => patch({ apartment })}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <View style={styles.inputIconBadge}>
              <Ionicons name="layers" size={16} color="#00e5ff" />
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('ui.addresses.buildingPlaceholder', 'Building name')}
              placeholderTextColor="#4a5a6a"
              value={value.buildingName}
              onChangeText={(buildingName) => patch({ buildingName })}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <View style={styles.inputIconBadge}>
              <Ionicons name="navigate" size={16} color="#00e5ff" />
            </View>
            <View style={styles.inputStack}>
              <Text style={styles.inputFloatLabel}>{t('ui.addresses.streetArea', 'Street / Area')}</Text>
              <TextInput
                style={[styles.input, styles.inputFilled]}
                placeholder={t('ui.addresses.mapFilledPlaceholder', 'Filled from map or search')}
                placeholderTextColor="#4a5a6a"
                value={value.detectedAddress}
                onChangeText={(detectedAddress) => patch({ detectedAddress })}
              />
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.inputRow}>
            <View style={[styles.inputIconBadge, { marginTop: 2 }]}>
              <Ionicons name="document-text" size={16} color="#00e5ff" />
            </View>
            <View style={styles.inputStack}>
              <Text style={styles.inputFloatLabel}>{t('booking.additionalNotes', 'Additional Notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('ui.addresses.notesPlaceholder', 'Delivery instructions, landmarks...')}
                placeholderTextColor="#4a5a6a"
                value={value.notes}
                onChangeText={(notes) => patch({ notes })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {showLabelPicker && onLabelChange && (
          <>
            <Text style={styles.sectionLabel}>{t('ui.addresses.labelSection', 'LABEL')}</Text>
            <View style={styles.labelRow}>
              {ADDRESS_LABELS.map((l) => {
                const active = label === l;
                return (
                  <TouchableOpacity
                    key={l}
                    style={[styles.labelPill, active && styles.labelPillActive]}
                    onPress={() => onLabelChange(l)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={LABEL_ICONS[l] as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? '#0d1b2a' : '#8899aa'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.labelText, active && styles.labelTextActive]}>
                      {t(LABEL_I18N[l], l)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default AddressMapForm;

const styles = StyleSheet.create({
  fullRoot: { flex: 1 },
  embeddedRoot: { marginTop: 4 },

  mapContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0d1b2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
  },
  mapContainerFull: { height: 300 },

  pinCenteringBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pinWrapper: { alignItems: 'center', transform: [{ translateY: -23 }] },
  pinGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,229,255,0.18)',
    top: -6,
  },

  mapHintWrapper: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapHint: {
    backgroundColor: 'rgba(13,27,42,0.82)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.22)',
  },
  mapHintText: { color: '#cde8f0', fontSize: 12, fontWeight: '500' },

  geocodingOverlay: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(13,27,42,0.72)',
    borderRadius: 12,
    padding: 6,
  },

  searchSection: {
    zIndex: Platform.OS === 'ios' ? 20 : 1,
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
    maxHeight: 180,
  },
  placesRow: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  placesRowText: { color: '#cde8f0', fontSize: 13 },
  searchIcon: { alignSelf: 'center', marginRight: 8 },

  formSection: { paddingTop: 8 },
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
    marginBottom: 16,
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

  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
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
});
