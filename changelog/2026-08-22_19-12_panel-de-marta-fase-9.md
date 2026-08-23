# El panel de Marta — Fase 9

**Fecha:** 2026-08-22 19:12
**Tipo:** Feature

## Qué se hizo

El lado del asesor: Marta entra con su usuario, ve el listado de leads
ordenado por urgencia, y abre la ficha de cada cliente con sus tres vistas
(`docs/user-flows.md` § Flujo 2).

- **Migración `supabase/migrations/0002_panel_vista_listado.sql`** — vista
  `panel_listado`, con `security_invoker = true` para que siga respetando
  las políticas RLS de `es_asesor()` en vez de saltárselas. Resuelve en SQL
  el "último por grupo" (última ficha de cada entrevista, último análisis de
  esa ficha) para que el listado no tenga que hacerlo a mano en TypeScript.
- **Auth de Marta** — correo + contraseña (decisión del usuario: más simple
  de dar de alta y probar en clase que un enlace mágico). No hay pantalla de
  alta propia: su usuario se crea a mano en Supabase (Authentication →
  Users) y se enlaza a `asesores` por SQL — el mismo patrón que cualquier
  otra migración de `CLAUDE.md`. Ver instrucciones en el chat de esta sesión.
- `src/lib/supabase/cliente-navegador.ts` y `cliente-sesion.ts` (nuevos) —
  clientes de Supabase con `@supabase/ssr`: uno de navegador para el login,
  uno de servidor que lee la cookie de sesión y por tanto respeta RLS (a
  diferencia de `cliente-servidor.ts`, que usa la service role key y la
  salta por completo).
- `src/middleware.ts` (nuevo) — protege `/panel/**`: sin sesión, redirige a
  `/panel/login`; con sesión, no deja volver al login. No sabe por sí mismo
  si esa sesión es de un asesor real (eso lo decide RLS al leer datos).
- `src/app/panel/login/` — pantalla de login.
- `src/app/panel/(app)/page.tsx` — listado, leyendo `panel_listado`.
  Ordenado por defecto de más urgente (banda Baja o sin análisis todavía) a
  menos, con un clic en la cabecera para invertirlo
  (`src/components/panel/TablaListado.tsx`).
- `src/app/panel/(app)/cliente/[entrevistaId]/` — la ficha del cliente, tres
  rutas para las tres vistas:
  - `page.tsx` — **Diagnóstico** (por defecto): las cuatro visualizaciones de
    `docs/design-system.md` (`src/components/panel/GraficoProbabilidad.tsx`,
    `GraficoCartera.tsx`, `GraficoProyeccion.tsx`, `ChecklistR1.tsx`, todas
    con Recharts, ya en el stack declarado mas nunca instalado hasta ahora),
    más situación actual, proyección determinista, pendientes y supuestos.
  - `cruda/page.tsx` — **Ficha cruda**: reutiliza `CAMPOS_EDITABLES` (Fase
    6), así que usa exactamente las mismas etiquetas en español que ya ve el
    cliente al confirmar. Muestra la cita literal y el supuesto aplicado de
    cada dato.
  - `plan/page.tsx` — **Plan**: reutiliza el propio componente
    `PlanCliente` (Fase 8) — "lo que se le entregó al cliente, tal cual lo
    vio" es literal, no una redacción aparte para Marta. Nunca genera un
    plan nuevo: si el cliente no lo ha abierto todavía, lo dice.
- `src/components/panel/NavFicha.tsx` — pestañas de las tres vistas.

## Decisión sin especificar en la documentación

**La interpolación de la proyección.** El motor (Fase 7,
`monteCarlo()` en `src/lib/motor/calculos.ts`, intocable) devuelve los
percentiles p10/p50/p90 **solo del año final**, no una trayectoria completa
— y no le corresponde a esta fase pedírsela, sería tocar R10. El área del
gráfico de proyección interpola geométricamente entre el patrimonio de hoy
y cada percentil final; se rotula explícitamente como interpolación visual
en la propia pantalla, para no hacerla pasar por una simulación real.

**El checklist de R1.** La entrevista nunca pregunta si las cuotas de deuda
están al día, así que el primer paso se da por cumplido salvo señal en
contra (no hay ninguna). El quinto paso ("aumentar la inversión") se marca
cumplido si la aportación propuesta deja margen (> 0). Es una lectura propia
de esta fase sobre los datos que ya calcula Fase 7, no un cálculo nuevo del
motor.

**Orden por defecto del listado.** `docs/user-flows.md` pide que sea
"ordenable por banda" sin fijar el orden inicial. Se eligió mostrar primero
lo más urgente: banda Baja, y también las entrevistas sin análisis
todavía (menos información no es menos motivo de atención). Un clic en la
cabecera invierte el orden.

**Granularidad del listado.** La documentación habla de "una fila por
cliente", pero los datos (ficha, análisis) cuelgan de la entrevista, no
directamente del cliente, y un cliente puede tener varias entrevistas. Se
implementó una fila por entrevista con cliente — en la práctica, uno a uno
en esta fase, porque todavía no hay flujo para que un mismo cliente repita
entrevista.

## Qué se modificó

Nuevo: `supabase/migrations/0002_panel_vista_listado.sql`,
`src/middleware.ts`, `src/lib/supabase/cliente-navegador.ts`,
`src/lib/supabase/cliente-sesion.ts`, `src/lib/panel/formato.ts`,
`src/lib/panel/tipos.ts`, `src/lib/panel/consultas.ts`,
`src/components/FormularioLogin.tsx`,
`src/components/panel/BotonCerrarSesion.tsx`,
`src/components/panel/TablaListado.tsx`, `src/components/panel/NavFicha.tsx`,
`src/components/panel/GraficoProbabilidad.tsx`,
`src/components/panel/GraficoCartera.tsx`,
`src/components/panel/GraficoProyeccion.tsx`,
`src/components/panel/ChecklistR1.tsx`, `src/app/panel/login/page.tsx`,
`src/app/panel/(app)/layout.tsx`, `src/app/panel/(app)/page.tsx`,
`src/app/panel/(app)/cliente/[entrevistaId]/page.tsx`,
`src/app/panel/(app)/cliente/[entrevistaId]/cruda/page.tsx`,
`src/app/panel/(app)/cliente/[entrevistaId]/plan/page.tsx`.
Dependencias nuevas: `@supabase/ssr`, `recharts`.
Modificado: `docs/data-model.md`, `docs/roadmap.md`.

## Por qué

Es el otro lado del producto: hasta ahora todo el trabajo daba servicio al
visitante que hace la entrevista. Marta es quien convierte esos leads
diagnosticados en clientes reales — necesita ver en segundos a quién
llamar primero, y de dónde sale cada número si algo le hace dudar.

## Verificación

`pnpm test` (140 tests, sin cambios — Fase 9 no toca ningún cálculo),
`pnpm lint` y `tsc --noEmit` se verificaron limpios en el entorno de
construcción. `pnpm build` no se pudo ejecutar completo en este entorno por
una restricción de red ajena al código (no llega a Google Fonts) — se
verificará en la máquina del usuario, como el resto del build.

Falta que el usuario aplique la migración, cree su usuario de asesora, y
confirme en su máquina el criterio de la fase: entrar al panel, ver el
listado ordenado por banda, y en menos de 30 segundos identificar qué
cliente tiene la meta en riesgo.
