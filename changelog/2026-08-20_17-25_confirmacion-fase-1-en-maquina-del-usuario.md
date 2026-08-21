# Confirmación de la Fase 1 en la máquina del usuario

**Fecha:** 2026-08-20 17:25
**Tipo:** Documentación

## Qué se hizo

Se confirmó en la máquina del usuario (Windows) el criterio de aceptación
completo de la Fase 1: `pnpm install`, `pnpm test` (95 tests en verde) y
`pnpm dev` (app abierta en `http://localhost:3000`).

En el primer intento, `pnpm install` falló con un `ENOENT` confuso al
instalar `esbuild` (dependencia de Vitest). La causa: el proyecto vivía dentro
de una ruta de OneDrive muy anidada
(`...\03. Monta el Dashboard en web\Estructura del agente\Clase-Agente-Financiero-main`),
y al sumarle las subcarpetas internas de `pnpm`
(`node_modules\.pnpm\esbuild@0.28.2\node_modules\esbuild\bin\esbuild`) se
superó el límite clásico de ruta de Windows (~260 caracteres).

## Qué se modificó

- `docs/architecture.md` — nueva entrada en «Trampas conocidas del stack»:
  `pnpm install` falla con `ENOENT` en Windows si la carpeta está muy anidada.
- `docs/roadmap.md` — Fase 1 marcada como completada **y confirmada**
  (ya no queda pendiente `pnpm dev`).

## Por qué

Es exactamente el tipo de trampa que pide documentar `CLAUDE.md`: costó
tiempo, el error no decía la causa real, y la solución (mover el proyecto a
una ruta corta fuera de OneDrive) no es obvia a partir del mensaje de error.
Dejarla anotada evita que la próxima persona que clone el repo en una ruta
larga pierda tiempo con lo mismo.
