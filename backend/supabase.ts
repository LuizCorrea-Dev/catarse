
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://emzgvkuhsbfbfmwxxpoc.supabase.co';
const supabaseAnonKey = 'sb_publishable_d7WxJIqg9DtUFtStDbF3DQ_Uzey4HH7'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DbProfile = {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  vibes: number;
};
