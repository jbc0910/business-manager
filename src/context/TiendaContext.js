import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const TiendaContext = createContext(undefined);

export const TiendaProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [tienda, setTienda] = useState(null);

  const resolveTienda = useCallback(async (currentProfile) => {
    if (!currentProfile || !currentProfile.tienda_id) {
      setTienda(null);
      return;
    }
    const { data, error } = await supabase
      .from('tiendas')
      .select('*')
      .eq('id', currentProfile.tienda_id)
      .maybeSingle();
    
    if (error) console.error('[TiendaContext] Error fetching tienda:', error);
    setTienda(data || null);
  }, []);

  useEffect(() => {
    resolveTienda(profile);
  }, [profile, resolveTienda]);

  const refreshTienda = useCallback(async () => {
    await resolveTienda(profile);
  }, [resolveTienda, profile]);

  return (
    <TiendaContext.Provider value={{ tienda, setTienda, refreshTienda }}>
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
