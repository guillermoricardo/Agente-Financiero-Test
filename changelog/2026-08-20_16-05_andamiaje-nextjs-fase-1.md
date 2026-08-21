# Andamiaje de Next.js — Fase 1 del roadmap

**Fecha:** 2026-08-20 16:05
**Tipo:** Feature

## Qué se hizo

Se montó el esqueleto de la aplicación alrededor del motor de cálculo ya
existente, cerrando la Fase 1 del roadmap:

- Proyecto Next.js 16 (App Router) + TypeScript + Tailwind CSS, generado con
  `create-next-app` en una carpeta temporal (la raíz del repo no estaba vacía)
  y fusionado después con el contenido ya existente (`docs/`,
  `src/lib/motor/`, `motor-python/`, `supabase/`, `material-clase/`).
- `package.json` fijado a `clase-agente-financiero` (el nombre de la carpeta
  original no era válido para npm por llevar mayúsculas).
- Gestor de paquetes `pnpm` fijado a la v11, tal como pide `CLAUDE.md`.
- Vitest configurado (`vitest.config.mts`, entorno `node`,
  `include: ['src/**/*.test.ts']`) y añadido a `package.json` con el script
  `pnpm test`.
- `pnpm-workspace.yaml` con `allowBuilds.esbuild: true` (dependencia nativa de
  Vitest) y `sharp`/`unrs-resolver` en `false` por no ser necesarios todavía.

## Qué se modificó

- Nuevo: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`,
  `eslint.config.mjs`, `next-env.d.ts`, `vitest.config.mts`,
  `src/app/` (layout, page, globals.css, favicon), `public/*.svg`.
- Sin tocar: `src/lib/motor/` (el motor verificado), `motor-python/`,
  `supabase/migrations/`, `docs/`, `material-clase/`.

## Por qué

Es el primer paso del roadmap («Fase 1 · Esqueleto»): montar el proyecto
alrededor del motor que ya existía, sin construir todavía ninguna pantalla.

## Verificación del criterio de aceptación

- `pnpm test` → **95 tests en verde** (84 en `motor.test.ts` + 11 en
  `caso-alex.test.ts`).
- `pnpm build` compila sin errores (App Router, TypeScript estricto,
  Tailwind).
- `pnpm lint` sin avisos.
- `pnpm dev` queda pendiente de confirmar en tu máquina: en el entorno donde
  se construyó este andamiaje no hay salida a internet, así que
  `next/font/google` (las fuentes Geist por defecto de `create-next-app`) no
  se pudieron descargar para probar el build completo con fuentes reales. Se
  verificó el build sustituyendo temporalmente las fuentes por unas locales,
  confirmando que compila, y se restauró el `layout.tsx` original antes de
  entregar el código — en tu máquina, con internet normal, `pnpm dev` debería
  descargarlas sin problema. Si no fuera así, es la única pieza que quedaría
  por revisar de esta fase.
