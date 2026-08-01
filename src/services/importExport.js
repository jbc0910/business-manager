import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';

/**
 * Exporta la lista de productos como Excel (.xlsx).
 * En Web descarga el archivo directamente.
 * En Móvil abre el diálogo de compartir.
 */
export async function exportarProductosExcel(productos) {
  const data = productos.map(p => ({
    Nombre: p.nombre || '',
    Precio: p.precio || 0,
    Stock: p.stock || 0,
    'Precio Oferta': p.precio_oferta || '',
    Categoria: p.categoria?.nombre || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

  if (Platform.OS === 'web') {
    // En Web, XLSX.writeFile genera y descarga automáticamente el archivo .xlsx
    XLSX.writeFile(workbook, 'productos_export.xlsx');
    return;
  }

  // En Android / iOS usamos FileSystem y Sharing
  const base64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const path = `${FileSystem.cacheDirectory}productos_export.xlsx`;
  
  await FileSystem.writeAsStringAsync(path, base64Data, { encoding: FileSystem.EncodingType.Base64 });

  const puedeCompartir = await Sharing.isAvailableAsync();
  if (!puedeCompartir) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }

  await Sharing.shareAsync(path, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Exportar Excel de productos',
    UTI: 'com.microsoft.excel.xls',
  });
}

/**
 * Abre el selector de documentos para importar un Excel y devuelve los registros parseados.
 * Columnas soportadas: Nombre, Precio, Stock, Precio Oferta
 */
export async function leerExcelDeProductos() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      '*/*'
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  let json = [];

  try {
    // Lectura de arrayBuffer compatible con Web y Móvil
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const wb = XLSX.read(data, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    json = XLSX.utils.sheet_to_json(ws);
  } catch (err) {
    console.error('[Import] Error leyendo binario de excel:', err);
    throw new Error('No se pudo leer la información del archivo seleccionado.');
  }

  if (!json || json.length === 0) {
    throw new Error('El archivo Excel está vacío o no contiene filas con formato válido.');
  }

  const registros = [];
  for (const row of json) {
    // Lectura flexible de encabezados
    const nombre = (row.Nombre || row.nombre || row.PRODUCTO || row.Producto || row.Title || row.title)?.toString().trim();
    const precioRaw = row.Precio ?? row.precio ?? row.PRECIO ?? row.Price ?? row.price;
    const precio = parseFloat(precioRaw);
    const stockRaw = row.Stock ?? row.stock ?? row.STOCK ?? row.Cantidad ?? row.cantidad ?? 0;
    const stock = parseInt(stockRaw, 10);
    const precio_ofertaRaw = row['Precio Oferta'] || row.precio_oferta || row.Oferta || row.oferta;
    const precio_oferta = precio_ofertaRaw ? parseFloat(precio_ofertaRaw) : null;

    if (!nombre || isNaN(precio)) continue;

    registros.push({
      nombre,
      precio,
      stock: isNaN(stock) ? 0 : stock,
      precio_oferta: isNaN(precio_oferta) ? null : precio_oferta
    });
  }

  return registros;
}
