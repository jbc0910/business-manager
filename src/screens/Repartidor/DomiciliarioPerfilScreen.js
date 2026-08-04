import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTienda } from '../../context/TiendaContext';
import { theme } from '../../styles/theme';
import AccountSettingsModal from '../../components/AccountSettingsModal';

export default function DomiciliarioPerfilScreen() {
  const { user, profile, signOut } = useAuth();
  const { tienda } = useTienda();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Card Principal de Perfil */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="bike" size={36} color={theme.colors.primary} />
          </View>

          <Text style={styles.userName}>{profile?.nombre || 'Domiciliario'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {/* Badge de Rol */}
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="shield-account" size={14} color={theme.colors.primaryMid} />
            <Text style={styles.roleBadgeText}>Domiciliario</Text>
          </View>
        </View>

        {/* Info de Tienda Vinculada (solo lectura) */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="storefront-outline" size={22} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Tienda Vinculada</Text>
              <Text style={styles.infoValue}>
                {tienda?.nombre_tienda || (profile?.tienda_id ? 'Cargando tienda...' : 'Sin tienda asignada')}
              </Text>
              {tienda?.direccion_negocio ? (
                <Text style={styles.infoSubtext}>📍 {tienda.direccion_negocio}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Módulo de Configuración de Cuenta (Cambiar contraseña / eliminar cuenta) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Ajustes de Cuenta</Text>
          <AccountSettingsModal />
        </View>

        {/* Botón Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.outline,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    elevation: 1,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onPrimaryContainer,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  infoSubtext: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  sectionContainer: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: '700',
    fontSize: 15,
  },
});
