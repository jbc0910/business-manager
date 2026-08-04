import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { theme } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useTienda } from '../context/TiendaContext';

// ─────────────────────────────────────────────────────────
//  AccountSettingsModal
//  Módulo de configuración de cuenta que se inserta en
//  TiendaAdminScreen, justo sobre el botón de cerrar sesión.
// ─────────────────────────────────────────────────────────
export default function AccountSettingsModal() {
  const { user, profile, signOut } = useAuth();
  const { tienda, setTienda } = useTienda();
  const isDomiciliario = profile?.rol === 'Domiciliario';

  const [modalVisible, setModalVisible] = useState(false);
  // 'menu' | 'businessName' | 'password' | 'deleteAccount'
  const [activeSection, setActiveSection] = useState('menu');

  // ── Estado: cambiar nombre del negocio ──
  const [newBusinessName, setNewBusinessName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // ── Estado: cambiar contraseña ──
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Estado: eliminar cuenta ──
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const openModal = (section = 'menu') => {
    setActiveSection(section);
    setNewBusinessName(tienda?.nombre_tienda || '');
    setNewPassword('');
    setConfirmPassword('');
    setDeleteConfirmText('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setActiveSection('menu');
  };

  // ── Cambiar nombre del negocio ──────────────────────────
  const handleSaveBusinessName = async () => {
    if (isDomiciliario) {
      Alert.alert('Acceso Denegado', 'Los domiciliarios no pueden cambiar datos de la tienda.');
      return;
    }
    const trimmed = newBusinessName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }
    setSavingName(true);
    try {
      const { data, error } = await supabase
        .from('tiendas')
        .update({ nombre_tienda: trimmed })
        .eq('id', tienda.id)
        .select()
        .single();

      if (error) throw error;
      setTienda(data);
      Alert.alert('Éxito', 'Nombre del negocio actualizado correctamente.');
      closeModal();
    } catch (err) {
      console.error('[AccountSettings] Error al cambiar nombre:', err);
      Alert.alert('Error', 'No se pudo actualizar el nombre. Intenta de nuevo.');
    } finally {
      setSavingName(false);
    }
  };

  // ── Cambiar contraseña ──────────────────────────────────
  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Éxito', 'Contraseña actualizada correctamente.');
      closeModal();
    } catch (err) {
      console.error('[AccountSettings] Error al cambiar contraseña:', err);
      Alert.alert('Error', err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Eliminar cuenta ─────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      Alert.alert('Error', 'Escribe ELIMINAR para confirmar.');
      return;
    }
    setDeletingAccount(true);
    try {
      // Eliminar la tienda primero solo si es Administrador/dueño
      if (tienda?.id && !isDomiciliario) {
        await supabase.from('tiendas').delete().eq('id', tienda.id);
      }

      // Llamar a la Edge Function de Supabase que elimina el usuario con service_role
      // CONFIGURA esto en Supabase → Edge Functions → delete-account
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id },
      });

      if (error) throw error;

      await signOut();
    } catch (err) {
      console.error('[AccountSettings] Error al eliminar cuenta:', err);
      Alert.alert(
        'Error',
        'No se pudo eliminar la cuenta. Asegúrate de haber configurado la Edge Function "delete-account" en Supabase.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <>
      {/* ── Botón que abre el módulo ── */}
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => openModal('menu')}
      >
        <MaterialCommunityIcons
          name="cog-outline"
          size={20}
          color={theme.colors.onSurface}
        />
        <Text style={styles.settingsBtnText}>Configuración de cuenta</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {/* ── Modal principal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              {activeSection !== 'menu' && (
                <TouchableOpacity
                  onPress={() => setActiveSection('menu')}
                  style={styles.backIconBtn}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={22}
                    color={theme.colors.onSurface}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.sheetTitle}>
                {activeSection === 'menu' && 'Configuración de cuenta'}
                {activeSection === 'businessName' && 'Nombre del negocio'}
                {activeSection === 'password' && 'Cambiar contraseña'}
                {activeSection === 'deleteAccount' && 'Eliminar cuenta'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeIconBtn}>
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ══════════════ MENÚ PRINCIPAL ══════════════ */}
              {activeSection === 'menu' && (
                <View style={styles.menuList}>
                  {/* Email info */}
                  <View style={styles.emailRow}>
                    <MaterialCommunityIcons
                      name="account-circle-outline"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.emailText} numberOfLines={1}>
                      {user?.email}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {!isDomiciliario && (
                    <>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setActiveSection('businessName')}
                      >
                        <MaterialCommunityIcons
                          name="store-edit-outline"
                          size={22}
                          color={theme.colors.primary}
                        />
                        <View style={styles.menuItemText}>
                          <Text style={styles.menuItemTitle}>Nombre del negocio</Text>
                          <Text style={styles.menuItemSubtitle} numberOfLines={1}>
                            {tienda?.nombre_tienda || '—'}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </TouchableOpacity>

                      <View style={styles.divider} />
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setActiveSection('password')}
                  >
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={22}
                      color={theme.colors.primary}
                    />
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemTitle}>Cambiar contraseña</Text>
                      <Text style={styles.menuItemSubtitle}>
                        Actualiza tu contraseña de acceso
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setActiveSection('deleteAccount')}
                  >
                    <MaterialCommunityIcons
                      name="account-remove-outline"
                      size={22}
                      color={theme.colors.error}
                    />
                    <View style={styles.menuItemText}>
                      <Text style={[styles.menuItemTitle, { color: theme.colors.error }]}>
                        Eliminar cuenta
                      </Text>
                      <Text style={styles.menuItemSubtitle}>
                        Acción permanente e irreversible
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* ══════════════ NOMBRE DEL NEGOCIO ══════════════ */}
              {activeSection === 'businessName' && (
                <View style={styles.section}>
                  <Text style={styles.sectionDesc}>
                    Este nombre aparece en la vista de tu tienda que ven los clientes.
                  </Text>
                  <Text style={styles.inputLabel}>Nombre del negocio</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newBusinessName}
                    onChangeText={setNewBusinessName}
                    placeholder="Ej. Tienda Don Pedro"
                    placeholderTextColor={theme.colors.onSurfaceMuted}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.actionBtn, savingName && styles.disabledBtn]}
                    onPress={handleSaveBusinessName}
                    disabled={savingName}
                  >
                    {savingName ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="content-save-outline"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.actionBtnText}>Guardar nombre</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ══════════════ CAMBIAR CONTRASEÑA ══════════════ */}
              {activeSection === 'password' && (
                <View style={styles.section}>
                  <Text style={styles.sectionDesc}>
                    La nueva contraseña debe tener al menos 6 caracteres.
                  </Text>
                  <Text style={styles.inputLabel}>Nueva contraseña</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.onSurfaceMuted}
                    secureTextEntry
                    autoFocus
                  />
                  <Text style={styles.inputLabel}>Confirmar contraseña</Text>
                  <TextInput
                    style={styles.textInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.onSurfaceMuted}
                    secureTextEntry
                  />
                  <TouchableOpacity
                    style={[styles.actionBtn, savingPassword && styles.disabledBtn]}
                    onPress={handleSavePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="lock-check-outline"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.actionBtnText}>Actualizar contraseña</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ══════════════ ELIMINAR CUENTA ══════════════ */}
              {activeSection === 'deleteAccount' && (
                <View style={styles.section}>
                  <View style={styles.dangerBanner}>
                    <MaterialCommunityIcons
                      name="alert-outline"
                      size={20}
                      color={theme.colors.error}
                    />
                    <Text style={styles.dangerText}>
                      Esta acción eliminará permanentemente tu cuenta, tu tienda y todos
                      los datos asociados. No se puede deshacer.
                    </Text>
                  </View>

                  <Text style={styles.sectionDesc}>
                    Para confirmar, escribe{' '}
                    <Text style={{ fontWeight: '700', color: theme.colors.error }}>
                      ELIMINAR
                    </Text>{' '}
                    en el campo de abajo.
                  </Text>

                  <Text style={styles.inputLabel}>Confirmación</Text>
                  <TextInput
                    style={[styles.textInput, styles.dangerInput]}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholder="Escribe ELIMINAR"
                    placeholderTextColor={theme.colors.onSurfaceMuted}
                    autoCapitalize="characters"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.dangerBtn,
                      deletingAccount && styles.disabledBtn,
                    ]}
                    onPress={handleDeleteAccount}
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="account-remove"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.actionBtnText}>Eliminar mi cuenta</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Trigger button ──────────────────────────────────────
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  settingsBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },

  // ── Modal / Bottom Sheet ────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  backIconBtn: {
    marginRight: 8,
    padding: 2,
  },
  closeIconBtn: {
    padding: 2,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  sheetBody: {
    padding: 20,
    paddingBottom: 36,
  },

  // ── Menú ────────────────────────────────────────────────
  menuList: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    overflow: 'hidden',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceBright,
  },
  emailText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.outline,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuItemText: {
    flex: 1,
    gap: 2,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },

  // ── Secciones de formulario ─────────────────────────────
  section: {
    gap: 12,
  },
  sectionDesc: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surfaceBright,
  },

  // ── Botones de acción ───────────────────────────────────
  actionBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  dangerBtn: {
    backgroundColor: theme.colors.error,
  },

  // ── Peligro / Delete ────────────────────────────────────
  dangerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.errorContainer,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  dangerText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
    lineHeight: 18,
  },
  dangerInput: {
    borderColor: theme.colors.error,
    color: theme.colors.error,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
