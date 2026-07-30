import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';

// Initialize Supabase with service role key to bypass RLS for inserting orders
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    if (!body.tienda_id || !body.nombre_cliente || !body.direccion || !body.items || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });
    }

    // 1. Fetch real product data to validate prices and stock
    const productIds = body.items.map((item: any) => item.id);
    const { data: realProducts, error: prodError } = await supabaseAdmin
      .from('productos')
      .select('id, precio, precio_oferta, stock, nombre')
      .in('id', productIds);

    if (prodError || !realProducts) {
      return new Response(JSON.stringify({ error: 'Error verificando productos' }), { status: 500 });
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    // 2. Validate each item
    for (const item of body.items) {
      const realProduct = realProducts.find(p => p.id === item.id);
      
      if (!realProduct) {
        return new Response(JSON.stringify({ error: `Producto no encontrado: ${item.nombre}` }), { status: 400 });
      }
      
      if (realProduct.stock <= 0) {
        return new Response(JSON.stringify({ error: `El producto '${realProduct.nombre}' está agotado.` }), { status: 400 });
      }

      // Use the effective price from DB
      const effectivePrice = (realProduct.precio_oferta && realProduct.precio_oferta > 0) 
        ? realProduct.precio_oferta 
        : realProduct.precio;

      calculatedTotal += (effectivePrice * item.qty);
      
      validatedItems.push({
        id: item.id,
        nombre: realProduct.nombre,
        precio: effectivePrice,
        qty: item.qty,
        imagen_url: item.imagen_url
      });
    }

    // 3. Insert the order securely
    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .insert({
        tienda_id: body.tienda_id,
        nombre_cliente: body.nombre_cliente,
        direccion: body.direccion,
        metodo_pago: body.metodo_pago,
        total: calculatedTotal,
        items: validatedItems,
        estado: 'En preparación'
      })
      .select()
      .single();

    if (error) {
      console.error('Error insertando pedido:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, pedido: data }), { status: 200 });

  } catch (e: any) {
    console.error('Error procesando pedido:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
