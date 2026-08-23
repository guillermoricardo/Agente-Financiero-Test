# Vigilancia de mercado y alerta de cambio de banda (Fase 11)

**Fecha:** 2026-08-23 23:58
**Tipo:** Feature

## Qué se hizo

Se añadió la Fase 11: una vez al día, un Cron Job de Vercel revisa cada
cliente con diagnóstico en modo `completo`, revaloriza su cartera calculada
con el rendimiento real de mercado observado desde el último análisis
(proxies vía Yahoo Finance, endpoint no oficial — riesgo aceptado
explícitamente), y vuelve a derivar la banda de probabilidad de cumplimiento
reutilizando el motor existente (`monteCarlo`, sin tocarlo). Si la banda
cambia — mejore o empeore —, se redacta una alerta (el modelo solo traduce
el JSON ya calculado, nunca calcula) y se envía por correo a la asesora y al
cliente, además de marcarse en el panel.

Esto amplía deliberadamente el alcance original del PRD, que excluía
"seguimiento continuo de carteras". El límite que se mantiene: el sistema
**avisa**, nunca **gestiona** — no ejecuta nada, no sube el riesgo, no
nombra productos ni promete rentabilidades, y el correo al cliente siempre
remite a hablar con su asesora.

Se creó la regla R11 en `docs/criterio/reglas-recomendacion.md` como fuente
de este criterio (igual que R1–R10), con sus supuestos marcados
`[estimado]` pendientes de validación: revalorizar sobre la cartera
calculada (no la ejecutada de verdad) y alertar en cualquier cambio de
banda, no solo si empeora.

## Qué se modificó

**Documentación:**
- `docs/criterio/reglas-recomendacion.md` — nueva R11.
- `docs/prd.md` — nueva funcionalidad F7, reabre el ítem de "fuera de
  alcance" con el matiz de que es alerta, no gestión.
- `docs/business.md` — reafirma el estatus regulatorio de la alerta y dos
  riesgos nuevos.
- `docs/architecture.md` — sección "Vigilancia de mercado", nueva trampa
  del stack (Yahoo Finance no oficial), variables de entorno nuevas.
- `docs/data-model.md` — tablas `alertas_mercado` y `precios_mercado`.
- `docs/roadmap.md` — Fase 11.
- `mejoras/backlog.md` — MEJORA-02 pasa a "en construcción" (el envío de
  correos se implementa aquí; extenderlo al plan y a nuevos leads queda
  pendiente).
- `README.md` — requisito nuevo (cuenta de Resend) para la Fase 11.

**Base de datos:**
- `supabase/migrations/0003_vigilancia_mercado.sql` — tablas
  `precios_mercado` y `alertas_mercado`, con RLS y sin políticas para `anon`.

**Código nuevo:**
- `src/lib/mercado/` — módulo puro: `proxies.ts`, `proveedor-precios.ts`
  (adaptador a Yahoo Finance, aislado para poder sustituirlo), `precios-cache.ts`,
  `rendimiento.ts`, `revaluar.ts` (el núcleo de R11, con tests).
- `src/lib/claude/herramienta-alerta.ts` y `prompt-alerta.ts` — redacción
  de la alerta, mismo patrón que `herramienta-plan.ts`/`prompt-plan.ts`.
- `src/lib/correo/` — cliente de Resend y plantilla de los dos correos.
- `src/app/api/cron/vigilancia-mercado/route.ts` — orquestador, protegido
  con `CRON_SECRET`.
- `vercel.json` — programación del Cron (diaria, 12:00 UTC).
- `.env.example` — `RESEND_API_KEY`, `RESEND_REMITENTE_ALERTAS`,
  `EMAIL_ASESORA_ALERTAS`, `CRON_SECRET`.
- Señal (🔔) en el listado del panel (`TablaListado.tsx`) para clientes con
  alguna alerta registrada.

**Tests:** `src/lib/mercado/rendimiento.test.ts` y `revaluar.test.ts` — 11
tests nuevos, deterministas, sin red (reutilizan `generarAnalisis` para
construir el `AnalisisResultado` de prueba). `pnpm test` sigue en verde:
151/151.

## Por qué

El usuario pidió que el sistema vigile el mercado por su cuenta y avise
cuando algo relevante se mueva para un cliente, para que nadie tenga que
mirarlo a mano. Antes de escribir código se hizo explícito que esto
contradecía el PRD vigente y se cerraron con el usuario cinco decisiones de
producto: reabrir el alcance como alerta educativa (no gestión), el
criterio de disparo (cambio de banda de probabilidad), el canal (panel +
correo a Marta y al cliente), la cadencia (diaria, por la mañana) y los
proveedores (Resend para correo; Yahoo Finance para mercado, con su riesgo
de no ser una API oficial aceptado explícitamente por el usuario tras
señalárselo).
