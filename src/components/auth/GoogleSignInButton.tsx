import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface GoogleSignInButtonProps {
  text?: string;
  style?: any;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ 
  text = 'Continue with Google',
  style
}) => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleGoogleSignIn}
      disabled={loading}
      style={[
        styles.button,
        loading && styles.buttonDisabled,
        style
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#4285F4" />
      ) : (
        <View style={styles.content}>
          <GoogleIcon />
          <Text style={styles.text}>{text}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const GoogleIcon: React.FC = () => {
  return (
    <View style={styles.iconContainer}>
      <View style={styles.icon}>
        {/* Google "G" icon - simplified version */}
        <Text style={styles.iconText}>G</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});

export default GoogleSignInButton;
