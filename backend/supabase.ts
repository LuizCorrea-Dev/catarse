
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ijwhstanrryamnyxnnip.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mpD2mBetUVGDxeDiH8PQgg_VLcpCAO-';  

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DbProfile = {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  vibes: number;
};
