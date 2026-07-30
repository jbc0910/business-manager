import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { retryPendingImageDeletions } from '../services/products';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setUser(data.session.user);
        const { data: userProfile } = await supabase.from('perfiles').select('*').eq('id', data.session.user.id).maybeSingle();
        setProfile(userProfile);
        retryPendingImageDeletions();
      }
      setIsGlobalLoading(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let { data: userProfile } = await supabase.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
        
        // Si el perfil aún no existe (ej. recién registrado y RegisterScreen aún no termina el upsert)
        if (!userProfile && event === 'SIGNED_IN') {
          for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const res = await supabase.from('perfiles').select('*').eq('id', session.user.id).maybeSingle();
            if (res.data) {
              userProfile = res.data;
              break;
            }
          }
        }

        setProfile(userProfile || null);
        setUser(session.user);
        
        if (event === 'SIGNED_IN') {
          retryPendingImageDeletions();
        }
      } else {
        setUser(null);
        setProfile(null);
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
