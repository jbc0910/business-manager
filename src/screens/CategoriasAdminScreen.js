import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTienda } from '../context/TiendaContext';
import { theme } from '../styles/theme';
import { listCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/categorias';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmAction } from '../utils/confirm';

// Lista de iconos disponibles para seleccionar
const ICONOS_DISPONIBLES = [
  { nombre: 'General',          icono: 'tag-outline' },
  { nombre: 'Lácteos',          icono: 'bottle-wine-outline' },
  { nombre: 'Bebidas',          icono: 'cup-water' },
  { nombre: 'Frutas',           icono: 'food-apple-outline' },
  { nombre: 'Snacks',           icono: 'food-croissant' },
  { nombre: 'Limpieza',         icono: 'spray-bottle' },
  { nombre: 'Carnes',           icono: 'food-steak' },
  { nombre: 'Panadería',        icono: 'bread-slice-outline' },
  { nombre: 'Granos',           icono: 'grain' },
  { nombre: 'Condimentos',      icono: 'shaker-outline' },
  { nombre: 'Congelados',       icono: 'snowflake' },
  { nombre: 'Higiene',          icono: 'toothbrush-paste' },
  { nombre: 'Mascotas',         icono: 'paw-outline' },
  { nombre: 'Dulces',           icono: 'candy-outline' },
  { nombre: 'Café',             icono: 'coffee-outline' },
  { nombre: 'Enlatados',        icono: 'archive-outline' },
  { nombre: 'Aceites',          icono: 'bottle-soda-outline' },
];

export default function CategoriasAdminScreen() {
  const { tienda } = useTienda();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState(null);

  // Modal states
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('tag-outline');
  const [saving, setSaving] = useState(false);

  const cargarCategorias = useCallback(async () => {
    if (!tienda?.id) return;
    try {
      const data = await listCategorias(tienda.id);
      setCategorias(data);
    } catch (err) {
      console.error('[Categorias] Error cargando:', err);
      Alert.alert('Error', 'No se pudieron cargar las categorías.');
    } finally {
      setLoading(false);
    }
  }, [tienda?.id]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  const openCreateModal = () => {
    setCategoriaEnEdicion(null);
    setNombre('');
    setIcono('tag-outline');
    setModalVisible(true);
  };

  const openEditModal = (cat) => {
    setCategoriaEnEdicion(cat);
    setNombre(cat.nombre);
    setIcono(cat.icono || 'tag-outline');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre de la categoría es requerido.');
      return;
    }

    setSaving(true);
    try {
      if (categoriaEnEdicion) {
        const actualizado = await updateCategoria(categoriaEnEdicion.id, { nombre, icono });
        setCategorias(prev => prev.map(c => c.id === actualizado.id ? actualizado : c));
      } else {
        const nuevo = await createCategoria({ tiendaId: tienda.id, nombre, icono });
        setCategorias(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      setModalVisible(false);
    } catch (err) {
      console.error('[Categorias] Error guardando:', err);
      Alert.alert('Error', 'No se pudo guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat) => {
    confirmAction({
      title: 'Eliminar Categoría',
      message: `¿Seguro que quieres eliminar "${cat.nombre}"?`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteCategoria(cat.id);
          setCategorias(prev => prev.filter(c => c.id !== cat.id));
        } catch (err) {
          console.error('[Categorias] Error eliminando:', err);
          Alert.alert('Error', 'No se pudo eliminar la categoría.');
        }
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorías</Text>
      </View>

      <FlatList
        data={categorias}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="tag-multiple-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>Sin categorías aún</Text>
            <Text style={styles.emptySubtext}>Toca el + para crear tu primera categoría</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name={item.icono || 'tag-outline'} size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{item.nombre}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, styles.actionBtnDanger]}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.colors.orangeText} />
      </TouchableOpacity>

      {/* ── Modal crear/editar ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {categoriaEnEdicion ? 'Editar Categoría' : 'Nueva Categoría'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Nombre */}
            <Text style={styles.label}>Nombre de la categoría</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Bebidas"
              placeholderTextColor={theme.colors.onSurfaceMuted}
            />

            {/* Selector de ícono */}
            <Text style={styles.label}>Ícono</Text>
            <TouchableOpacity
              style={styles.iconSelector}
              onPress={() => setIconPickerVisible(true)}
            >
              <View style={styles.iconSelectorLeft}>
                <View style={styles.iconPreview}>
                  <MaterialCommunityIcons name={icono} size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.iconSelectorText}>
                  {ICONOS_DISPONIBLES.find(i => i.icono === icono)?.nombre || icono}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal selector de ícono ── */}
      <Modal visible={iconPickerVisible} animationType="slide" transparent onRequestClose={() => setIconPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.iconPickerModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona un ícono</Text>
              <TouchableOpacity onPress={() => setIconPickerVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.iconsGrid}>
                {ICONOS_DISPONIBLES.map((item) => {
                  const isSelected = icono === item.icono;
                  return (
                    <TouchableOpacity
                      key={item.icono}
                      style={[styles.iconOption, isSelected && styles.iconOptionSelected]}
                      onPress={() => {
                        setIcono(item.icono);
                        setIconPickerVisible(false);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={item.icono}
                        size={28}
                        color={isSelected ? theme.colors.onPrimary : theme.colors.primary}
                      />
                      <Text style={[styles.iconOptionLabel, isSelected && styles.iconOptionLabelSelected]}>
                        {item.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.outline,
  },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: theme.colors.onSurface },
  emptySubtext: { fontSize: 13, color: theme.colors.onSurfaceVariant, textAlign: 'center' },

  card: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.onSurface },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 8, backgroundColor: theme.colors.background, borderRadius: 10 },
  actionBtnDanger: { backgroundColor: '#fff1f1' },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.orangeContainer || '#fd8603',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#fd8603',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  iconPickerModal: { maxHeight: '75%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.onSurface },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: theme.colors.onSurface,
  },

  // Botón selector de ícono
  iconSelector: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceDim || '#f5f5f5',
  },
  iconSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconPreview: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorText: { fontSize: 15, fontWeight: '500', color: theme.colors.onSurface },

  // Grid de íconos
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 24,
  },
  iconOption: {
    width: '22%',
    aspectRatio: 0.9,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  iconOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  iconOptionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  iconOptionLabelSelected: {
    color: theme.colors.onPrimary,
  },

  saveBtn: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: theme.colors.onPrimary, fontWeight: '700', fontSize: 16 },
});
