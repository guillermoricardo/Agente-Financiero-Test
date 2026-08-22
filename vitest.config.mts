import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Fase 7: generar-analisis.ts es el primer archivo con imports de VALOR (no
// solo `import type`) usando el alias `@/...` de tsconfig.json que además se
// prueba con Vitest. Hasta ahora funcionaba "por accidente": los `@/...` que
// había en código bajo test eran siempre `import type`, y TypeScript los
// borra al transpilar — nunca llegaban a resolverse en tiempo de ejecución.
// Sin este alias, un import de VALOR con `@/` rompe en Vitest aunque
// `pnpm build` (que sí usa tsconfig.json) compile perfecto.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
