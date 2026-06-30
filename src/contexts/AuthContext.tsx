import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/booking';
import { resolveCleanerAuthEmail } from '../utils/cleanerCredentials';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isCleaner: boolean;
  cleanerId: string | null;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loginAsGuest: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const GUEST_KEY = 'isGuest';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  const isAdmin = useMemo(() => profile?.role === 'admin', [profile?.role]);
  const isCleaner = useMemo(() => profile?.role === 'cleaner', [profile?.role]);

  const fetchCleanerId = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('cleaners')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      setCleanerId(data?.id ?? null);
    } catch {
      setCleanerId(null);
    }
  }, []);

  // NOTE: No loadGuestState effect here — onAuthStateChange fires INITIAL_SESSION
  // on mount and already reads AsyncStorage to restore guest mode. A separate
  // loadGuestState() would set isGuest a second time, causing an extra re-render
  // of every consumer (HomeScreen, HistoryScreen, etc.) and doubling effect runs.

  // Optimized profile fetching with caching
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Create default profile if none exists
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              role: 'customer' as const,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
          setProfile(newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
        if (data?.role === 'cleaner') {
          void fetchCleanerId(userId);
        } else {
          setCleanerId(null);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Don't throw error, just log it and continue
    }
  }, [fetchCleanerId]);

  // Optimized authentication functions with error handling
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const authEmail = resolveCleanerAuthEmail(email);
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }
      // User will be set by the auth state change listener
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }
      // User will be set by the auth state change listener
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // For mobile, we'll use a deep link callback
      // The redirect URL should be configured in Supabase dashboard
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'sparklepro://auth/callback', // Deep link for mobile
        }
      });

      if (error) {
        console.error('Google sign in error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Google sign in failed:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Sign out error (non-critical):', error);
        // Don't throw error, just clear local state
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always clear local state regardless of API response
      setUser(null);
      setProfile(null);
      setCleanerId(null);
      setIsGuest(false);
      try {
        await AsyncStorage.removeItem(GUEST_KEY);
      } catch (error) {
        console.error('Error removing guest key:', error);
      }
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    setUser(null);
    setProfile(null);
    setIsGuest(true);
    try {
      await AsyncStorage.setItem(GUEST_KEY, 'true');
    } catch (error) {
      console.error('Error setting guest mode:', error);
    }
  }, []);

  const exitGuestMode = useCallback(async () => {
    setUser(null);
    setProfile(null);
    setIsGuest(false);
    try {
      await AsyncStorage.removeItem(GUEST_KEY);
    } catch (error) {
      console.error('Error removing guest mode:', error);
    }
  }, []);

  // Optimized auth state change listener with error handling
  useEffect(() => {
    let mounted = true;
    let authResolved = false;

    const finishBootstrap = () => {
      if (mounted && !authResolved) {
        authResolved = true;
        setLoading(false);
      }
    };

    const applySession = (session: { user: User } | null, onComplete?: () => void) => {
      if (!mounted) return;

      const done = () => {
        onComplete?.();
      };

      if (session?.user) {
        setUser(session.user);
        setIsGuest(false);
        const userId = session.user.id;
        setTimeout(() => {
          if (!mounted) return;
          void fetchProfile(userId);
          void AsyncStorage.removeItem(GUEST_KEY);
        }, 0);
        done();
        return;
      }

      void AsyncStorage.getItem(GUEST_KEY)
        .then((guestValue) => {
          if (!mounted) return;
          const isGuestMode = guestValue === 'true';
          if (isGuestMode) {
            setIsGuest(true);
            setUser(null);
            setProfile(null);
          } else {
            setIsGuest(false);
            setUser(null);
            setProfile(null);
          }
        })
        .catch(() => {
          if (!mounted) return;
          setIsGuest(false);
          setUser(null);
          setProfile(null);
        })
        .finally(done);
    };

    const bootstrapTimeout = setTimeout(() => {
      console.warn('[Auth] Bootstrap timeout — continuing without blocking UI');
      finishBootstrap();
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      try {
        applySession(session, finishBootstrap);
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setIsGuest(true);
          void AsyncStorage.setItem(GUEST_KEY, 'true');
        }
        finishBootstrap();
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted || authResolved) return;
        applySession(session, finishBootstrap);
      })
      .catch((error) => {
        console.error('[Auth] getSession failed:', error);
        finishBootstrap();
      });

    return () => {
      mounted = false;
      clearTimeout(bootstrapTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Removed duplicate getSession() note: backup getSession above is guarded by authResolved
  // and only runs when onAuthStateChange has not already finished bootstrap.

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin,
    isCleaner,
    cleanerId,
    isGuest,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loginAsGuest,
    exitGuestMode
  }), [user, profile, loading, isAdmin, isCleaner, cleanerId, isGuest, signIn, signUp, signInWithGoogle, signOut, loginAsGuest, exitGuestMode]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
