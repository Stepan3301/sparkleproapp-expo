import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useSimpleTranslation } from '../../utils/i18n';

const { width } = Dimensions.get('window');

type LoginFormData = { email: string; password: string };
type SignupFormData = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  termsAccepted: boolean;
};

// ─── Glassmorphism Input ───────────────────────────────────────────────────────
interface StyledInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoComplete?: any;
  error?: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  rightElement?: React.ReactNode;
}

const StyledInput: React.FC<StyledInputProps> = ({
  label, value, onChangeText, onBlur, placeholder, secureTextEntry,
  keyboardType, autoCapitalize, autoComplete, error, iconName, rightElement,
}) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    onBlur?.();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.15)', '#60A5FA'],
  });

  return (
    <View style={inputStyles.wrapper}>
      <Text style={inputStyles.label}>{label}</Text>
      <Animated.View style={[inputStyles.inputContainer, { borderColor }]}>
        <Ionicons name={iconName} size={18} color={focused ? '#60A5FA' : '#64748B'} style={inputStyles.iconLeft} />
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
        />
        {rightElement && <View style={inputStyles.iconRight}>{rightElement}</View>}
      </Animated.View>
      {error ? <Text style={inputStyles.errorText}>{error}</Text> : null}
    </View>
  );
};

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  iconLeft: { marginRight: 10, width: 22, alignItems: 'center' },
  iconRight: { marginLeft: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#F1F5F9',
    paddingVertical: 0,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

// ─── Terms Modal ───────────────────────────────────────────────────────────────
const TermsModal = ({
  visible,
  onClose,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}) => {
  const sections = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 7].map((n) => ({
        title: t(`ui.authExtra.terms${n}Title`, `Terms section ${n}`),
        body: t(`ui.authExtra.terms${n}Body`, ''),
      })),
    [t],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={termsStyles.overlay}>
        <View style={termsStyles.container}>
          <LinearGradient colors={['#0D1B2A', '#162035']} style={termsStyles.header}>
            <Text style={termsStyles.headerTitle}>
              {t('ui.termsAndConditions', 'Terms and Conditions')}
            </Text>
            <TouchableOpacity onPress={onClose} style={termsStyles.closeBtn}>
              <Ionicons name="close" size={18} color="#F1F5F9" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={termsStyles.body} showsVerticalScrollIndicator={false}>
            {sections.map((section) => (
              <View key={section.title} style={termsStyles.section}>
                <Text style={termsStyles.sectionTitle}>{section.title}</Text>
                <Text style={termsStyles.sectionText}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={termsStyles.footer}>
            <TouchableOpacity onPress={onClose} style={termsStyles.acceptBtn}>
              <LinearGradient colors={['#2563EB', '#3B82F6']} style={termsStyles.acceptGradient}>
                <Text style={termsStyles.acceptBtnText}>
                  {t('ui.gotItClose', 'Got it, Close')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const termsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: 'rgba(13,21,38,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 6 },
  sectionText: { fontSize: 14, color: '#94A3B8', lineHeight: 21 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  acceptBtn: { borderRadius: 16, overflow: 'hidden' },
  acceptGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  acceptBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

// ─── Auth Screen ──────────────────────────────────────────────────────────────
interface AuthScreenProps {
  navigation: any;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useSimpleTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword,  setShowLoginPassword]  = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const sliderAnim    = useRef(new Animated.Value(0)).current;
  const cardFade      = useRef(new Animated.Value(1)).current;
  // Measured at runtime so the slider pill fits perfectly regardless of screen size
  const [tabRowWidth, setTabRowWidth] = useState(0);

  const { signIn, signUp, loginAsGuest } = useAuth();

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(3, t('ui.authExtra.validationLogin', 'Enter your email or login'))
          .refine(
            (v) => {
              const trimmed = v.trim();
              if (trimmed.includes('@')) return z.string().email().safeParse(trimmed).success;
              return /^[a-z0-9]{3,}$/.test(trimmed.toLowerCase());
            },
            t('ui.authExtra.validationLogin', 'Enter a valid email or login'),
          ),
        password: z.string().min(6, t('ui.authExtra.validationPassword', 'Password must be at least 6 characters')),
      }),
    [t],
  );

  const signupSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, t('ui.authExtra.validationName', 'Full name must be at least 2 characters')),
        email: z.string().email(t('ui.authExtra.validationEmail', 'Please enter a valid email address')),
        phone: z.string().min(7, t('ui.authExtra.validationPhone', 'Please enter a valid phone number')),
        password: z.string().min(6, t('ui.authExtra.validationPassword', 'Password must be at least 6 characters')),
        termsAccepted: z.boolean().refine((val) => val === true, {
          message: t('ui.authExtra.validationTerms', 'You must accept the Terms and Conditions'),
        }),
      }),
    [t],
  );

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { termsAccepted: false },
  });

  const switchTab = (toLogin: boolean) => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.spring(sliderAnim, { toValue: toLogin ? 0 : 1, useNativeDriver: true, tension: 60, friction: 10 }),
    ]).start(() => {
      setIsLogin(toLogin);
      if (toLogin) loginForm.reset();
      else signupForm.reset();
      Animated.timing(cardFade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      // AppNavigator auto-routes based on isAdmin / isGuest state —
      // no manual navigation needed here.
    } catch (error: any) {
      Alert.alert(
        t('ui.authExtra.loginFailed', 'Login Failed'),
        error.message || t('ui.authExtra.invalidCredentials', 'Invalid email or password. Please try again.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, data.fullName);
      Alert.alert(
        t('ui.authExtra.accountCreatedTitle', '🎉 Account Created!'),
        t('ui.authExtra.checkEmail', 'Please check your email to confirm your account, then sign in.'),
        [{ text: t('ui.signIn', 'Sign In'), onPress: () => switchTab(true) }],
      );
    } catch (error: any) {
      Alert.alert(
        t('ui.authExtra.signupFailed', 'Signup Failed'),
        error.message || t('ui.authExtra.signupFailedMessage', 'Failed to create account. Please try again.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    // AppNavigator auto-routes based on isGuest state — no manual navigation needed.
  };

  // Half of tabRow's inner content width (inner = outer − 2*padding of 4px each side).
  // Falls back to a screen-width-based estimate until the first layout event fires.
  const halfTab = tabRowWidth > 0 ? (tabRowWidth - 8) / 2 : (width - 104) / 2;
  const sliderTranslateX = sliderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, halfTab],
  });

  return (
    <View style={styles.root}>
      {/* ── Dark gradient background ── */}
      <LinearGradient
        colors={['#020B18', '#0D1B2A', '#0A1628']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Accent glow blob top-right */}
      <View style={styles.glowBlob} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={styles.logo}>
            <View style={styles.logoIconWrapper}>
              <Text style={styles.logoIcon}>✨</Text>
            </View>
            <Text style={styles.logoTitle}>{t('app.name', 'SparklePro')}</Text>
            <Text style={styles.logoSubtitle}>{t('app.tagline', 'Professional home cleaning service')}</Text>
          </View>

          {/* ── Glass Card ── */}
          <View style={styles.card}>
            {/* Tab Toggle */}
            <View
              style={styles.tabRow}
              onLayout={(e) => setTabRowWidth(e.nativeEvent.layout.width)}
            >
              {/* Sliding indicator — width matches one tab exactly */}
              <Animated.View
                style={[
                  styles.tabSlider,
                  { width: halfTab, transform: [{ translateX: sliderTranslateX }] },
                ]}
              />
              <TouchableOpacity style={styles.tabBtn} onPress={() => switchTab(true)} activeOpacity={0.8}>
                <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
                  {t('ui.signIn', 'Sign In')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabBtn} onPress={() => switchTab(false)} activeOpacity={0.8}>
                <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
                  {t('ui.signUp', 'Sign Up')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form fade wrapper */}
            <Animated.View style={{ opacity: cardFade }}>
              {isLogin ? (
                /* ── LOGIN ── */
                <View>
                  <Controller
                    control={loginForm.control}
                    name="email"
                    render={({ field: { onChange, onBlur, value = '' }, fieldState: { error } }) => (
                      <StyledInput
                        label={t('auth.emailOrLogin', 'Email or Login')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t('placeholders.emailOrLogin', 'Enter email or login')}
                        keyboardType="default"
                        autoCapitalize="none"
                        autoComplete="username"
                        error={error?.message}
                        iconName="mail-outline"
                      />
                    )}
                  />

                  <Controller
                    control={loginForm.control}
                    name="password"
                    render={({ field: { onChange, onBlur, value = '' }, fieldState: { error } }) => (
                      <StyledInput
                        label={t('auth.password', 'Password')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t('placeholders.enterYourPassword', 'Enter your password')}
                        secureTextEntry={!showLoginPassword}
                        autoCapitalize="none"
                        error={error?.message}
                        iconName="lock-closed-outline"
                        rightElement={
                          <TouchableOpacity onPress={() => setShowLoginPassword(v => !v)}>
                            <Ionicons
                              name={showLoginPassword ? 'eye-outline' : 'eye-off-outline'}
                              size={18}
                              color="#64748B"
                            />
                          </TouchableOpacity>
                        }
                      />
                    )}
                  />

                  <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
                    <Text style={styles.forgotText}>{t('auth.forgotPassword', 'Forgot Password?')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={loginForm.handleSubmit(handleLogin)}
                    activeOpacity={0.85}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#1D4ED8', '#2563EB', '#3B82F6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitGradient}
                    >
                      {isLoading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitText}>{t('ui.signIn', 'Sign In')}</Text>
                      }
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('ui.or', 'or')}</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={handleGuestLogin}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="person-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <Text style={styles.guestText}>{t('ui.continueAsGuest', 'Continue as Guest')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* ── SIGN UP ── */
                <View>
                  <Controller
                    control={signupForm.control}
                    name="fullName"
                    render={({ field: { onChange, onBlur, value = '' }, fieldState: { error } }) => (
                      <StyledInput
                        label={t('auth.fullName', 'Full Name')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t('placeholders.enterYourFullName', 'Enter your full name')}
                        autoCapitalize="words"
                        error={error?.message}
                        iconName="person-outline"
                      />
                    )}
                  />

                  <Controller
                    control={signupForm.control}
                    name="email"
                    render={({ field: { onChange, onBlur, value = '' }, fieldState: { error } }) => (
                      <StyledInput
                        label={t('auth.email', 'Email Address')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t('placeholders.enterYourEmail', 'Enter your email')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        error={error?.message}
                        iconName="mail-outline"
                      />
                    )}
                  />

                  <Controller
                    control={signupForm.control}
                    name="phone"
                    render={({ field: { onChange, onBlur, value = '' }, fieldState: { error } }) => (
                      <StyledInput
                        label={t('auth.phone', 'Phone Number')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="+971 50 000 0000"
                        keyboardType="phone-pad"
                        error={error?.message}
                        iconName="call-outline"
                      />
                    )}
                  />

                  <Controller
                    control={signupForm.control}
                    name="password"
                    render={({ field: { onChange, onBlur, value = '' }, fieldState: { error } }) => (
                      <StyledInput
                        label={t('auth.password', 'Password')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t('placeholders.createSecurePassword', 'Create a secure password')}
                        secureTextEntry={!showSignupPassword}
                        autoCapitalize="none"
                        error={error?.message}
                        iconName="lock-closed-outline"
                        rightElement={
                          <TouchableOpacity onPress={() => setShowSignupPassword(v => !v)}>
                            <Ionicons
                              name={showSignupPassword ? 'eye-outline' : 'eye-off-outline'}
                              size={18}
                              color="#64748B"
                            />
                          </TouchableOpacity>
                        }
                      />
                    )}
                  />

                  {/* Terms Checkbox */}
                  <Controller
                    control={signupForm.control}
                    name="termsAccepted"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <View style={styles.termsRow}>
                        <TouchableOpacity
                          style={[styles.checkbox, value && styles.checkboxChecked]}
                          onPress={() => onChange(!value)}
                          activeOpacity={0.8}
                        >
                          {value && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                        </TouchableOpacity>
                        <Text style={styles.termsText}>
                          {t('ui.agreeWith', 'I agree with')}{' '}
                          <Text
                            style={styles.termsLink}
                            onPress={() => setShowTermsModal(true)}
                          >
                            {t('ui.termsAndConditions', 'Terms and Conditions')}
                          </Text>
                        </Text>
                        {error && (
                          <Text style={[inputStyles.errorText, { marginLeft: 0, marginTop: 4 }]}>
                            {error.message}
                          </Text>
                        )}
                      </View>
                    )}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={signupForm.handleSubmit(handleSignup)}
                    activeOpacity={0.85}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={['#1D4ED8', '#2563EB', '#3B82F6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitGradient}
                    >
                      {isLoading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.submitText}>{t('ui.createAccount', 'Create Account')}</Text>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TermsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} t={t} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  // Accent blob
  glowBlob: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37,99,235,0.18)',
    // Blur-like soft glow with shadow
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
  },

  // ── Logo ──
  logo: { alignItems: 'center', marginBottom: 28 },
  logoIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  logoIcon: { fontSize: 30 },
  logoTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#64748B',
    letterSpacing: 0.3,
  },

  // ── Card ──
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 10,
  },

  // ── Tab toggle ──
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 50,
    padding: 4,
    marginBottom: 28,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '50%',
    bottom: 4,
    backgroundColor: '#2563EB',
    borderRadius: 50,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', zIndex: 2 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },

  // ── Form actions ──
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 13, color: '#60A5FA', fontWeight: '600' },

  submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  submitGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 54,
  },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  // ── Divider ──
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#475569', fontWeight: '500' },

  // ── Guest button ──
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  guestText: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },

  // ── Terms ──
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  termsText: { flex: 1, fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  termsLink: { color: '#60A5FA', fontWeight: '600', textDecorationLine: 'underline' },
});

export default AuthScreen;
