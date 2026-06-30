import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export function createSupabaseClient(): SupabaseClient {
  const url = (extra.supabaseUrl as string) || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    (extra.supabaseAnonKey as string) || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase credentials missing. Set expo.extra or EXPO_PUBLIC_SUPABASE_* env vars.',
    );
  }

  return createClient(url, anonKey);
}
