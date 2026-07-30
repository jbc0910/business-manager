-- 1. Crear la tabla de pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    tienda_id UUID REFERENCES public.tiendas(id) ON DELETE CASCADE,
    nombre_cliente TEXT NOT NULL,
    direccion TEXT NOT NULL,
    total NUMERIC NOT NULL,
    metodo_pago TEXT NOT NULL,
    items JSONB NOT NULL,
    estado TEXT DEFAULT 'En preparación' NOT NULL,
    lat_entrega NUMERIC,
    long_entrega NUMERIC,
    lat_repartidor NUMERIC,
    long_repartidor NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
-- A. Permitir inserciones públicas (anon) desde la web
CREATE POLICY "Permitir crear pedidos al publico" 
ON public.pedidos FOR INSERT 
TO anon 
WITH CHECK (true);

-- B. Permitir lectura pública (anon) si conocen el ID del pedido (para la pantalla de rastreo web)
CREATE POLICY "Permitir leer pedido por ID al publico" 
ON public.pedidos FOR SELECT 
TO anon 
USING (true);

-- C. Permitir al administrador ver todos los pedidos de SU tienda
CREATE POLICY "Admins pueden ver pedidos de su tienda" 
ON public.pedidos FOR SELECT 
TO authenticated 
USING (
    tienda_id = (
        SELECT tienda_id FROM public.perfiles 
        WHERE id = auth.uid() AND rol = 'Administrador'
    )
);

-- D. Permitir al domiciliario ver y actualizar pedidos de su tienda vinculada
CREATE POLICY "Domiciliarios pueden ver pedidos de su tienda" 
ON public.pedidos FOR SELECT 
TO authenticated 
USING (
    tienda_id = (
        SELECT tienda_id FROM public.perfiles 
        WHERE id = auth.uid() AND (rol = 'Domiciliario' OR rol = 'Repartidor')
    )
);

CREATE POLICY "Domiciliarios pueden actualizar pedidos de su tienda" 
ON public.pedidos FOR UPDATE 
TO authenticated 
USING (
    tienda_id = (
        SELECT tienda_id FROM public.perfiles 
        WHERE id = auth.uid() AND (rol = 'Domiciliario' OR rol = 'Repartidor')
    )
) WITH CHECK (
    tienda_id = (
        SELECT tienda_id FROM public.perfiles 
        WHERE id = auth.uid() AND (rol = 'Domiciliario' OR rol = 'Repartidor')
    )
);

-- 4. Activar Realtime para la tabla pedidos
-- IMPORTANTE: Activar Realtime desde el Dashboard de Supabase -> Database -> Replication -> Activar para 'pedidos'
