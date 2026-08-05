import { decode } from 'base64-arraybuffer';
import { supabase } from '../config/supabase';

export const PRODUCTOS_BUCKET = 'productos-imagenes';

/**
 * Lista los productos de una tienda, ordenados por nombre.
 */
export async function listProductos(tiendaId) {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categoria:categorias(id, nombre, icono)')
    .eq('tienda_id', tiendaId)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

export async function uploadProductoImagen(tiendaId, asset) {
  if (!asset?.base64) {
    throw new Error('La imagen seleccionada no incluye datos base64 para subir.');
  }

  const extension = (asset.mimeType?.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const randomId = Math.random().toString(36).substring(2, 8);
  const path = `${tiendaId}/${Date.now()}_${randomId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCTOS_BUCKET)
    .upload(path, decode(asset.base64), {
      contentType: asset.mimeType || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(PRODUCTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function extractStoragePath(imagenUrl) {
  if (!imagenUrl) return null;
  const marker = `/object/public/${PRODUCTOS_BUCKET}/`;
  const idx = imagenUrl.indexOf(marker);
  if (idx === -1) return null;
  return imagenUrl.slice(idx + marker.length);
}

import AsyncStorage from '@react-native-async-storage/async-storage';

async function deleteProductoImagenSilencioso(imagenUrl) {
  const path = extractStoragePath(imagenUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(PRODUCTOS_BUCKET).remove([path]);
  if (error) {
    console.warn('[products] No se pudo borrar la imagen anterior:', error.message);
    try {
      const pendingStr = await AsyncStorage.getItem('pending_image_deletions');
      const pending = pendingStr ? JSON.parse(pendingStr) : [];
      pending.push(path);
      await AsyncStorage.setItem('pending_image_deletions', JSON.stringify(pending));
    } catch (e) {
      console.error('Error guardando imagen pendiente de borrado', e);
    }
  }
}

export async function retryPendingImageDeletions() {
  try {
    const pendingStr = await AsyncStorage.getItem('pending_image_deletions');
    const pending = pendingStr ? JSON.parse(pendingStr) : [];
    if (pending.length === 0) return;

    const { error } = await supabase.storage.from(PRODUCTOS_BUCKET).remove(pending);
    if (!error) {
      await AsyncStorage.removeItem('pending_image_deletions');
      console.log(`[products] Se eliminaron ${pending.length} imágenes pendientes.`);
    } else {
      console.warn('[products] Error reintentando borrado de imágenes:', error.message);
    }
  } catch (e) {
    console.error('Error en retryPendingImageDeletions', e);
  }
}

export async function createProducto({ tiendaId, nombre, precio, stock, categoria_id, precio_oferta, imageAsset }) {
  let imagen_url = null;
  if (imageAsset) {
    imagen_url = await uploadProductoImagen(tiendaId, imageAsset);
  }

  const { data, error } = await supabase
    .from('productos')
    .insert({
      tienda_id: tiendaId,
      nombre: nombre.trim(),
      precio,
      stock,
      categoria_id,
      precio_oferta: precio_oferta || null,
      imagen_url,
    })
    .select('*, categoria:categorias(id, nombre, icono)')
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateProductos(tiendaId, registros) {
  if (!registros || registros.length === 0) return [];
  const payload = registros.map(r => ({
    tienda_id: tiendaId,
    nombre: r.nombre.trim(),
    precio: r.precio,
    stock: r.stock || 0,
    precio_oferta: r.precio_oferta || null,
    categoria_id: r.categoria_id || null,
  }));

  const { data, error } = await supabase
    .from('productos')
    .insert(payload)
    .select('*, categoria:categorias(id, nombre, icono)');

  if (error) throw error;
  return data;
}

export async function updateProducto(producto, { nombre, precio, stock, categoria_id, precio_oferta, imageAsset }) {
  const updates = { 
    nombre: nombre.trim(), 
    precio, 
    stock,
    categoria_id,
    precio_oferta: precio_oferta || null 
  };

  if (imageAsset) {
    updates.imagen_url = await uploadProductoImagen(producto.tienda_id, imageAsset);
  }

  const { data, error } = await supabase
    .from('productos')
    .update(updates)
    .eq('id', producto.id)
    .select('*, categoria:categorias(id, nombre, icono)')
    .single();

  if (error) throw error;

  if (imageAsset && producto.imagen_url) {
    await deleteProductoImagenSilencioso(producto.imagen_url);
  }

  return data;
}

export async function deleteProducto(producto) {
  const { error } = await supabase.from('productos').delete().eq('id', producto.id);
  if (error) throw error;

  if (producto.imagen_url) {
    await deleteProductoImagenSilencioso(producto.imagen_url);
  }
}