import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/booking';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
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
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);

  // Memoize admin check to prevent unnecessary re-renders
  const isAdmin = useMemo(() => {
    return profile?.role === 'admin';
  }, [profile?.role]);

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
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
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
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Don't throw error, just log it and continue
    }
  }, []);

  // Optimized authentication functions with error handling
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      try {
        if (session?.user) {
          console.log('User authenticated, clearing guest mode and setting user');
          setUser(session.user);
          await fetchProfile(session.user.id);
          setIsGuest(false);
          try {
            await AsyncStorage.removeItem(GUEST_KEY);
          } catch {}
        } else {
          const guestValue = await AsyncStorage.getItem(GUEST_KEY);
          const isGuestMode = guestValue === 'true';
          if (isGuestMode) {
            console.log('No session but guest mode active, keeping guest state');
            setIsGuest(true);
            setUser(null);
            setProfile(null);
          } else {
            console.log('No session and not guest mode, clearing user');
            setUser(null);
            setProfile(null);
            setIsGuest(false);
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        // On error, fall back to guest mode to prevent app crash
        if (mounted) {
          setUser(null);
          setProfile(null);
          setIsGuest(true);
          try {
            await AsyncStorage.setItem(GUEST_KEY, 'true');
          } catch {}
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // NOTE: No separate getSession() call here.
  // onAuthStateChange fires INITIAL_SESSION on mount which covers the
  // initial session check. A second getSession() call would duplicate
  // setUser() / fetchProfile() calls causing a render cascade.

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin,
    isGuest,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loginAsGuest,
    exitGuestMode
  }), [user, profile, loading, isAdmin, isGuest, signIn, signUp, signInWithGoogle, signOut, loginAsGuest, exitGuestMode]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
