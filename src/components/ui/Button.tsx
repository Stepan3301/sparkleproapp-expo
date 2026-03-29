import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type ButtonVariant = 
  | 'primary'
  | 'secondary' 
  | 'nav-back'
  | 'nav-next'
  | 'signout'
  | 'view'
  | 'edit'
  | 'delete'
  | 'selection'
  | 'toggle'
  | 'fab';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  selected?: boolean;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: any;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  active = false,
  selected = false,
  children,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  loading = false,
  onPress,
  style,
}) => {
  const getGradientColors = (): string[] => {
    switch (variant) {
      case 'primary':
      case 'nav-next':
        return ['#2563EB', '#3B82F6'];
      case 'secondary':
        return ['#F59E0B', '#FBBF24'];
      case 'nav-back':
        return ['#EFF6FF', '#DBEAFE'];
      case 'signout':
        return ['#F24236', '#FF6B6B'];
      case 'view':
        return ['#17A2B8', '#6FDBF0'];
      case 'edit':
        return ['#F6AE2D', '#FFD93D'];
      case 'delete':
        return ['#F24236', '#FF8A80'];
      case 'selection':
        return selected ? ['#2563EB', '#3B82F6'] : ['#FFFFFF', '#EFF6FF'];
      case 'toggle':
        return active ? ['#10B981', '#34D399'] : ['#F59E0B', '#FBBF24'];
      case 'fab':
        return ['#2563EB', '#3B82F6'];
      default:
        return ['#2563EB', '#3B82F6'];
    }
  };

  const getTextColor = (): string => {
    if (variant === 'nav-back') return '#2563EB';
    if (variant === 'edit') return '#333333';
    if (variant === 'selection' && !selected) return '#2563EB';
    if (variant === 'fab' || variant === 'selection' && selected) return '#FFFFFF';
    if (variant === 'toggle' || variant === 'primary' || variant === 'secondary' || 
        variant === 'nav-next' || variant === 'signout' || variant === 'view' || 
        variant === 'delete') return '#FFFFFF';
    return '#FFFFFF';
  };

  const getBorderColor = (): string => {
    if (variant === 'nav-back') return 'rgba(37, 99, 235, 0.2)';
    if (variant === 'selection' && !selected) return '#DBEAFE';
    if (variant === 'selection' && selected) return '#2563EB';
    return 'transparent';
  };

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 16 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 18 },
  };

  const borderRadius = variant === 'fab' ? 28 : 20;

  const buttonContent = (
    <View style={[
      styles.buttonContent,
      { 
        borderRadius,
        borderWidth: variant === 'nav-back' || (variant === 'selection' && !selected) ? 2 : 0,
        borderColor: getBorderColor(),
        minWidth: fullWidth ? '100%' : variant === 'fab' ? 56 : 120,
        width: variant === 'fab' ? 56 : fullWidth ? '100%' : undefined,
        height: variant === 'fab' ? 56 : undefined,
        opacity: disabled ? 0.5 : 1,
      },
      style
    ]}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            borderRadius,
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }
        ]}
      >
        <View style={styles.buttonInner}>
          {loading ? (
            <ActivityIndicator color={getTextColor()} />
          ) : (
            <>
              {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
              <Text style={[styles.text, { color: getTextColor(), fontSize: sizeStyles[size].fontSize }]}>
                {children}
              </Text>
              {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  if (disabled || loading) {
    return buttonContent;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={fullWidth ? { width: '100%' } : undefined}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContent: {
    overflow: 'hidden',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
});

export default Button;
