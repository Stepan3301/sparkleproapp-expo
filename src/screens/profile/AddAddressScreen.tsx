import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useSimpleTranslation } from '../../utils/i18n';
import { RootStackParamList } from '../../navigation/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AddressMapForm, {
  AddressFormValue,
  AddressLabel,
  EMPTY_ADDRESS_FORM,
  INITIAL_MAP_REGION,
} from '../../components/address/AddressMapForm';

type Props = NativeStackScreenProps<RootStackParamList, 'AddAddress'>;

const AddAddressScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useSimpleTranslation();

  const editAddress = route.params?.editAddress;
  const isEditMode = !!editAddress;

  const [form, setForm] = useState<AddressFormValue>(() => {
    if (!editAddress) return { ...EMPTY_ADDRESS_FORM };
    return {
      apartment: editAddress.apartment ?? '',
      buildingName: editAddress.building_name ?? '',
      detectedAddress: editAddress.formatted_address ?? '',
      notes: editAddress.notes ?? '',
      latitude: editAddress.lat ?? INITIAL_MAP_REGION.latitude,
      longitude: editAddress.lng ?? INITIAL_MAP_REGION.longitude,
    };
  });
  const [label, setLabel] = useState<AddressLabel>((editAddress?.label as AddressLabel) ?? 'Home');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.id) { Alert.alert(t('common.error'), t('ui.addresses.mustLogin')); return; }
    if (!form.detectedAddress && !form.apartment) {
      Alert.alert(t('ui.addresses.incomplete'), t('ui.addresses.searchOrMoveMap'));
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && editAddress) {
        const { error } = await supabase
          .from('addresses')
          .update({
            label,
            apartment: form.apartment || null,
            building_name: form.buildingName || null,
            street: form.detectedAddress,
            formatted_address: form.detectedAddress,
            notes: form.notes || null,
            lat: form.latitude,
            lng: form.longitude,
          })
          .eq('id', editAddress.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { count } = await supabase
          .from('addresses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { error } = await supabase.from('addresses').insert({
          user_id: user.id,
          label,
          apartment: form.apartment || null,
          building_name: form.buildingName || null,
          street: form.detectedAddress,
          formatted_address: form.detectedAddress,
          notes: form.notes || null,
          lat: form.latitude,
          lng: form.longitude,
          city: 'Dubai',
          emirate: 'Dubai',
          country: 'AE',
          is_default: (count ?? 0) === 0,
        });
        if (error) throw error;
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message ?? t('ui.addresses.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.mapHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? t('ui.addresses.editAddress') : t('addresses.addNew')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <AddressMapForm
            value={form}
            onChange={setForm}
            variant="full"
            showLabelPicker
            label={label}
            onLabelChange={setLabel}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
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
                    {isEditMode ? t('ui.saveChanges') : t('addresses.save')}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1b2a' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  mapHeader: {
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
  },
  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
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
