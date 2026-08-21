import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Cliente de servidor. Usa SUPABASE_SERVICE_ROLE_KEY: salta RLS por completo.
//
// El `import 'server-only'` de arriba no es decorativo: si algún día alguien
// importa este archivo por accidente desde un componente de cliente, el
// build de Next.js falla en vez de filtrar la clave de servicio al
// navegador. Es la manera de convertir en error de compilación la regla de
// docs/architecture.md § "La clave de la API vive en el servidor" /
// "El cliente nunca habla con la base de datos".
//
// Uso previsto: únicamente dentro de rutas de servidor (app/api/**) que ya
// hayan validado el token de la entrevista antes de tocar la base de datos.
// Nunca se expone directamente a una petición sin esa validación.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. ' +
      'Revisa tu .env.local (cópialo desde .env.example si no existe).',
  );
}

export const supabaseServidor = createClient(url, serviceRoleKey, {
  auth: {
    // Este cliente no gestiona sesión de usuario: cada petición es sin
    // estado y se autoriza con la service role key, no con un login.
    autoRefreshToken: false,
    persistSession: false,
  },
});
