import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const TiendaContext = createContext(undefined);

export const TiendaProvider = ({ children }) => {
  const { user, profile, setProfile, isGlobalLoading } = useAuth();
  const [tienda, setTienda] = useState(null);
  const [isLoadingTienda, setIsLoadingTienda] = useState(true);

  const resolveTienda = useCallback(async (currentProfile) => {
    // Si la autenticación aún está cargando a nivel global, 
    // no resolvemos la tienda todavía para evitar estados intermedios.
    if (isGlobalLoading) return;

    setIsLoadingTienda(true);
    if (!user) {
      setTienda(null);
      setIsLoadingTienda(false);
      return;
    }

    try {
      let storeData = null;

      // 1. Buscar por tienda_id si el perfil lo tiene
      if (currentProfile?.tienda_id) {
        const { data, error } = await supabase
          .from('tiendas')
          .select('*')
          .eq('id', currentProfile.tienda_id)
          .maybeSingle();

        if (!error && data) {
          storeData = data;
        }
      }

      // 2. Fallback: buscar por usuario_id en la tabla tiendas si no se encontró por tienda_id
      if (!storeData && user?.id) {
        const { data, error } = await supabase
          .from('tiendas')
          .select('*')
          .eq('usuario_id', user.id)
          .maybeSingle();

        if (!error && data) {
          storeData = data;
          // Auto-reparar el perfil desincronizado en Supabase
          await supabase
            .from('perfiles')
            .update({ tienda_id: data.id })
            .eq('id', user.id);

          if (setProfile) {
            setProfile((prev) => (prev ? { ...prev, tienda_id: data.id } : null));
          }
        }
      }

      setTienda(storeData || null);
    } catch (err) {
      console.error('[TiendaContext] Error fetching tienda:', err);
      setTienda(null);
    } finally {
      setIsLoadingTienda(false);
    }
  }, [user, setProfile, isGlobalLoading]);

  useEffect(() => {
    resolveTienda(profile);
  }, [profile, resolveTienda]);

  const refreshTienda = useCallback(async () => {
    await resolveTienda(profile);
  }, [resolveTienda, profile]);

  return (
    <TiendaContext.Provider value={{ tienda, setTienda, refreshTienda, isLoadingTienda }}>
      {children}
    </TiendaContext.Provider>
  );
};

export const useTienda = () => {
  const context = useContext(TiendaContext);
  if (context === undefined) {
    throw new Error('useTienda debe usarse dentro de un <TiendaProvider>');
  }
  return context;
};
