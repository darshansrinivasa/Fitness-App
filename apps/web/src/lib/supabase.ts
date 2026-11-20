import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to apps/web/.env');
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

export interface Profile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  water_unit: string | null;
  weight_unit: string | null;
  height_cm: number | null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, full_name, date_of_birth, gender, water_unit, weight_unit, height_cm')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Omit<Profile, 'id'>>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}
