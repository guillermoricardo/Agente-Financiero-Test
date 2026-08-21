# Inicialización del proyecto a partir de la plantilla

**Fecha:** 2026-08-11 12:30
**Tipo:** Configuración

## Qué se hizo

Se convirtió la plantilla en el repositorio de este proyecto y se dejó
preparado todo lo necesario para construir la aplicación sin escribir todavía
código de aplicación.

- Se incorporó el **criterio financiero** heredado de las sesiones anteriores
  del curso (reglas R1–R10, plantilla de entrevista, instrucciones del motor)
  en `docs/criterio/`.
- Se incorporó el **motor de cálculo** ya portado a TypeScript y verificado con
  95 tests contra el motor original de Python, que se conserva en
  `motor-python/` como oráculo.
- Se escribieron los ocho documentos de `docs/` con las decisiones de producto
  y arquitectura ya cerradas.
- Se escribió el **esquema de base de datos** en `supabase/migrations/`, sin
  aplicar.
- Se ejecutó el checklist de inicialización: README reescrito para el proyecto,
  `CLAUDE.md` relleno, LICENSE, `.env.example` ajustado a este stack, y borrado
  de `.template/` y del comando `/init-proyecto`.

La aplicación **no se construye aquí a propósito**: levantarla es el objetivo
de la sesión de clase, siguiendo las fases de `docs/roadmap.md`.

## Qué se modificó

- `README.md`, `CLAUDE.md`, `LICENSE`, `.env.example`, `.gitignore`
- `docs/` — los ocho documentos, más la subcarpeta `docs/criterio/`
- `src/lib/motor/` — motor de cálculo y sus tests
- `motor-python/` — motor original y baseline de verificación
- `supabase/migrations/0001_esquema_inicial.sql`
- `material-clase/GUION-CLIENTE-PRUEBA.md`
- Eliminados: `.template/`, `.claude/commands/init-proyecto.md`

## Por qué

El sistema existía como agente de escritorio: funcionaba dentro de una
conversación, escribía fichas en markdown y requería editar a mano un script de
Python por cada cliente. No era multiusuario, no escalaba y no daba visión de
conjunto a la asesora.

El motor se hereda ya verificado en lugar de regenerarlo desde las reglas
porque son 500 líneas de matemática financiera con 95 tests que garantizan que
cada cifra coincide con el original. Reconstruirlo en cada sesión perdería esa
garantía y podría dar números distintos.
