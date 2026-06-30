import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const customUrl = localStorage.getItem('supabase_custom_url');
  const customKey = localStorage.getItem('supabase_custom_key');
  
  if (customUrl && customKey) {
    return {
      url: customUrl.trim(),
      key: customKey.trim(),
    };
  }
  
  return {
    url: (import.meta.env.VITE_SUPABASE_URL || '').trim(),
    key: (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
  };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = (): boolean => {
  return config.url !== '' && config.key !== '';
};

// Create the client or return null if not configured
export const supabase = isSupabaseConfigured()
  ? createClient(config.url, config.key)
  : null;
