import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { theme } from '../../styles/theme';

export default function RastreoActivoScreen({ route, navigation }) {
  const { pedido } = route.params;
  const [estado, setEstado] = useState(pedido.estado);
  const [loading, setLoading] = useState(false);

  // SIMULACIÓN DE MAPA Y UBICACIÓN
  // En un entorno real aquí usaríamos <MapView> de react-native-maps
  // y Location.watchPositionAsync() de expo-location

  const actualizarEstado = async (nuevoEstado) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedido.id);
        
      if (error) throw error;
      setEstado(nuevoEstado);
      
      if (nuevoEstado === 'Entregado') {
        Alert.alert('Éxito', 'Pedido entregado.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
      Alert.alert('Error', 'No se pudo actualizar el estado.');
    } finally {
      setLoading(false);
    }
  };

  const simularMovimiento = async () => {
    // Simula que el repartidor se mueve (cambia coordenadas en DB para que la web lo vea)
    try {
      // Coordenadas dummy de ejemplo (Bogotá)
      const lat = 4.6097102 + (Math.random() * 0.001);
      const lng = -74.081749 + (Math.random() * 0.001);
      
      await supabase
        .from('pedidos')
        .update({ lat_repartidor: lat, long_repartidor: lng })
        .eq('id', pedido.id);
        
      Alert.alert('Simulación', 'Coordenadas actualizadas en Supabase. Revisa la web para ver cómo se mueve el marcador.');
    } catch(e) {}
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Pedido #{pedido.id.slice(0, 6)}</Text>
      </View>

      <View style={styles.mapContainer}>
        <MaterialCommunityIcons name="map" size={64} color={theme.colors.outline} />
        <Text style={styles.mapText}>Área del Mapa Simulado</Text>
        <TouchableOpacity style={styles.simulateBtn} onPress={simularMovimiento}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#fff" />
          <Text style={styles.simulateText}>Simular Movimiento GPS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>Cliente</Text>
        <Text style={styles.value}>{pedido.nombre_cliente}</Text>
        
        <Text style={styles.label}>Dirección</Text>
        <Text style={styles.value}>{pedido.direccion}</Text>

        <Text style={styles.label}>Estado Actual</Text>
        <Text style={styles.value}>{estado}</Text>
      </View>

      <View style={styles.actionsContainer}>
        {estado !== 'En camino' && estado !== 'Entregado' && (
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: '#3b82f6' }]} 
            onPress={() => actualizarEstado('En camino')}
            disabled={loading}
          >
            <Text style={styles.btnText}>Marcar "En Camino"</Text>
          </TouchableOpacity>
        )}
        
        {estado === 'En camino' && (
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: '#10b981' }]} 
            onPress={() => actualizarEstado('Entregado')}
            disabled={loading}
          >
            <Text style={styles.btnText}>Marcar "Entregado"</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderColor: theme.colors.outline },
  backBtn: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface },
  mapContainer: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  mapText: { fontSize: 16, fontWeight: '600', color: theme.colors.outline, marginTop: 8 },
  simulateBtn: { flexDirection: 'row', backgroundColor: '#334155', padding: 12, borderRadius: 8, marginTop: 16, alignItems: 'center', gap: 8 },
  simulateText: { color: '#fff', fontWeight: '600' },
  infoCard: { backgroundColor: theme.colors.surface, padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 4, marginTop: -20 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 4, marginTop: 12 },
  value: { fontSize: 16, color: theme.colors.onSurface, fontWeight: '500' },
  actionsContainer: { backgroundColor: theme.colors.surface, padding: 16, paddingBottom: 32 },
  btn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
