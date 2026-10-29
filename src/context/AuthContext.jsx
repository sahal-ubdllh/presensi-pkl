/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        
        // Jika user tidak ada di public.users, buat otomatis
        if (error.code === 'PGRST116' || error.status === 406) {
          console.log('User not found, creating profile...');
          const { data: { user: authUser } } = await supabase.auth.getUser(userId);
          
          if (authUser) {
            const { data: newProfile, error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  id: userId,
                  nama_lengkap: authUser.user_metadata?.nama_lengkap || authUser.email,
                  email: authUser.email,
                  role: authUser.user_metadata?.role || 'peserta',
                  jenis_peserta: authUser.user_metadata?.jenis_peserta || 'Mahasiswa',
                }
              ])
              .select()
              .single();

            if (insertError) {
              console.error('Error creating profile:', insertError);
              return;
            }

            console.log('Profile created:', newProfile);
            setProfile(newProfile);
          }
          return;
        }
        throw error;
      }
      
      console.log('Profile fetched:', data);
      setProfile(data);
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  useEffect(() => {
  let isMounted = true; // Flag untuk track component mount

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && isMounted) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (isMounted) {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      if (isMounted) {
        setUser(null);
        setProfile(null);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  checkSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      // Hanya handle event tertentu
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user && isMounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }
  );

  return () => {
    isMounted = false; // Cleanup
    subscription.unsubscribe();
  };
}, []); // Empty dependency array

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};