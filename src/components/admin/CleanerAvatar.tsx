import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle, TextStyle } from 'react-native';

interface CleanerAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  textStyle?: TextStyle;
}

const CleanerAvatar: React.FC<CleanerAvatarProps> = ({
  name,
  avatarUrl,
  size = 48,
  style,
  imageStyle,
  textStyle,
}) => {
  const [failed, setFailed] = useState(false);
  const initial = name?.[0]?.toUpperCase() ?? '?';
  const showImage = !!avatarUrl && !failed;

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const radius = size / 2;

  if (showImage) {
    return (
      <Image
        source={{ uri: avatarUrl! }}
        style={[{ width: size, height: size, borderRadius: radius }, imageStyle]}
        onError={() => setFailed(true)}
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (!width || !height) setFailed(true);
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }, textStyle]}>{initial}</Text>
    </View>
  );
};

export default CleanerAvatar;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#38BDF8', fontWeight: '800' },
});
