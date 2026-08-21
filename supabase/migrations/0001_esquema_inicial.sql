-- ============================================================================
-- 0001 · Esquema inicial del asesor financiero
--
-- Sustituye al contrato de ficheros markdown de la versión de escritorio:
-- aquí viven la entrevista, la ficha, el análisis del motor y el plan.
-- Los .md siguen generándose, pero como VISTA descargable, no como fuente.
--
-- Modelo de acceso (importante):
--   · Marta y cualquier otro asesor entran con Supabase Auth y leen vía RLS.
--   · El CLIENTE nunca habla con Supabase directamente. Su entrevista pasa por
--     rutas de servidor de Next.js que usan la service role key y validan el
--     token de la entrevista. Por eso NO hay políticas para `anon`: si algún
--     día se filtra la clave pública, la base de datos no expone nada.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Tipos ───────────────────────────────────────────────────────────────────

-- R9 · La calidad del dato viaja con el dato. Decide el modo del informe.
create type etiqueta_dato as enum ('confirmado', 'estimado', 'pendiente');

create type perfil_riesgo as enum ('conservador', 'moderado', 'dinamico');

-- §3 de instrucciones-motor · las metas de negocio NO se convierten a cartera.
create type tipo_meta as enum ('patrimonio', 'renta_cartera', 'renta_negocio', 'mixta');

-- §4 · 'suspendido' es el caso de la negativa a hablar de deudas (R9).
create type modo_informe as enum ('completo', 'condicionado', 'suspendido');

create type estado_entrevista as enum ('en_curso', 'pendiente_confirmacion', 'completada', 'abandonada');

create type rol_mensaje as enum ('agente', 'cliente');

-- ── Asesores ────────────────────────────────────────────────────────────────

create table asesores (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  creado_en   timestamptz not null default now()
);

comment on table asesores is
  'Usuarios que pueden ver el dashboard. Estar en esta tabla ES el permiso.';

-- ── Clientes ────────────────────────────────────────────────────────────────

-- El cliente se crea cuando da su nombre y su correo dentro del chat, no antes.
-- Es el momento en que un visitante anónimo se convierte en lead.
create table clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  -- Único: si alguien vuelve a hacer una entrevista con el mismo correo, se
  -- enlaza al mismo cliente en vez de duplicar el lead. Normalizar a
  -- minúsculas en la aplicación antes de insertar.
  email       text not null unique,
  creado_en   timestamptz not null default now()
);

-- ── Entrevistas ─────────────────────────────────────────────────────────────

create table entrevistas (
  id            uuid primary key default gen_random_uuid(),

  -- NULL hasta que el visitante da su nombre y su correo. Una entrevista
  -- abandonada antes de eso no deja ningún dato personal: es exactamente lo
  -- que pide el principio de minimización de la LFPDPPP.
  cliente_id    uuid references clientes (id) on delete cascade,

  estado        estado_entrevista not null default 'en_curso',

  -- Secreto que el cliente lleva en su URL. Es lo único que autoriza a
  -- escribir en esta entrevista desde las rutas de servidor. Lo genera el
  -- sistema al aceptar el consentimiento; nadie tiene que repartirlo a mano.
  token         uuid not null unique default gen_random_uuid(),

  -- LFPDPPP: la entrevista NO existe sin consentimiento previo. Por eso la
  -- fila se crea en el momento de aceptar y la columna no admite nulos.
  consentimiento_en timestamptz not null default now(),

  expira_en     timestamptz not null default (now() + interval '30 days'),
  iniciada_en   timestamptz not null default now(),
  completada_en timestamptz
);

create index on entrevistas (cliente_id);

-- ── Control de abuso ────────────────────────────────────────────────────────
-- La entrevista es pública: cualquiera puede abrirla desde la landing, y cada
-- mensaje cuesta dinero en la API del modelo. Sin límite, recargar la página
-- en bucle vacía el saldo.
--
-- Se guarda un HASH de la IP, nunca la IP: sigue sirviendo para contar y deja
-- de ser un dato personal identificable.
create table limites_uso (
  id            bigint generated always as identity primary key,
  ip_hash       text not null,
  accion        text not null,        -- 'crear_entrevista' | 'enviar_mensaje'
  creado_en     timestamptz not null default now()
);

create index on limites_uso (ip_hash, accion, creado_en desc);

-- ── Mensajes ────────────────────────────────────────────────────────────────

create table mensajes (
  id            bigint generated always as identity primary key,
  entrevista_id uuid not null references entrevistas (id) on delete cascade,
  rol           rol_mensaje not null,
  contenido     text not null,
  creado_en     timestamptz not null default now()
);

-- El chat se relee entero en cada turno para reconstruir el contexto.
create index on mensajes (entrevista_id, id);

-- ── Fichas ──────────────────────────────────────────────────────────────────

create table fichas (
  id            uuid primary key default gen_random_uuid(),

  -- Obligatorio, a diferencia de `entrevistas.cliente_id`. Es un invariante
  -- deliberado: no puede haber datos financieros de alguien de quien no
  -- sabemos ni el nombre. Si esta restricción salta, el orden del flujo está
  -- mal: el nombre y el correo se piden ANTES de los 8 bloques.
  cliente_id    uuid not null references clientes (id) on delete cascade,

  entrevista_id uuid not null references entrevistas (id) on delete cascade,
  -- Nunca se sobrescribe una ficha: se versiona, igual que hacía el motor de
  -- escritorio con `ficha-[nombre]-AAAA-MM-DD.md`.
  version       int not null default 1,

  -- El objeto completo, con la forma del tipo `Ficha` de src/lib/motor/ficha.ts.
  -- Cada valor lleva {valor, etiqueta, cita}.
  datos         jsonb not null,

  -- Denormalizado desde `datos` solo para que el listado del dashboard no
  -- tenga que abrir el jsonb de cada cliente.
  objetivo_descripcion text,
  objetivo_cifra       numeric,
  objetivo_plazo       numeric,
  perfil               perfil_riesgo,
  tipo_de_meta         tipo_meta,

  pendientes    text[] not null default '{}',
  creada_en     timestamptz not null default now(),

  unique (entrevista_id, version)
);

create index on fichas (cliente_id, creada_en desc);

-- ── Análisis (salida del motor) ─────────────────────────────────────────────

create table analisis (
  id          uuid primary key default gen_random_uuid(),
  ficha_id    uuid not null references fichas (id) on delete cascade,
  modo        modo_informe not null,

  -- Todos los números del informe: flujo libre, cartera objetivo, VF,
  -- percentiles del Monte Carlo, probabilidad y banda.
  resultado   jsonb not null,

  -- Trazabilidad: con qué versión del motor y de las reglas se calculó. Sin
  -- esto, un informe de hace seis meses es imposible de reproducir.
  version_motor  text not null,
  version_reglas text not null,

  calculado_en timestamptz not null default now()
);

create index on analisis (ficha_id, calculado_en desc);

-- ── Planes (lo que ve el cliente) ───────────────────────────────────────────

create table planes (
  id          uuid primary key default gen_random_uuid(),
  analisis_id uuid not null references analisis (id) on delete cascade,

  -- Las 8 secciones de la fase 4, ya en lenguaje llano.
  secciones   jsonb not null,
  markdown    text not null,

  -- El descargo de la sección 8 aparece en TODO plan, sin excepción. Se
  -- guarda con el plan (y no solo en la plantilla) para que quede constancia
  -- de qué texto exacto se le mostró al cliente y cuándo.
  descargo    text not null,

  generado_en timestamptz not null default now()
);

create index on planes (analisis_id, generado_en desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Se activa en todas las tablas. Sin políticas para `anon`: el acceso del
-- cliente pasa siempre por rutas de servidor con la service role key, que
-- ignora RLS por diseño y comprueba el token de la entrevista en el código.

alter table asesores    enable row level security;
alter table clientes    enable row level security;
alter table entrevistas enable row level security;
alter table mensajes    enable row level security;
alter table fichas      enable row level security;
alter table analisis    enable row level security;
alter table planes      enable row level security;
alter table limites_uso enable row level security;

create or replace function es_asesor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from asesores where id = auth.uid());
$$;

create policy "asesor ve su propia fila" on asesores
  for select to authenticated using (id = auth.uid());

create policy "asesores leen clientes" on clientes
  for select to authenticated using (es_asesor());

create policy "asesores leen entrevistas" on entrevistas
  for select to authenticated using (es_asesor());

create policy "asesores leen mensajes" on mensajes
  for select to authenticated using (es_asesor());

create policy "asesores leen fichas" on fichas
  for select to authenticated using (es_asesor());

create policy "asesores leen analisis" on analisis
  for select to authenticated using (es_asesor());

create policy "asesores leen planes" on planes
  for select to authenticated using (es_asesor());

-- Escrituras: ninguna política. Todo pasa por el servidor, que es quien
-- garantiza que una ficha no se modifica a mano después de calcular el plan.
