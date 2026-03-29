import React from 'react';
import {
  TouchableOpacity,
  Text,
  ImageBackground,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ServiceCardProps {
  service: {
    id: number;
    name: string;
    description: string;
    base_price: number;
    price_per_hour?: number | null;
    image_url: string;
  };
  onPress: () => void;
  showBadge?: boolean;
  badgeText?: string;
  style?: any;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onPress,
  showBadge = false,
  badgeText,
  style,
}) => {
  const getDisplayPrice = () => {
    if (service.id === 6 || service.id === 7) return '35';
    if (service.id === 8 || service.id === 9) return '45';
    return service.base_price.toString();
  };

  const imgSrc = service.image_url
    ? { uri: service.image_url }
    : { uri: 'https://images.unsplash.com/photo-1527515545081-5db817172677?w=400' };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <ImageBackground
        source={imgSrc}
        style={styles.imageBg}
        imageStyle={styles.imageStyle}
      >
        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(5,9,20,0.75)', 'rgba(5,9,20,0.95)']}
          locations={[0.3, 0.7, 1]}
          style={styles.overlay}
        >
          {showBadge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText || '#1'}</Text>
            </View>
          )}

          <Text style={styles.name} numberOfLines={2}>
            {service.name}
          </Text>

          <Text style={styles.price}>
            From {getDisplayPrice()} AED
          </Text>
        </LinearGradient>
      </ImageBackground>

      {/* Cyan border glow frame */}
      <View style={styles.borderFrame} pointerEvents="none" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    height: 190,
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    // Subtle cyan glow on iOS
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  imageBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: 20,
  },
  overlay: {
    borderRadius: 20,
    padding: 12,
    paddingTop: 40,
    justifyContent: 'flex-end',
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  price: {
    fontSize: 13,
    color: '#00FF88',
    fontWeight: '700',
  },
  borderFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
  },
});

export default ServiceCard;
