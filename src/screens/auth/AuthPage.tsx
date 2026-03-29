import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Button from '../../components/ui/Button';
import TextInput from '../../components/ui/TextInput';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimpleTranslation } from '../../utils/i18n';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the Terms and Conditions',
  }),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, loginAsGuest } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { t } = useSimpleTranslation();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      termsAccepted: false,
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      await signIn(data.email, data.password);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    try {
      await signUp(data.email, data.password, data.fullName);
      Alert.alert('Success', 'Account created! Please check your email to confirm.');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
    }
  };

  const switchToLogin = () => {
    setIsLogin(true);
    signupForm.reset();
  };

  const switchToSignup = () => {
    setIsLogin(false);
    loginForm.reset();
  };

  const handleGuestLogin = () => {
    loginAsGuest();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#2563EB', '#3B82F6']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authContainer}>
            {/* Logo */}
            <View style={styles.logo}>
              <Text style={styles.logoText}>SparklePro</Text>
              <Text style={styles.logoSubtext}>Professional Cleaning Services</Text>
            </View>

            {/* Toggle Buttons */}
            <View style={styles.toggleContainer}>
              <Button
                variant={isLogin ? 'primary' : 'selection'}
                selected={isLogin}
                size="md"
                onPress={switchToLogin}
                style={styles.toggleButton}
              >
                Login
              </Button>
              <Button
                variant={!isLogin ? 'primary' : 'selection'}
                selected={!isLogin}
                size="md"
                onPress={switchToSignup}
                style={styles.toggleButton}
              >
                Sign Up
              </Button>
            </View>

            {/* Forms */}
            {isLogin ? (
              <View style={styles.form}>
                <Controller
                  control={loginForm.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Email Address"
                      placeholder="Enter your email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={error?.message}
                      required
                    />
                  )}
                />

                <Controller
                  control={loginForm.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Password"
                      placeholder="Enter your password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      error={error?.message}
                      required
                      rightIcon={
                        <Button
                          variant="toggle"
                          active={showPassword}
                          size="sm"
                          onPress={() => setShowPassword(!showPassword)}
                          style={{ minWidth: 40, height: 30 }}
                        >
                          👁
                        </Button>
                      }
                    />
                  )}
                />

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={loginForm.handleSubmit(handleLogin)}
                  loading={loginForm.formState.isSubmitting}
                  style={styles.submitButton}
                >
                  Login
                </Button>

                <GoogleSignInButton style={styles.googleButton} />

                <Button
                  variant="nav-back"
                  size="md"
                  fullWidth
                  onPress={handleGuestLogin}
                  style={styles.guestButton}
                >
                  Continue as Guest
                </Button>
              </View>
            ) : (
              <View style={styles.form}>
                <Controller
                  control={signupForm.control}
                  name="fullName"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={error?.message}
                      required
                    />
                  )}
                />

                <Controller
                  control={signupForm.control}
                  name="email"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Email Address"
                      placeholder="Enter your email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={error?.message}
                      required
                    />
                  )}
                />

                <Controller
                  control={signupForm.control}
                  name="password"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <TextInput
                      label="Password"
                      placeholder="Create a password (min 6 characters)"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      error={error?.message}
                      required
                      rightIcon={
                        <Button
                          variant="toggle"
                          active={showPassword}
                          size="sm"
                          onPress={() => setShowPassword(!showPassword)}
                          style={{ minWidth: 40, height: 30 }}
                        >
                          👁
                        </Button>
                      }
                    />
                  )}
                />

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={signupForm.handleSubmit(handleSignup)}
                  loading={signupForm.formState.isSubmitting}
                  style={styles.submitButton}
                >
                  Sign Up
                </Button>

                <GoogleSignInButton text="Sign up with Google" style={styles.googleButton} />
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  form: {
    width: '100%',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  googleButton: {
    marginBottom: 12,
  },
  guestButton: {
    marginTop: 8,
  },
});

export default AuthPage;
