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
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session) {
          setUser(data.session.user);
          const { data: userProfile, error: profileError } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', data.session.user.id)
            .maybeSingle();
            
          if (profileError) console.error('[AuthContext] Error fetching profile:', profileError);
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
          let userProfile = null;
          let retries = 0;
          let delay = 1000;
          
          while (retries < 5 && !userProfile) {
            const { data, error } = await supabase
              .from('perfiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
              
            if (error) {
              console.error('[AuthContext] Error fetching profile on state change:', error);
              break; // If real error, don't keep polling
            }
            
            if (data) {
              userProfile = data;
              break;
            }
            
            if (event !== 'SIGNED_IN') break; // Only poll on fresh sign in
            
            await new Promise(r => setTimeout(r, delay));
            retries++;
            delay *= 1.5; // Exponential backoff
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
