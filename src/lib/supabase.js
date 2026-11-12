
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env.local'
  );
}

// Gunakan storage key yang sama dengan default Supabase
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const AUTH_STORAGE_KEY = `sb-${projectRef}-auth-token`;

const REMEMBER_KEY = 'pkl_remember_me';

// Tentukan tempat penyimpanan berdasarkan pilihan pengguna
const getStorage = () => {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY);
    return remember === 'false' ? sessionStorage : localStorage;
  } catch {
    return localStorage;
  }
};

// Dipanggil sebelum proses login
export const setRemember = (remember) => {
  try {
    // Bersihkan sesi lama dari kedua tempat penyimpanan
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);

    // Simpan preferensi pengguna
    localStorage.setItem(
      REMEMBER_KEY,
      remember ? 'true' : 'false'
    );
  } catch (error) {
    console.error('Gagal mengatur preferensi login:', error);
  }
};

// Custom storage untuk Supabase
const storage = {
  getItem: (key) => {
    try {
      return getStorage().getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key, value) => {
    try {
      getStorage().setItem(key, value);
    } catch (error) {
      console.error('Gagal menyimpan sesi:', error);
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Gagal menghapus sesi:', error);
    }
  },
};

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
