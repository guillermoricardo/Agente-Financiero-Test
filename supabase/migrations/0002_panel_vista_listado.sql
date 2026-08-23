-- ============================================================================
-- 0002 · Vista del listado del panel (Fase 9)
--
-- El listado necesita, por entrevista: el cliente, la ficha más reciente y
-- el análisis más reciente de esa ficha — tres "últimos por grupo" que en
-- SQL puro son tres LATERAL JOIN. Se resuelve una vez aquí, como vista, en
-- vez de repetir la lógica en cada consulta del panel.
--
-- `security_invoker = true` es la parte importante: sin ella, una vista
-- correría con los permisos de quien la creó (superusuario), saltándose RLS
-- por completo. Con ella, la vista respeta las mismas políticas que las
-- tablas que consulta — sigue siendo "asesores leen clientes/fichas/..."
-- quien decide qué se ve, no la vista.
-- ============================================================================

create view panel_listado
with (security_invoker = true) as
select
  c.id             as cliente_id,
  c.nombre         as cliente_nombre,
  c.email          as cliente_email,
  e.id             as entrevista_id,
  e.estado         as entrevista_estado,
  e.completada_en,
  f.id             as ficha_id,
  f.objetivo_descripcion,
  f.objetivo_cifra,
  f.objetivo_plazo,
  f.perfil,
  f.tipo_de_meta,
  f.pendientes,
  a.id             as analisis_id,
  a.modo           as analisis_modo,
  a.calculado_en,
  (a.resultado -> 'monteCarlo' ->> 'probCumplimiento')::numeric as probabilidad_cumplimiento,
  a.resultado -> 'monteCarlo' ->> 'banda' as banda
from entrevistas e
join clientes c on c.id = e.cliente_id
left join lateral (
  select *
  from fichas f2
  where f2.entrevista_id = e.id
  order by f2.version desc
  limit 1
) f on true
left join lateral (
  select *
  from analisis a2
  where a2.ficha_id = f.id
  order by a2.calculado_en desc
  limit 1
) a on true
where e.cliente_id is not null;

comment on view panel_listado is
  'Una fila por entrevista con cliente, con su ficha y análisis más recientes ya resueltos. Fuente del listado del panel (Fase 9).';
