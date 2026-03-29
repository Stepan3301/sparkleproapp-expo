import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables!\n\n' +
    'Please create a .env file in the mobile/ directory with:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key\n\n' +
    'Get your credentials from: https://app.supabase.com/project/YOUR_PROJECT/settings/api\n' +
    'After creating .env, restart Expo with: npm start -- --clear'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed in mobile
  },
});
