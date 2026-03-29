import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface DirhamIconProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'black' | 'white' | 'inherit';
}

const DirhamIcon: React.FC<DirhamIconProps> = ({ size = 'md', color = 'inherit' }) => {
  const sizeStyles = {
    sm: { fontSize: 12 },
    md: { fontSize: 16 },
    lg: { fontSize: 20 },
  };

  const colorStyles = {
    black: { color: '#000000' },
    white: { color: '#FFFFFF' },
    inherit: { color: 'inherit' },
  };

  return (
    <Text style={[styles.icon, sizeStyles[size], colorStyles[color]]}>
      د.إ
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontFamily: 'System',
    fontWeight: '600',
  },
});

export default DirhamIcon;
