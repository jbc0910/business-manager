import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useTienda } from '../context/TiendaContext';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';
import { updateTienda } from '../services/tienda';
import AccountSettingsModal from '../components/AccountSettingsModal';

export default function TiendaAdminScreen({ navigation }) {
  const { tienda, setTienda } = useTienda();
  const { signOut } = useAuth();

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      nombre: tienda?.nombre_tienda || '',
      whatsapp: tienda?.telefono_whatsapp || '',
      horario: tienda?.horario_atencion || '',
    }
  });

  useEffect(() => {
    reset({
      nombre: tienda?.nombre_tienda || '',
      whatsapp: tienda?.telefono_whatsapp || '',
      horario: tienda?.horario_atencion || '',
    });
  }, [tienda, reset]);

  const [metodosPago, setMetodosPago] = useState(tienda?.metodos_pago || []);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Modal states para métodos de pago
  const [banco, setBanco] = useState('');
  const [titular, setTitular] = useState('');
  const [numero, setNumero] = useState('');

  const onSubmit = async (data) => {
    if (!data.nombre.trim()) {
      Alert.alert('Error', 'El nombre de la tienda es requerido');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        nombre_tienda: data.nombre.trim(),
        telefono_whatsapp: data.whatsapp.trim(),
        horario_atencion: data.horario.trim(),
        metodos_pago: metodosPago,
      };
      const updatedTienda = await updateTienda(tienda.id, updates);
      setTienda(updatedTienda);
      Alert.alert('Éxito', 'Configuración guardada correctamente.');
    } catch (err) {
      console.error('[TiendaConfig] Error:', err);
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMetodo = () => {
    if (!banco.trim() || !titular.trim() || !numero.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    const nuevo = { id: Date.now().toString(), banco, titular, numero };
    setMetodosPago([...metodosPago, nuevo]);
    setModalVisible(false);
    setBanco('');
    setTitular('');
    setNumero('');
  };

  const removeMetodo = (id) => {
    setMetodosPago(prev => prev.filter(m => m.id !== id));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración de la Tienda</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="store" size={48} color={theme.colors.primary} />
          <Text style={styles.infoTitle}>Tu tienda está activa</Text>
          <Text style={styles.infoSubtitle}>Código para Domiciliarios: <Text style={{fontWeight:'bold'}}>{tienda?.slug}</Text></Text>
          <Text style={[styles.infoSubtitle, {fontSize: 11, marginTop: 8}]}>Comparte este código para que tus domiciliarios se vinculen a tu tienda al registrarse.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre de la tienda</Text>
          <Controller
            control={control}
            name="nombre"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Número de WhatsApp (con código de país)</Text>
          <Controller
            control={control}
            name="whatsapp"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                keyboardType="phone-pad"
                placeholder="Ej. +573001234567"
              />
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Horario de atención</Text>
          <Controller
            control={control}
            name="horario"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="Ej. Lunes a Sábado, 8am a 8pm"
              />
            )}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.flexRow}>
            <Text style={styles.label}>Cuentas de Pago</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <MaterialCommunityIcons name="plus" size={16} color={theme.colors.onPrimary} />
              <Text style={styles.addBtnText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {metodosPago.length === 0 ? (
            <Text style={styles.emptyText}>Sin cuentas registradas</Text>
          ) : (
            metodosPago.map(m => (
              <View key={m.id} style={styles.metodoItem}>
                <View>
                  <Text style={styles.metodoBanco}>{m.banco}</Text>
                  <Text style={styles.metodoTitular}>{m.titular}</Text>
                  <Text style={styles.metodoNumero}>{m.numero}</Text>
                </View>
                <TouchableOpacity onPress={() => removeMetodo(m.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.disabledBtn]} 
          onPress={handleSubmit(onSubmit)}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Guardar Configuración</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.viewStoreBtn}
          onPress={() => navigation.navigate('Catalogo', { tiendaId: tienda.id })}
        >
          <MaterialCommunityIcons name="open-in-new" size={20} color={theme.colors.primary} />
          <Text style={styles.viewStoreText}>Ver mi Tienda (Vista Cliente)</Text>
        </TouchableOpacity>

        {/* Módulo de configuración de cuenta */}
        <AccountSettingsModal />

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={signOut}
        >
          <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Agregar Método */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Cuenta de Pago</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={styles.labelModal}>Banco / Plataforma</Text>
            <TextInput
              style={styles.inputModal}
              value={banco}
              onChangeText={setBanco}
              placeholder="Ej. Nequi, Davivienda..."
            />

            <Text style={styles.labelModal}>Nombre del titular</Text>
            <TextInput
              style={styles.inputModal}
              value={titular}
              onChangeText={setTitular}
              placeholder="Ej. Juan Pérez"
            />

            <Text style={styles.labelModal}>Número de cuenta / celular</Text>
            <TextInput
              style={styles.inputModal}
              value={numero}
              onChangeText={setNumero}
              keyboardType="phone-pad"
              placeholder="Ej. 3001234567"
            />

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddMetodo}>
              <Text style={styles.saveBtnText}>Guardar Cuenta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderColor: theme.colors.outline },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface },
  scroll: { padding: 16, gap: 16 },
  infoBox: {
    backgroundColor: '#c1ecd4',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a5d0b9',
  },
  infoTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primary, marginTop: 8 },
  infoSubtitle: { fontSize: 13, color: '#1b4332', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, elevation: 1 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  addBtnText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: theme.colors.onSurfaceVariant, fontSize: 12, paddingVertical: 8 },
  metodoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.outline, paddingVertical: 8 },
  metodoBanco: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  metodoTitular: { fontSize: 13, color: theme.colors.onSurfaceVariant },
  metodoNumero: { fontSize: 13, color: theme.colors.onSurfaceVariant },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: theme.colors.onPrimary, fontWeight: '700', fontSize: 16 },
  viewStoreBtn: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  viewStoreText: { color: theme.colors.primary, fontWeight: '700', fontSize: 15 },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  logoutText: { color: theme.colors.error, fontWeight: '700', fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.onSurface },
  labelModal: { fontSize: 12, fontWeight: '500', color: theme.colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 },
  inputModal: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.onSurface,
  },
  modalSaveBtn: {
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});
