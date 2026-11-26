import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi.');
}

// Publishable key aman dipakai di browser. Akses data dikontrol oleh RLS
// berdasarkan user yang login, jadi jangan pernah memasang service_role key di sini.
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
