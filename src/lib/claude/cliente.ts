import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// docs/architecture.md § "La clave de la API vive en el servidor": las
// llamadas al modelo salen siempre de rutas de servidor. El `import
// 'server-only'` convierte en error de compilación cualquier intento de
// importar este archivo desde un componente de cliente.

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error(
    'Falta ANTHROPIC_API_KEY. Revisa tu .env.local (cópialo desde ' +
      '.env.example si no existe) y añade tu clave de console.anthropic.com.',
  );
}

export const claude = new Anthropic({ apiKey });

// Fase 4 no fija todavía una estrategia de cambio de modelo: se usa el mismo
// que documenta docs/architecture.md § Stack. Si cambia, se actualiza en un
// único sitio.
export const MODELO_ENTREVISTA = 'claude-sonnet-5';
