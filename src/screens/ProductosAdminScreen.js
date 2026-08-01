import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTienda } from '../context/TiendaContext';
import { theme } from '../styles/theme';
import { ProductCard } from '../components/ProductCard';
import { ProductFormModal } from '../components/ProductFormModal';
import {
  listProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from '../services/products';
import { listCategorias } from '../services/categorias';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exportarProductosExcel, leerExcelDeProductos } from '../services/importExport';
import { confirmAction } from '../utils/confirm';

export default function ProductosAdminScreen({ navigation }) {
  const { tienda } = useTienda();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState(null);
  const [savingProducto, setSavingProducto] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const cargarProductos = useCallback(async () => {
    if (!tienda?.id) return;
    try {
      setListError('');
      const [productosData, categoriasData] = await Promise.all([
        listProductos(tienda.id),
        listCategorias(tienda.id)
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
    } catch (err) {
      console.error('[Dashboard] Error cargando datos:', err);
      setListError('No se pudieron cargar los productos.');
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [tienda?.id]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleRefresh = () => {
    setRefreshing(true);
    cargarProductos();
  };

  const openCreateModal = () => {
    setProductoEnEdicion(null);
    setModalVisible(true);
  };

  const openEditModal = (producto) => {
    setProductoEnEdicion(producto);
    setModalVisible(true);
  };

  const handleSubmit = async (formData, imageAsset) => {
    setSavingProducto(true);
    try {
      if (productoEnEdicion) {
        const actualizado = await updateProducto(productoEnEdicion, { ...formData, imageAsset });
        setProductos((prev) =>
          prev
            .map((p) => (p.id === actualizado.id ? actualizado : p))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
      } else {
        const nuevo = await createProducto({ tiendaId: tienda.id, ...formData, imageAsset });
        setProductos((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo guardar el producto.');
    } finally {
      setSavingProducto(false);
    }
  };

  const handleDelete = (producto) => {
    confirmAction({
      title: 'Eliminar producto',
      message: `¿Seguro que quieres eliminar "${producto.nombre}"?`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteProducto(producto);
          setProductos((prev) => prev.filter((p) => p.id !== producto.id));
        } catch (err) {
          console.error('[Delete] Error eliminando producto:', JSON.stringify(err));
          Alert.alert(
            'Error al eliminar',
            err.message || 'No se pudo eliminar el producto.'
          );
        }
      },
    });
  };

  const handleExport = async () => {
    if (productos.length === 0) {
      Alert.alert('Sin productos', 'No hay productos para exportar.');
      return;
    }
    setExporting(true);
    try {
      await exportarProductosExcel(productos);
    } catch (err) {
      console.error('[Export]', err);
      Alert.alert('Error', err.message || 'No se pudo exportar.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const registros = await leerExcelDeProductos();
      if (!registros) { setImporting(false); return; }
      if (registros.length === 0) {
        Alert.alert('Archivo válido, sin datos', 'La hoja de cálculo no tiene filas válidas.');
        setImporting(false);
        return;
      }

      // Insertar en lote
      let exitosos = 0;
      for (const r of registros) {
        try {
          const nuevo = await createProducto({ tiendaId: tienda.id, ...r, imageAsset: null });
          setProductos(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
          exitosos++;
        } catch (e) {
          console.warn('[Import] Fila fallida:', r.nombre, e.message);
        }
      }

      Alert.alert(
        'Importación completa',
        `Se importaron ${exitosos} de ${registros.length} productos.`
      );
    } catch (err) {
      console.error('[Import]', err);
      Alert.alert('Error', err.message || 'No se pudo importar el archivo.');
    } finally {
      setImporting(false);
    }
  };

  // Filtrado por buscador
  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

  // Métricas
  const totalAgotados = productos.filter(p => p.stock === 0).length;
  const totalBajoStock = productos.filter(p => p.stock > 0 && p.stock <= 5).length;
  const valorTotal = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tienda?.nombre_tienda || 'Inventario'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleImport} disabled={importing}>
            {importing
              ? <ActivityIndicator size="small" color={theme.colors.primary} />
              : <MaterialCommunityIcons name="tray-arrow-up" size={20} color={theme.colors.primary} />
            }
            <Text style={styles.headerBtnText}>Importar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, styles.headerBtnExport]} onPress={handleExport} disabled={exporting}>
            {exporting
              ? <ActivityIndicator size="small" color={theme.colors.orangeText} />
              : <MaterialCommunityIcons name="tray-arrow-down" size={20} color={theme.colors.orangeText} />
            }
            <Text style={[styles.headerBtnText, { color: theme.colors.orangeText }]}>Exportar</Text>
          </TouchableOpacity>
        </View>
      </View>


      <View style={styles.metricsContainer}>
        <View style={styles.metricCardFull}>
          <View>
            <Text style={styles.metricLabel}>Total de Productos</Text>
            <Text style={styles.metricValue}>{productos.length}</Text>
          </View>
          <MaterialCommunityIcons name="package-variant-closed" size={32} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.3 }} />
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { borderLeftColor: theme.colors.error, borderLeftWidth: 4 }]}>
            <Text style={styles.metricLabel}>Agotados</Text>
            <Text style={[styles.metricValue, { color: theme.colors.error }]}>{totalAgotados}</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: theme.colors.orange, borderLeftWidth: 4 }]}>
            <Text style={styles.metricLabel}>Stock Bajo</Text>
            <Text style={[styles.metricValue, { color: theme.colors.orange }]}>{totalBajoStock}</Text>
          </View>
        </View>

        <View style={[styles.metricCardFull, { borderLeftColor: '#934b00', borderLeftWidth: 4 }]}>
          <View>
            <Text style={styles.metricLabel}>Valor estimado en stock</Text>
            <Text style={[styles.metricValue, { color: '#934b00' }]}>${valorTotal.toLocaleString('es-CO')}</Text>
          </View>
          <MaterialCommunityIcons name="cash" size={32} color="#934b00" style={{ opacity: 0.2 }} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {loadingList ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProductCard producto={item} onEdit={openEditModal} onDelete={handleDelete} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant" size={40} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>
                {listError || (searchQuery ? 'No se encontraron productos' : 'Todavía no tienes productos')}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreateModal} activeOpacity={0.85}>
        <MaterialCommunityIcons name="plus" size={28} color={theme.colors.orangeText} />
      </TouchableOpacity>

      <ProductFormModal
        visible={modalVisible}
        producto={productoEnEdicion}
        categorias={categorias}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        loading={savingProducto}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderColor: theme.colors.outline, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: theme.colors.primaryContainer, borderRadius: 8 },
  headerBtnExport: { backgroundColor: '#fff3e0' },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  metricsContainer: { padding: 16, gap: 12 },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricCardFull: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.onSurfaceVariant, textTransform: 'uppercase' },
  metricValue: { fontSize: 24, fontWeight: '700', color: theme.colors.onSurface, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, fontWeight: '500', color: theme.colors.onSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.orangeContainer,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#fd8603',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
