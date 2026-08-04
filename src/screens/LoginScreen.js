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

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email inválido';
    if (!password) newErrors.password = 'La contraseña es requerida';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setGlobalError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setGlobalError(
          error.message === 'Invalid login credentials'
            ? 'Email o contraseña incorrectos'
            : error.message.toLowerCase().includes('email not confirmed')
            ? 'Por favor confirma tu correo electrónico antes de iniciar sesión.'
            : error.message
        );
      }
    } catch (err) {
      setGlobalError('Error de conexión. Intenta de nuevo.');
      console.error('[LoginScreen] Error inesperado:', err);
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
      console.error(`[LoginScreen] Error OAuth ${provider}:`, err);
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
              name="store"
              size={32}
              color={theme.colors.onPrimaryContainer}
            />
          </View>

          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>
            Accede a la exclusividad de tu barrio con un solo toque.
          </Text>

          {/* Toggle Login / Register */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleButton, styles.toggleActive]}>
              <Text style={styles.toggleTextActive}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.toggleText}>Register</Text>
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
              label="Email"
              icon="email-outline"
              placeholder="tu@email.com"
              keyboardType="email-address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setErrors((e) => ({ ...e, email: undefined }));
              }}
              error={errors.email}
            />

            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Contraseña</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>¿Olvidaste la contraseña?</Text>
              </TouchableOpacity>
            </View>
            <Input
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
              title="Acceder"
              onPress={handleLogin}
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
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
  },
  forgotText: {
    ...theme.typography.labelCaps,
    color: theme.colors.onPrimaryContainer,
  },
  orText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
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