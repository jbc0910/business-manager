import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { theme } from '../styles/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }) {
  const { setProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('Administrador'); // 'Administrador' | 'Domiciliario'
  const [tiendaSlug, setTiendaSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');

  /** Validación básica del formulario */
  const validate = () => {
    const newErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!email.trim()) newErrors.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email inválido';
    if (!password) newErrors.password = 'La contraseña es requerida';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    
    if (rol === 'Domiciliario' && !tiendaSlug.trim()) {
      newErrors.tiendaSlug = 'El código de tienda es requerido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setGlobalError('');
    if (!validate()) return;

    setLoading(true);
    try {
      let assignedTiendaId = null;
      if (rol === 'Domiciliario') {
        const { data: storeData, error: storeError } = await supabase
          .from('tiendas')
          .select('id')
          .eq('slug', tiendaSlug.trim().toLowerCase())
          .maybeSingle();
          
        if (storeError || !storeData) {
          setGlobalError('No se encontró ninguna tienda con ese código.');
          setLoading(false);
          return;
        }
        assignedTiendaId = storeData.id;
      }

      // 1. Crear usuario en Supabase Auth pasando metadata para que el trigger de BD la cree si RLS bloquea en el cliente
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            nombre: nombre.trim(),
            rol: rol,
            tienda_slug: tiendaSlug ? tiendaSlug.trim().toLowerCase() : null,
            tienda_id: assignedTiendaId
          }
        }
      });

      if (signUpError) {
        setGlobalError(
          signUpError.message === 'User already registered'
            ? 'Este email ya está registrado'
            : signUpError.message
        );
        setLoading(false);
        return;
      }

      const newUser = data?.user;
      if (!newUser) {
        setGlobalError('Error al crear el usuario. Intenta de nuevo.');
        setLoading(false);
        return;
      }

      // 2. Inserción directa en perfiles desde el cliente
      const newProfile = {
        id: newUser.id,
        nombre: nombre.trim(),
        rol: rol,
        tienda_id: assignedTiendaId
      };

      const { error: profileError } = await supabase.from('perfiles').upsert(newProfile);

      if (profileError) {
        console.error('[RegisterScreen] Error guardando perfil desde cliente:', profileError.message);
      } else {
        console.log('[RegisterScreen] Perfil guardado con éxito desde cliente:', newProfile);
      }

      if (setProfile) {
        setProfile(newProfile);
      }

      if (!data?.session) {
        setGlobalError('Cuenta creada. Revisa tu email para confirmar el acceso.');
      }
    } catch (err) {
      setGlobalError('Error de conexión. Intenta de nuevo.');
      console.error('[RegisterScreen] Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setGlobalError('');
    setLoading(true);
    try {
      const redirectUri = makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) {
        setGlobalError(error.message);
        setLoading(false);
        return;
      }

      if (Platform.OS !== 'web' && data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (res.type === 'success' && res.url) {
          const urlObj = new URL(res.url);
          const code = urlObj.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      }
    } catch (err) {
      setGlobalError(`Error de conexión con ${provider}. Intenta de nuevo.`);
      console.error(`[RegisterScreen] Error OAuth ${provider}:`, err);
    } finally {
      if (Platform.OS !== 'web') {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          {/* Logo */}
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons
              name="store-plus-outline"
              size={32}
              color={theme.colors.onPrimaryContainer}
            />
          </View>

          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>
            Únete a la plataforma para administrar o repartir.
          </Text>

          {/* Toggle Login / Register */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.toggleText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleButton, styles.toggleActive]}>
              <Text style={styles.toggleTextActive}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle Role */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, rol === 'Administrador' && styles.toggleActive]}
              onPress={() => setRol('Administrador')}
            >
              <Text style={rol === 'Administrador' ? styles.toggleTextActive : styles.toggleText}>Soy Tendero</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, rol === 'Domiciliario' && styles.toggleActive]}
              onPress={() => setRol('Domiciliario')}
            >
              <Text style={rol === 'Domiciliario' ? styles.toggleTextActive : styles.toggleText}>Soy Domiciliario</Text>
            </TouchableOpacity>
          </View>

          {/* Card del formulario */}
          <View style={styles.card}>
            {/* Error global */}
            {globalError ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={16}
                  color="#f87171"
                />
                <Text style={styles.errorBannerText}>{globalError}</Text>
              </View>
            ) : null}

            <Input
              label="Nombre Completo"
              icon="account-outline"
              placeholder="Ej. Juan Pérez"
              value={nombre}
              onChangeText={(t) => {
                setNombre(t);
                setErrors((e) => ({ ...e, nombre: undefined }));
              }}
              error={errors.nombre}
            />

            {rol === 'Domiciliario' && (
              <Input
                label="Código de la Tienda (Slug)"
                icon="store-search-outline"
                placeholder="ej: mi-tienda-local"
                value={tiendaSlug}
                onChangeText={(t) => {
                  setTiendaSlug(t);
                  setErrors((e) => ({ ...e, tiendaSlug: undefined }));
                }}
                error={errors.tiendaSlug}
              />
            )}

            <Input
              label="Email"
              icon="email-outline"
              placeholder="hola@tu-tienda.com"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors((e) => ({ ...e, email: undefined }));
              }}
              error={errors.email}
            />

            <Input
              label="Contraseña"
              icon="lock-outline"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
            />

            <Button
              title="Crear Cuenta"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
            />
          

          <Text style={styles.orText}>o continuar con</Text>
          
            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => handleOAuth('google')}
                disabled={loading}
              >
                <MaterialCommunityIcons name="google" size={20} color={theme.colors.onSurface} />
              </TouchableOpacity>
           </View>
           </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceBright,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.headlineLg,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onPrimaryContainer,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.rounded.md,
    marginBottom: theme.spacing.md,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounded.sm,
  },
  toggleText: {
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.rounded.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
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
  errorBannerText: {
    color: '#f87171',
    fontSize: 13,
    flex: 1,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 12,
    alignItems: 'center',
    borderRadius: theme.rounded.sm,
  },
});