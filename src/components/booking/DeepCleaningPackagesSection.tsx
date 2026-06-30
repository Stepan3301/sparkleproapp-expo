import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  APARTMENT_DEEP_PACKAGES,
  VILLA_DEEP_PACKAGES,
  POST_CONSTRUCTION_PACKAGE,
  SUMMER_OFFER_LABEL,
  DEEP_CLEANING_SCOPE_KEYS,
  getDeepPackagePrice,
  type DeepPackageOption,
} from '../../constants/deepCleaningPackages';

interface Props {
  t: (key: string, fallback?: string, opts?: { values?: Record<string, string | number> }) => string;
  selectedServiceId: number | null;
  deepPropertyType: 'villa' | 'townhouse';
  onSelectPackage: (serviceId: number, propertyType: 'villa' | 'townhouse') => void;
  onSelectPostConstruction: () => void;
}

export default function DeepCleaningPackagesSection({
  t,
  selectedServiceId,
  deepPropertyType,
  onSelectPackage,
  onSelectPostConstruction,
}: Props) {
  const [scopeVisible, setScopeVisible] = useState(false);
  const [localPropertyType, setLocalPropertyType] = useState<'villa' | 'townhouse'>(deepPropertyType);

  const renderPackageRow = (pkg: DeepPackageOption, showTownhouseToggle: boolean) => {
    const price = getDeepPackagePrice(pkg.serviceId, localPropertyType) ?? pkg.price;
    const isSelected = selectedServiceId === pkg.serviceId;

    return (
      <TouchableOpacity
        key={pkg.serviceId}
        style={[styles.pkgRow, isSelected && styles.pkgRowSelected]}
        onPress={() => onSelectPackage(pkg.serviceId, showTownhouseToggle ? localPropertyType : 'villa')}
        activeOpacity={0.78}
      >
        <View style={styles.pkgRowLeft}>
          <Text style={styles.pkgRowName}>
            {t(`ui.deepCleaning.${pkg.labelKey}`, pkg.labelFallback)}
          </Text>
          {pkg.isPopular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>{t('ui.popular', 'Popular')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.pkgRowPrice}>{price} {t('ui.aed', 'AED')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <View style={styles.summerBanner}>
        <Text style={styles.summerBannerText}>{SUMMER_OFFER_LABEL}</Text>
      </View>

      <TouchableOpacity onPress={() => setScopeVisible(true)} style={styles.scopeLink}>
        <Text style={styles.scopeLinkText}>
          {t('ui.deepCleaning.viewScope', 'View Deep Cleaning Scope of Work')}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('ui.deepCleaning.apartments', 'Apartments')}</Text>
      {APARTMENT_DEEP_PACKAGES.map(pkg => renderPackageRow(pkg, false))}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        {t('ui.deepCleaning.villas', 'Villas & Townhouses')}
      </Text>
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[styles.typeBtn, localPropertyType === 'villa' && styles.typeBtnActive]}
          onPress={() => setLocalPropertyType('villa')}
        >
          <Text style={[styles.typeBtnText, localPropertyType === 'villa' && styles.typeBtnTextActive]}>
            {t('ui.deepCleaning.villa', 'Villa')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, localPropertyType === 'townhouse' && styles.typeBtnActive]}
          onPress={() => setLocalPropertyType('townhouse')}
        >
          <Text style={[styles.typeBtnText, localPropertyType === 'townhouse' && styles.typeBtnTextActive]}>
            {t('ui.deepCleaning.townhouse', 'Townhouse')}
          </Text>
        </TouchableOpacity>
      </View>
      {VILLA_DEEP_PACKAGES.map(pkg => renderPackageRow(pkg, true))}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        {t('ui.deepCleaning.postConstruction', 'Post-construction Deep Cleaning')}
      </Text>
      <TouchableOpacity
        style={[styles.postCard, selectedServiceId === POST_CONSTRUCTION_PACKAGE.serviceId && styles.pkgRowSelected]}
        onPress={onSelectPostConstruction}
        activeOpacity={0.78}
      >
        <Text style={styles.postCardTitle}>
          {t('ui.deepCleaning.postConstructionTitle', POST_CONSTRUCTION_PACKAGE.labelFallback)}
        </Text>
        <Text style={styles.postCardPrice}>
          {t('ui.deepCleaning.startingFrom', 'Starting from: {{price}} AED', {
            values: { price: POST_CONSTRUCTION_PACKAGE.startingPrice },
          })}
        </Text>
      </TouchableOpacity>

      <Modal visible={scopeVisible} transparent animationType="slide" onRequestClose={() => setScopeVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {t('ui.deepCleaning.scopeTitle', 'Deep Cleaning Scope of Work')}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {DEEP_CLEANING_SCOPE_KEYS.map(key => (
                <View key={key} style={styles.scopeRow}>
                  <Text style={styles.scopeBullet}>•</Text>
                  <Text style={styles.scopeText}>
                    {t(`ui.deepCleaning.${key}`, '')}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setScopeVisible(false)} style={styles.modalCloseBtn}>
              <LinearGradient colors={['#2563EB', '#3B82F6']} style={styles.modalCloseGradient}>
                <Text style={styles.modalCloseText}>{t('common.close', 'Close')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summerBanner: {
    backgroundColor: 'rgba(251,191,36,0.18)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.45)',
  },
  summerBannerText: { color: '#FCD34D', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  scopeLink: { marginBottom: 14 },
  scopeLinkText: { color: '#60A5FA', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  pkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  pkgRowSelected: { borderColor: 'rgba(59,130,246,0.7)', backgroundColor: 'rgba(37,99,235,0.2)' },
  pkgRowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pkgRowName: { fontSize: 14, fontWeight: '600', color: '#F1F5F9' },
  pkgRowPrice: { fontSize: 14, fontWeight: '800', color: '#93C5FD' },
  popularBadge: { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  popularBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  typeBtnActive: { borderColor: 'rgba(59,130,246,0.7)', backgroundColor: 'rgba(37,99,235,0.25)' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  typeBtnTextActive: { color: '#93C5FD' },
  postCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  postCardTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 6 },
  postCardPrice: { fontSize: 14, fontWeight: '700', color: '#93C5FD' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0F1629',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F1F5F9', marginBottom: 14 },
  scopeRow: { flexDirection: 'row', marginBottom: 10, paddingRight: 8 },
  scopeBullet: { color: '#60A5FA', fontSize: 14, marginRight: 8, lineHeight: 20 },
  scopeText: { flex: 1, color: '#CBD5E1', fontSize: 13, lineHeight: 20 },
  modalCloseBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  modalCloseGradient: { paddingVertical: 14, alignItems: 'center' },
  modalCloseText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
