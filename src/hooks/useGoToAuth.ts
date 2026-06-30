import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Switches the app to the auth flow.
 * Guests must call exitGuestMode() — Auth is not in the navigator while isGuest is true.
 * AppNavigator shows Auth automatically when !user && !isGuest.
 */
export function useGoToAuth() {
  const { exitGuestMode } = useAuth();

  return useCallback(() => {
    exitGuestMode();
  }, [exitGuestMode]);
}
