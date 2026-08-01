import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { retryPendingImageDeletions } from '../services/products';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('[AuthContext] Exception fetching profile:', e);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session?.user) {
          setUser(data.session.user);
          const userProfile = await fetchProfile(data.session.user.id);
          setProfile(userProfile);
          retryPendingImageDeletions();
        }
      } catch (err) {
        console.error('[AuthContext] Error in initAuth:', err);
      } finally {
        setIsGlobalLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setUser(session.user);
          let userProfile = await fetchProfile(session.user.id);

          // Si acaba de registrarse, reintentar la obtención del perfil
          let retries = 0;
          while (!userProfile && retries < 4) {
            await new Promise(r => setTimeout(r, 800));
            userProfile = await fetchProfile(session.user.id);
            retries++;
          }

          setProfile(userProfile);
          
          if (event === 'SIGNED_IN') {
            retryPendingImageDeletions();
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error in onAuthStateChange:', err);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, isGlobalLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return context;
};
