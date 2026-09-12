import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://phgndohiftjyhoiconxo.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_yqfTRGRKp91FZOfvQwLs2Q_CHMpaIm8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
