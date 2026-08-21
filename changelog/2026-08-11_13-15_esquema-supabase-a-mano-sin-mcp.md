# El esquema de Supabase se aplica a mano, no con el MCP

**Fecha:** 2026-08-11 13:15
**Tipo:** Documentación

## Qué se hizo

Se documentó que la Fase 2 del roadmap (aplicar el esquema inicial de
Supabase) se resuelve copiando `0001_esquema_inicial.sql` en el SQL Editor de
supabase.com, y no configurando el servidor MCP de Supabase.

## Qué se modificó

- `docs/roadmap.md` — Fase 2: pasos explícitos y la instrucción de no usar MCP
  para este paso.
- `docs/architecture.md` — nueva entrada en «Trampas conocidas del stack» y
  nota en «MCPs del proyecto».
- `CLAUDE.md` — regla añadida a «Qué NO hacer».

## Por qué

Al construir el proyecto desde el repositorio publicado, configurar el MCP de
Supabase resultó más frágil de lo que compensaba para un uso puntual: requiere
`claude mcp add` con comandos que varían según el sistema operativo, y es fácil
quedarse atascado en la terminal por algo ajeno al proyecto. Para pegar una
migración SQL una sola vez, copiar y pegar en el editor web es más simple y no
depende del entorno de cada alumno.

El MCP de Supabase sigue siendo una opción legítima más adelante, para tareas
que si lo justifiquen (logs, tipos TypeScript), a decisión del usuario.
