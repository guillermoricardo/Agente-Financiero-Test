# Región de Supabase: Americas en vez de europea

**Fecha:** 2026-08-20 16:15
**Tipo:** Documentación

## Qué se hizo

El proyecto asumía "región europea" en Supabase, atado explícitamente al RGPD
europeo, porque nació como caso de curso sin una geografía de cliente
definida. El usuario confirmó que sus clientes están en Latinoamérica/EE.UU.,
no en la UE, así que se actualizó la decisión documentada:

- Región del proveedor de base de datos: europea → **Americas**.
- La referencia normativa de protección de datos: RGPD → **LFPDPPP**
  (Ley Federal de Protección de Datos Personales en Posesión de los
  Particulares, México), donde aparecía ligada a la región o a un principio
  general (minimización, consentimiento previo).

## Qué se modificó

`docs/roadmap.md`, `docs/architecture.md`, `docs/prd.md`, `docs/business.md`,
`docs/data-model.md`, `.env.example`, `CLAUDE.md`, `README.md`,
`supabase/migrations/0001_esquema_inicial.sql` (solo comentarios SQL, el
esquema en sí no cambia).

## Por qué

`CLAUDE.md` obliga a mantener `docs/` sincronizada con las decisiones reales
del proyecto. La región de base de datos y la normativa de protección de
datos de referencia son decisiones de negocio, no de código: dejarlas
desalineadas habría hecho que un agente futuro (o esta misma sesión, en la
Fase 2) creara el proyecto de Supabase en la región equivocada.

## Pendiente, fuera de este cambio

`docs/business.md` § «No es asesoramiento financiero regulado» sigue anclado
a España (menciona la CNMV como regulador). No se tocó porque no se pidió
explícitamente — si los clientes ya no son europeos, probablemente haga falta
referenciar el regulador mexicano (CNBV) o aclarar bajo qué marco opera el
producto en la nueva jurisdicción. Queda anotado con un comentario HTML en el
propio documento.
