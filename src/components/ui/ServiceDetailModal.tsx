import React from 'react';
import { View, Text, Image, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './Button';
import DirhamIcon from './DirhamIcon';
import { useSimpleTranslation } from '../../utils/i18n';

interface ServiceDetailModalProps {
  service: {
    id: number;
    name: string;
    description: string;
    price_per_hour?: number | null;
    base_price?: number | null;
  } | null;
  serviceImage: string;
  isOpen: boolean;
  onClose: () => void;
  onBookNow: () => void;
}

const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  serviceImage,
  isOpen,
  onClose,
  onBookNow,
}) => {
  const { t } = useSimpleTranslation();
  const insets = useSafeAreaInsets();

  if (!service) return null;

  const getDisplayPrice = () => {
    if (service.id === 6 || service.id === 7) return '35';
    if (service.id === 8 || service.id === 9) return '45';
    return service.base_price?.toString() || '0';
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={[styles.modal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Service Image */}
            <Image
              source={{ uri: serviceImage || 'https://via.placeholder.com/400x300' }}
              style={styles.image}
              defaultSource={require('../../../assets/icon.png')}
            />

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.serviceName}>{service.name}</Text>
              
              <View style={styles.priceContainer}>
                <Text style={styles.fromText}>From </Text>
                <DirhamIcon size="md" />
                <Text style={styles.price}>{getDisplayPrice()}</Text>
                {service.price_per_hour && (
                  <Text style={styles.perHour}>/hour</Text>
                )}
              </View>

              <Text style={styles.description}>{service.description}</Text>

              {/* What's Included */}
              <View style={styles.includedSection}>
                <Text style={styles.includedTitle}>
                  {t('common.whatsIncluded', "What's Included")}
                </Text>
                <View style={styles.includedList}>
                  <Text style={styles.includedItem}>
                    ✓ {t('common.professionalCleaningEquipment', 'Professional cleaning equipment')}
                  </Text>
                  <Text style={styles.includedItem}>
                    ✓ {t('common.ecoFriendlyCleaningProducts', 'Eco-friendly cleaning products')}
                  </Text>
                  <Text style={styles.includedItem}>
                    ✓ {t('common.trainedAndInsuredCleaners', 'Trained and insured cleaners')}
                  </Text>
                  <Text style={styles.includedItem}>
                    ✓ {t('common.qualityGuarantee', 'Quality guarantee')}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="nav-back"
              size="md"
              onPress={onClose}
              style={styles.backButton}
            >
              {t('navigation.back', 'Back')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              onPress={onBookNow}
              style={styles.bookButton}
            >
              {t('common.bookNow', 'Book Now!')} 🚀
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 264,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fromText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  price: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '700',
    marginLeft: 4,
  },
  perHour: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  includedSection: {
    marginTop: 8,
  },
  includedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  includedList: {
    gap: 8,
  },
  includedItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backButton: {
    flex: 1,
  },
  bookButton: {
    flex: 2,
  },
});

export default ServiceDetailModal;
