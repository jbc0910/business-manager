import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useCart } from '../context/CartContext';

const formatPrecio = (precio) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(precio);

export const ProductCardCliente = ({ producto }) => {
  const { items, addItem, removeItem } = useCart();
  
  const cartItem = items.find(i => i.producto.id === producto.id);
  const cantidad = cartItem ? cartItem.cantidad : 0;
  
  const tieneOferta = producto.precio_oferta && producto.precio_oferta < producto.precio;
  const precioFinal = tieneOferta ? producto.precio_oferta : producto.precio;
  
  // Calcular porcentaje descuento
  const descuento = tieneOferta 
    ? Math.round(((producto.precio - producto.precio_oferta) / producto.precio) * 100) 
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {producto.imagen_url ? (
          <Image source={{ uri: producto.imagen_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <MaterialCommunityIcons name="image-off-outline" size={28} color={theme.colors.onSurfaceMuted} />
          </View>
        )}
        
        {tieneOferta && (
          <View style={styles.badgeOferta}>
            <Text style={styles.textOferta}>-{descuento}%</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.categoria} numberOfLines={1}>
          {producto.categoria?.nombre?.toUpperCase() || 'GENERAL'}
        </Text>
        <Text style={styles.nombre} numberOfLines={2}>
          {producto.nombre}
        </Text>
        
        <View style={styles.precioRow}>
          <Text style={styles.precioFinal}>{formatPrecio(precioFinal)}</Text>
          {tieneOferta && (
            <Text style={styles.precioAnterior}>{formatPrecio(producto.precio)}</Text>
          )}
        </View>
      </View>

      <View style={styles.controlsRow}>
        {producto.stock <= 0 ? (
          <View style={styles.btnAgotado}>
            <Text style={styles.btnAgotadoText}>Agotado</Text>
          </View>
        ) : cantidad > 0 ? (
          <View style={styles.counterGroup}>
            <TouchableOpacity 
              style={styles.btnMinus} 
              onPress={() => removeItem(producto.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="minus" size={20} color={theme.colors.onSurface} />
            </TouchableOpacity>
            
            <Text style={styles.qtyText}>{cantidad}</Text>
            
            <TouchableOpacity 
              style={styles.btnPlusFilled} 
              onPress={() => addItem(producto)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.btnAdd} 
            onPress={() => addItem(producto)}
          >
            <MaterialCommunityIcons name="cart-plus" size={18} color={theme.colors.orangeText} />
            <Text style={styles.btnAddText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.rounded.md,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    overflow: 'hidden',
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: theme.colors.surfaceBright,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOferta: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.colors.orange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textOferta: {
    color: theme.colors.orangeText,
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    padding: theme.spacing.sm,
    gap: 4,
  },
  categoria: {
    ...theme.typography.labelCaps,
    color: theme.colors.primaryLight,
  },
  nombre: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    lineHeight: 18,
    minHeight: 36, // Ensure height for 2 lines
  },
  precioRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  precioFinal: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  precioAnterior: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  controlsRow: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    marginTop: 'auto', // push to bottom
  },
  btnAdd: {
    backgroundColor: theme.colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.rounded.sm,
    gap: 6,
  },
  btnAddText: {
    color: theme.colors.orangeText,
    fontWeight: '600',
    fontSize: 14,
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.rounded.sm,
  },
  btnMinus: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  btnPlusFilled: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.rounded.sm,
    width: 36,
  },
  btnAgotado: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: theme.rounded.sm,
  },
  btnAgotadoText: {
    color: '#ba1a1a',
    fontWeight: '700',
    fontSize: 14,
  },
});
