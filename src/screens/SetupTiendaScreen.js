import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTienda } from '../context/TiendaContext';
import { supabase } from '../config/supabase';
import { theme } from '../styles/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { seedCategoriasDefecto } from '../services/categorias';

/**
 * Normaliza un texto a un slug válido para dominio/URL:
 * minúsculas, sin acentos, solo [a-z0-9-], sin guiones repetidos ni en extremos.
 */
const sanitizeSlug = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const SLUG_CHECK_DEBOUNCE_MS = 500;

export default function SetupTiendaScreen() {
  const { user, profile, setProfile } = useAuth();
  const { setTienda } = useTienda();

  const [nombreTienda, setNombreTienda] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('');

  const [slugStatus, setSlugStatus] = useState('idle'); // idle | checking | available | taken
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef(null);

  // Autogenera el slug a partir del nombre, salvo que el usuario lo haya editado a mano.
  useEffect(() => {
    if (!slugEditedManually) {
      setSlug(sanitizeSlug(nombreTienda));
    }
  }, [nombreTienda, slugEditedManually]);

  // Valida disponibilidad del slug en tiempo real (debounced).
  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error('[SetupTienda] Error verificando slug:', error.message);
        setSlugStatus('idle');
        return;
      }
      setSlugStatus(data ? 'taken' : 'available');
    }, SLUG_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [slug]);

  const validate = () => {
    const newErrors = {};
    if (!nombreTienda.trim()) newErrors.nombreTienda = 'El nombre de la tienda es requerido';
    if (!slug) newErrors.slug = 'La URL de tu tienda es requerida';
    else if (slugStatus === 'taken') newErrors.slug = 'Esta URL ya está en uso';
    if (telefonoWhatsapp && !/^\+?\d{7,15}$/.test(telefonoWhatsapp.replace(/\s/g, ''))) {
      newErrors.telefonoWhatsapp = 'Número inválido (incluye código de país, ej. +57...)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTienda = useCallback(async () => {
    setGlobalError('');
    if (!validate()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('tiendas')
      .insert({
        usuario_id: user.id,
        nombre_tienda: nombreTienda.trim(),
        slug,
        telefono_whatsapp: telefonoWhatsapp.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Violación de restricción única (slug o dominio duplicado, condición de carrera).
        setErrors((e) => ({ ...e, slug: 'Esta URL acaba de ser tomada, elige otra' }));
        setSlugStatus('taken');
      } else {
        setGlobalError(error.message);
      }
      setLoading(false);
      return;
    }

    // Actualizar el perfil en la base de datos con el id de la tienda creada
    const { error: profileError } = await supabase
      .from('perfiles')
      .update({ tienda_id: data.id })
      .eq('id', user.id);

    if (profileError) {
      console.error('[SetupTienda] Error vinculando tienda al perfil:', profileError.message);
    }

    // Actualizar el estado del perfil en AuthContext
    if (setProfile) {
      setProfile((prev) => (prev ? { ...prev, tienda_id: data.id } : { id: user.id, rol: 'Administrador', tienda_id: data.id }));
    }

    try {
      await seedCategoriasDefecto(data.id);
    } catch (seedErr) {
      console.warn('[SetupTienda] No se pudieron precargar las categorías:', seedErr);
    }

    setTienda(data);
    // La navegación al Dashboard ocurre automáticamente en App.js al
    // detectar que `tienda` dejó de ser null.
    setLoading(false);
  }, [nombreTienda, slug, telefonoWhatsapp, user, setProfile, setTienda]);

  const slugHint = {
    idle: '',
    checking: 'Verificando disponibilidad...',
    available: 'Disponible ✓',
    taken: 'Esta URL ya está en uso',
  }[slugStatus];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Configura tu tienda</Text>
        <Text style={styles.subtitle}>Completa los datos para comenzar.</Text>

        {globalError ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#f87171" />
            <Text style={styles.errorBannerText}>{globalError}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            label="Nombre de la Tienda"
            icon="store-outline"
            placeholder="Ej. El Mercadito"
            value={nombreTienda}
            onChangeText={setNombreTienda}
            error={errors.nombreTienda}
            autoCapitalize="words"
          />

          <Input
            label="URL de tu tienda"
            icon="link-variant"
            placeholder="el-mercadito"
            value={slug}
            onChangeText={(t) => {
              setSlugEditedManually(true);
              setSlug(sanitizeSlug(t));
            }}
            error={errors.slug || (slugStatus === 'taken' ? slugHint : undefined)}
            autoCapitalize="none"
          />
          {!errors.slug && slugHint ? (
            <Text
              style={[
                styles.slugHint,
                slugStatus === 'available' && styles.slugHintAvailable,
              ]}
            >
              {slugHint}
            </Text>
          ) : null}

          <Input
            label="WhatsApp de la tienda"
            icon="whatsapp"
            placeholder="+57 300 000 0000"
            keyboardType="phone-pad"
            value={telefonoWhatsapp}
            onChangeText={setTelefonoWhatsapp}
            error={errors.telefonoWhatsapp}
          />

          <Button
            title={loading ? 'Guardando...' : 'Continuar'}
            onPress={handleCreateTienda}
            loading={loading}
            disabled={loading || slugStatus === 'checking'}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg, flexGrow: 1, justifyContent: 'center' },
  title: {
    ...theme.typography.headlineLg,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  form: { gap: theme.spacing.md },
  slugHint: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: -theme.spacing.sm,
    marginLeft: 4,
  },
  slugHintAvailable: { color: '#4ade80' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: theme.rounded.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  errorBannerText: { color: '#f87171', fontSize: 13, flex: 1 },
});
