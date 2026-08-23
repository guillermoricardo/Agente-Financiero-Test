-- ============================================================================
-- 0003 · Vigilancia de mercado y alerta de cambio de banda (Fase 11)
--
-- R11 de docs/criterio/reglas-recomendacion.md: una vez al día se revalúa la
-- cartera calculada de cada cliente en modo `completo` con el rendimiento
-- real de mercado desde su último análisis, y si la banda de probabilidad
-- de cumplimiento (R10) cambia, se registra una alerta.
--
-- No toca ninguna tabla existente. `analisis` sigue siendo la salida del
-- motor sobre la ficha cerrada del cliente; esto es un hecho posterior,
-- calculado con datos de mercado que no existían en ese momento.
-- ============================================================================

-- ── Precios de mercado ──────────────────────────────────────────────────────
-- Caché/auditoría de los cierres diarios por clase de activo. Sin esto, cada
-- ejecución del job tendría que volver a pedir todo el histórico a la fuente
-- externa para calcular el rendimiento desde la fecha de cada análisis.
-- La liquidez no aparece: R5 la trata con rentabilidad plana, no de mercado.
create table precios_mercado (
  id            bigint generated always as identity primary key,
  clase_activo  text not null check (clase_activo in ('renta_variable', 'renta_fija', 'oro')),
  fecha         date not null,
  cierre        numeric not null,
  creado_en     timestamptz not null default now(),
  unique (clase_activo, fecha)
);

create index on precios_mercado (clase_activo, fecha desc);

comment on table precios_mercado is
  'Cierres diarios por clase de activo (proxies de mercado), para calcular el rendimiento real entre dos fechas sin repetir peticiones a la fuente externa.';

-- ── Alertas de mercado ──────────────────────────────────────────────────────

create table alertas_mercado (
  id                    uuid primary key default gen_random_uuid(),

  -- El análisis contra el que se compara. Si esa ficha se recalcula (nueva
  -- versión), sus alertas viejas quedan huérfanas de sentido y se limpian
  -- con la cascada, igual que pasa con `planes`.
  analisis_id           uuid not null references analisis (id) on delete cascade,

  -- Mismos valores que BandaProbabilidad en src/lib/motor/supuestos.ts.
  -- No se crea un enum nuevo: analisis.resultado tampoco decompone la banda
  -- en una columna tipada, vive dentro del jsonb.
  banda_anterior        text not null check (banda_anterior in ('Alta', 'Razonable', 'Frágil', 'Baja')),
  banda_nueva           text not null check (banda_nueva    in ('Alta', 'Razonable', 'Frágil', 'Baja')),
  probabilidad_anterior numeric not null,
  probabilidad_nueva    numeric not null,

  -- Rendimientos de mercado usados, patrimonio revalorizado y demás cifras
  -- del cálculo: trazabilidad completa, mismo principio que analisis.resultado.
  detalle               jsonb not null,

  -- El texto exacto que se envió a cada destinatario, no una plantilla que
  -- podría cambiar después.
  mensaje_marta         text not null,
  mensaje_cliente       text not null,

  -- NULL si el envío falló: la alerta queda registrada igual, el correo es
  -- un efecto secundario, no la fuente de verdad.
  enviado_marta_en      timestamptz,
  enviado_cliente_en    timestamptz,

  detectada_en          timestamptz not null default now()
);

create index on alertas_mercado (analisis_id, detectada_en desc);

comment on table alertas_mercado is
  'Un cambio de banda de probabilidad detectado por la vigilancia diaria de mercado (R11). No modifica analisis: es un hecho posterior con datos que no existían al calcularlo.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Mismo modelo que el resto: los asesores leen vía RLS: el job de vigilancia
-- escribe con la service role key desde el servidor, que la ignora por
-- diseño. Sin políticas para `anon` ni para escritura.

alter table precios_mercado enable row level security;
alter table alertas_mercado enable row level security;

create policy "asesores leen alertas de mercado" on alertas_mercado
  for select to authenticated using (es_asesor());

-- precios_mercado es un detalle interno de cálculo (proxies de mercado, sin
-- datos de ningún cliente): no hace falta que ningún asesor la lea desde la
-- aplicación, así que no lleva política de select. RLS sigue activado por
-- higiene y por si en el futuro alguien la expone.
