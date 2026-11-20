import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

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

const profileColumns = 'id, full_name, date_of_birth, gender, water_unit, weight_unit, height_cm';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function googleName(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const value = meta?.full_name ?? meta?.name;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function ensureProfile(user: User): Promise<Profile | null> {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;
  const { error } = await getSupabase().from('profiles').insert({
    id: user.id,
    full_name: googleName(user),
  });
  if (error && error.code !== '23505') throw new Error(error.message);
  return fetchProfile(user.id);
}

export async function updateProfile(
  userId: string,
  patch: Partial<Omit<Profile, 'id'>> & { avatar_url?: string | null },
): Promise<void> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Profile was not saved.');
}
