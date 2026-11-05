import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env.local');
}

// "Ingat saya di perangkat ini":
//  - dicentang (bawaan)  -> sesi disimpan di localStorage, tetap masuk walau browser ditutup
//  - tidak dicentang     -> sesi disimpan di sessionStorage, otomatis keluar saat browser/tab ditutup
//    (berguna di komputer bersama / warnet)
const REMEMBER_KEY = 'pkl_remember_me';

const penyimpanan = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) === 'false' ? sessionStorage : localStorage;
  } catch {
    return localStorage;
  }
};

export const setRemember = (remember) => {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
};

const storage = {
  getItem: (key) => {
    try { return penyimpanan().getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { penyimpanan().setItem(key, value); } catch { /* abaikan */ }
  },
  // Saat logout, hapus dari kedua tempat penyimpanan
  removeItem: (key) => {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch { /* abaikan */ }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage },
});
