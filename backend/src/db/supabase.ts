import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('[DB] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
    }

    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

// Backward-compatible export — lazy getter
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
