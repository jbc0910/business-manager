import { supabase } from '../../lib/supabase';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validar datos básicos
    if (!body.tienda_id || !body.nombre_cliente || !body.direccion || !body.items || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('pedidos')
      .insert({
        tienda_id: body.tienda_id,
        nombre_cliente: body.nombre_cliente,
        direccion: body.direccion,
        metodo_pago: body.metodo_pago,
        total: body.total,
        items: body.items,
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
