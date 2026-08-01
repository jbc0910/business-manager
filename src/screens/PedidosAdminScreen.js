import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTienda } from '../context/TiendaContext';
import { theme } from '../styles/theme';

export default function PedidosAdminScreen() {
  const { tienda } = useTienda();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPedidos();
    
    // Suscripción a cambios en tiempo real
    const channel = supabase.channel('pedidos-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `tienda_id=eq.${tienda?.id}` }, payload => {
        fetchPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tienda?.id]);

  const fetchPedidos = async () => {
    if (!tienda?.id) return;
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('tienda_id', tienda.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('[PedidosAdmin] Error cargando pedidos:', error);
        throw error;
      }
      console.log(`[PedidosAdmin] ${data?.length || 0} pedidos cargados para la tienda ${tienda.id}`);
      setPedidos(data || []);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'En preparación': return '#f59e0b'; // ambar
      case 'En camino': return '#3b82f6'; // azul
      case 'Entregado': return '#10b981'; // verde
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>Pedido #{item.id.slice(0, 6)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>
      
      <Text style={styles.clientName}>{item.nombre_cliente}</Text>
      <Text style={styles.address}>{item.direccion}</Text>
      
      <View style={styles.divider} />
      
      <Text style={styles.totalLabel}>Total: <Text style={styles.totalValue}>${Number(item.total).toLocaleString('es-CO')}</Text></Text>
      <Text style={styles.paymentMethod}>Pago con: {item.metodo_pago}</Text>
      
      <View style={styles.itemsContainer}>
        {item.items && item.items.map((prod, idx) => (
          <Text key={idx} style={styles.itemText}>• {prod.qty}x {prod.nombre}</Text>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Pedidos</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : pedidos.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={theme.colors.outline} />
          <Text style={styles.emptyText}>Aún no hay pedidos registrados.</Text>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderColor: theme.colors.outline },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, color: theme.colors.onSurfaceVariant, fontWeight: '500' },
  listContainer: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNumber: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  clientName: { fontSize: 16, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 },
  address: { fontSize: 14, color: theme.colors.onSurfaceVariant },
  divider: { height: 1, backgroundColor: theme.colors.outline, marginVertical: 12 },
  totalLabel: { fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 2 },
  totalValue: { fontWeight: '700', color: theme.colors.onSurface },
  paymentMethod: { fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 8 },
  itemsContainer: { backgroundColor: theme.colors.background, padding: 8, borderRadius: 8 },
  itemText: { fontSize: 13, color: theme.colors.onSurface, marginBottom: 2 },
});
