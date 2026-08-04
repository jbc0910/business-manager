import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { retryPendingImageDeletions } from '../services/products';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  const fetchProfile = async (sessionUser) => {
    if (!sessionUser) return null;
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (!error && data) {
        return data;
      }

      console.warn('[AuthContext] Profile not found in perfiles table. Falling back to user_metadata.');
      const meta = sessionUser.user_metadata || {};
      const fallbackProfile = {
        id: sessionUser.id,
        nombre: meta.nombre || sessionUser.email?.split('@')[0] || 'Usuario',
        rol: meta.rol || 'Administrador',
        tienda_id: meta.tienda_id || null,
      };

      // Intentar sincronizar el perfil con la BD de forma asíncrona
      supabase
        .from('perfiles')
        .upsert(fallbackProfile)
        .then(({ error: upsertErr }) => {
          if (upsertErr) console.warn('[AuthContext] Auto-upsert profile warning:', upsertErr.message);
        })
        .catch(() => {});

      return fallbackProfile;
    } catch (e) {
      console.error('[AuthContext] Exception fetching profile:', e);
      const meta = sessionUser?.user_metadata || {};
      return {
        id: sessionUser.id,
        nombre: meta.nombre || sessionUser.email?.split('@')[0] || 'Usuario',
        rol: meta.rol || 'Administrador',
        tienda_id: meta.tienda_id || null,
      };
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session?.user) {
          setUser(data.session.user);
          const userProfile = await fetchProfile(data.session.user);
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
          let userProfile = await fetchProfile(session.user);
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
