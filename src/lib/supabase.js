import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function isPublicClientKey(key) {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch { return false; }
}

export const supabaseSetupRequired = Boolean(supabaseUrl || supabaseAnonKey) && (!supabaseUrl.startsWith('https://') || !isPublicClientKey(supabaseAnonKey));

export const supabase =
  supabaseUrl && supabaseAnonKey && !supabaseSetupRequired
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
