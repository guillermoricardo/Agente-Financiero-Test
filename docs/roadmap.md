# Roadmap

> Fases de construcción, en orden. Cada una termina con un criterio de
> aceptación verificable **sin leer código**: se comprueba usando la
> aplicación o mirando la base de datos.
>
> **No se empieza una fase sin haber pasado el criterio de la anterior.**

---

## Estado actual

| Pieza | Estado |
|---|---|
| Criterio financiero (R1–R10) | ✅ Heredado de las sesiones anteriores |
| Motor de cálculo (TypeScript) | ✅ Portado y verificado · 95 tests |
| Motor original (Python) | ✅ Conservado como oráculo |
| Esquema de base de datos | ✅ Escrito, sin aplicar |
| Documentación del proyecto | ✅ Completa |
| Aplicación | ✅ Publicada — roadmap completo (Fases 1–10) |

---

## Fase 1 · Esqueleto ✅

Montar el proyecto alrededor del motor que ya existe.

- Andamiaje de Next.js 16 + TypeScript + Tailwind, con pnpm.
- Vitest configurado.
- Variables de entorno a partir de `.env.example`.

⚠️ Lee «Trampas conocidas del stack» en `docs/architecture.md` **antes** de
empezar: `create-next-app` no funciona en esta carpeta tal cual, y pnpm 11
falla el install por los scripts de build.

**Hecho cuando:** `pnpm dev` abre la aplicación y `pnpm test` da **95 tests en
verde**.

**Completada y confirmada el 2026-08-20** — ver
`changelog/2026-08-20_16-05_andamiaje-nextjs-fase-1.md` y
`changelog/2026-08-20_17-25_confirmacion-fase-1-en-maquina-del-usuario.md`.
`pnpm test` da los 95 tests en verde, `pnpm build` compila sin errores y
`pnpm dev` abre la aplicación en `http://localhost:3000`, verificado en la
máquina del usuario.

---

## Fase 2 · Base de datos ✅

- Proyecto de Supabase en **región Americas**.
- Aplicar `supabase/migrations/0001_esquema_inicial.sql`.
- Clientes de Supabase: uno público y uno de servidor.

**Cómo aplicar el esquema — a mano, no por MCP.** El agente debe:

1. **Escribir el SQL completo en el chat**, en un bloque ` ```sql `, listo para
   copiar. No vale remitir al archivo: el usuario no tiene por qué andar
   abriéndolo y buscando dónde empieza y acaba.
2. Indicar que se pega en supabase.com → **SQL Editor** y se ejecuta.
3. Decir qué debería verse después: las tablas `asesores`, `clientes`,
   `entrevistas`, `limites_uso`, `mensajes`, `fichas`, `analisis` y `planes`,
   todas con RLS activado.

Lo mismo vale para cualquier migración posterior. Ver «Cambios en la base de
datos» en `CLAUDE.md`.

**No** propongas configurar el MCP de Supabase para esto, aunque lo tengas
disponible. Es más frágil que copiar y pegar: los comandos de instalación
cambian según el sistema operativo de cada alumno, y para ejecutar una
migración una sola vez no compensa el riesgo de que alguien se quede atascado
en la terminal. El MCP sigue siendo bienvenido más adelante, para tareas que sí
lo justifiquen (inspeccionar logs, generar tipos TypeScript) — decisión del
usuario, según el protocolo de MCPs de `CLAUDE.md`.

**Hecho cuando:** las tablas se ven en Supabase, con RLS activado en todas, y
la aplicación conecta sin errores.

**Completada el 2026-08-20** — ver `changelog/2026-08-20_19-19_clientes-supabase.md`.
Proyecto de Supabase creado en región Americas (`us-east-2`); las 8 tablas
aplicadas con RLS activado en todas (verificado por consulta directa);
`src/lib/supabase/cliente-publico.ts` y `cliente-servidor.ts` creados; y
`GET /api/verificar-supabase` confirmó `"conectado": true` contra el proyecto
real del usuario.

---

## Fase 3 · Landing y entrada al diagnóstico ✅

La puerta del producto. **Cualquiera entra por aquí: no hay enlaces que
repartir ni altas que hacer.**

- Landing pública sencilla: qué es, para quién, y un botón para empezar.
- Pantalla de consentimiento con las **dos finalidades** declaradas: procesar
  sus datos para el diagnóstico, y que un asesor pueda contactarle. Aceptar es
  una acción explícita, no una frase escrita en el chat.
- Al aceptar se crea la **entrevista** con su token y se navega a
  `/entrevista/[token]`. Todavía sin cliente: `cliente_id` es `NULL`.
- Límite de entrevistas nuevas por IP y hora, guardando un **hash** de la IP.

**Hecho cuando:** desde la landing se llega a una entrevista con su URL propia,
la fila aparece en `entrevistas` con su fecha de consentimiento, y al recargar
esa URL se sigue en la misma entrevista.

**Y una comprobación que importa:** sin aceptar el consentimiento no se puede
llegar al chat de ninguna forma.

**Completada el 2026-08-21** — ver
`changelog/2026-08-20_19-40_landing-y-consentimiento-fase-3.md`. Verificado en
la máquina del usuario: la landing en español se ve en `localhost:3000`, el
consentimiento exige marcar la casilla, aceptar crea la entrevista y navega a
`/entrevista/<token>` con la fecha de consentimiento correcta, y un token
inventado (`/entrevista/esto-no-existe`) da 404 en vez de pantalla en blanco.

---

## Fase 4 · La entrevista que habla ✅

Chat funcional siguiendo `docs/criterio/plantilla-entrevista.md`, todavía sin
capturar los datos financieros.

- Ruta de servidor contra la API de Anthropic.
- **El asistente abre pidiendo nombre y correo**, conversando, antes de los 8
  bloques. Con esos dos datos se crea el **cliente** y se enlaza a la
  entrevista. Si el correo ya existe, se enlaza al cliente existente en vez de
  duplicarlo.
- Prompt de sistema con la plantilla: 8 bloques, una pregunta por mensaje, un
  rebote por variable, tono sin juicios.
- Cada mensaje se guarda en `mensajes`. Tope de mensajes por entrevista.

**Hecho cuando:** se puede mantener la conversación entera, las preguntas van
en orden y de una en una, al recargar la página los mensajes siguen ahí, y en
`clientes` aparece una fila con el nombre y el correo que diste.

**Completada el 2026-08-21** — ver
`changelog/2026-08-21_02-53_chat-de-la-entrevista-fase-4.md`. Verificado en la
máquina del usuario, con su clave real de Anthropic: la apertura literal
aparece al abrir la entrevista, el asistente pide nombre y correo antes del
bloque 1 y no vuelve a pedirlos, la fila se creó en `clientes` y quedó
enlazada en `entrevistas.cliente_id`, la conversación completa avanzó en
orden por los 8 bloques hasta el resumen de cierre y la despedida literales,
y recargar la página mantuvo la conversación entera.

---

## Fase 5 · La entrevista que escucha ✅

**La fase decisiva del proyecto.** Aquí la conversación se vuelve datos.

- Herramienta `guardar_dato` con JSON Schema, las claves como enum.
- Reglas de etiquetado en el prompt.
- Estado de la ficha en el contexto de cada turno (captura al vuelo, un rebote
  por variable).
- Barra de progreso de los 8 bloques.

**Hecho cuando:** al conversar, los datos aparecen en la tabla `fichas` con la
etiqueta correcta. Se verifica con `material-clase/GUION-CLIENTE-PRUEBA.md`,
incluidas sus tres variantes.

El criterio real de esta fase: **la variante 1 del guion tiene que salir como
`estimado`.** Si sale `confirmado`, la fase no está terminada por mucho que el
chat funcione.

**Completada el 2026-08-21** — ver
`changelog/2026-08-21_03-52_captura-estructurada-fase-5.md`. Verificado en la
máquina del usuario con las cuatro pruebas de
`material-clase/GUION-CLIENTE-PRUEBA.md`: el Guion A completo dio las 14
variables en `confirmado` con el pendiente correcto sobre el saldo de la
hipoteca; la Variante 1 dio `gasto_total_mes` en `estimado` (el criterio real
de la fase); la Variante 2 no volvió a preguntar la hipoteca mencionada fuera
de orden; y la Variante 3 dejó `deudas` en `pendiente` tras la negativa del
cliente, sin insistir más de una vez.

---

## Fase 6 · Confirmación y cierre ✅

- Pantalla de resumen editable en lenguaje llano.
- Correcciones → `confirmado`.
- Cierre y versionado de la ficha.
- Descargo de orientación educativa visible, no escondido.

**Hecho cuando:** se llega al final, se corrige un dato, y en la base de datos
aparece cambiado y como `confirmado`.

**Completada el 2026-08-22** — ver
`changelog/2026-08-22_03-37_confirmacion-y-cierre-fase-6.md`. Verificado en
la máquina del usuario: al llegar a la despedida aparece el botón "Revisar y
confirmar mi resumen", el formulario se abre con los datos ya rellenos y el
descargo de orientación educativa visible (no escondido), al confirmar la
ficha se actualiza en el sitio (sigue en `version = 1`, nada se sobrescribió
porque nada estaba cerrado antes), `entrevistas.estado` pasó a
`"completada"`, y el campo corregido (`colchonMeses`) quedó en `datos` con
`"etiqueta": "confirmado"`.

---

## Fase 7 · Diagnóstico ✅

Conectar el motor, que ya está hecho.

- Clasificar la meta: patrimonio / renta de cartera / renta de negocio / mixta
  (§3 de `instrucciones-motor.md`). **Las de negocio no se convierten.**
- Determinar el modo del informe.
- Ejecutar el motor y guardar en `analisis` con versión de motor y reglas.

**Hecho cuando:** una ficha completa produce un análisis con probabilidad y
banda, y una ficha con negativa sobre deudas queda en modo suspendido sin
recomendación.

**Completada el 2026-08-22** — ver
`changelog/2026-08-22_17-35_diagnostico-fase-7.md`. Verificado en la máquina
del usuario, disparando el cálculo automáticamente al confirmar la ficha
(Fase 6): una entrevista completa produjo en `analisis` un registro
`modo: "completo"` con `monteCarlo` en `p10 ≤ p50 ≤ p90` y `banda` con
valor (`"Baja"` en la prueba); y una entrevista con negativa sobre deudas
produjo `modo: "suspendido"` con `cartera`, `proyeccion` y `monteCarlo` en
`null` — sin ninguna recomendación calculada.

---

## Fase 8 · El plan en cristiano ✅

- Redacción por el modelo de las 8 secciones fijas, **a partir del JSON del
  motor**. Ni un número generado por el modelo.
- Guardar en `planes` con su descargo.
- Página del plan para el cliente.

**Hecho cuando:** el plan se lee sin saber finanzas, y toda cifra que aparece
está también en `analisis`.

**Completada el 2026-08-22** — ver
`changelog/2026-08-22_18-31_plan-en-cristiano-fase-8.md`. Verificado en la
máquina del usuario con una entrevista completa nueva ("Mauricio"): la
pantalla `/entrevista/[token]/plan` mostró las 8 secciones en lenguaje llano,
el botón "Descargar" bajó el `.md` completo, y cada cifra citada en el plan
se cruzó una a una contra la fila de `analisis` correspondiente y coincidió
exactamente — `vfActualEurosHoy` (~4.261.696 €), `gapEuros` (0),
`objetivoReal` (500.000 €), y el Monte Carlo completo
(`p10` 853.242,63 / `p50` 1.154.237,01 / `p90` 1.560.774,55 /
`probCumplimiento` 0,9996 / `banda` "Alta").

---

## Fase 9 · El panel de Marta ✅

- Auth y tabla `asesores`.
- Listado ordenable por banda de probabilidad.
- Ficha de cliente con las tres vistas y las cuatro visualizaciones.

**Hecho cuando:** Marta identifica en menos de 30 segundos qué cliente tiene la
meta en riesgo.

**Completada el 2026-08-23** — ver
`changelog/2026-08-22_19-12_panel-de-marta-fase-9.md`. Verificado en la
máquina del usuario: login con correo y contraseña, listado con nombre,
correo, meta, plazo, banda y estado, ordenado por defecto de más urgente
(sin completar o sin banda) a menos, con la fila de banda "Baja" destacada
en rojo entre las demás — identificable al instante. La ficha de un cliente
completo mostró las tres vistas: Diagnóstico con las cuatro visualizaciones
(probabilidad 100 %/"Alta", composición de cartera, proyección p10/p50/p90,
checklist de R1), Ficha cruda con cada dato, su etiqueta y su cita literal,
y Plan idéntico al que vio el cliente, cifra por cifra.

---

## Fase 10 · Publicación ✅

Despliegue en Vercel, variables de entorno en el servidor, `/security-review`,
y repaso de que no queda ninguna clave de servicio con prefijo público.

**Completada el 2026-08-23** — ver
`changelog/2026-08-23_17-59_publicacion-fase-10.md`. Proyecto en Vercel
(`agente-financiero-test`) conectado al repositorio de GitHub, con deploy
automático en cada push a `main`. Las cinco variables de entorno
configuradas, con `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
marcadas como sensibles (Vercel las oculta tras guardarlas). Repaso de
seguridad: sin vulnerabilidades en dependencias (`pnpm audit`), sin claves
hardcodeadas, sin prefijo `NEXT_PUBLIC_` mal puesto, RLS activo en las 8
tablas sin políticas para `anon`. Se encontró y se borró una ruta de
diagnóstico de la Fase 2 (`/api/verificar-supabase`) que había quedado
pública y sin autenticación — no exponía datos sensibles, pero no tenía
motivo para seguir en producción. Verificado en la URL real por el
usuario: landing, entrevista completa, confirmación, plan del cliente con
descarga, y login + listado del panel de Marta, todo funcionando contra
las variables de entorno y la base de datos reales.

**Con esto el roadmap de la versión inicial (Fases 1 a 10) quedó terminado.**

---

## Fase 11 · Vigilancia de mercado y alerta de cambio de banda

> Añadida el 2026-08-23. Amplía el alcance original del PRD (que excluía
> "seguimiento continuo de carteras") con un límite explícito: se automatiza
> el **aviso**, nunca la **gestión**. Ver `docs/prd.md` § F7 y
> `docs/criterio/reglas-recomendacion.md` § R11.

- Migración `0003`: tablas `alertas_mercado` (Fase 11) y el snapshot de
  mercado que la respalda.
- `src/lib/mercado/`: módulo puro que revaloriza la cartera calculada con el
  rendimiento real por clase de activo (proxies vía Yahoo Finance, endpoint
  no oficial — riesgo aceptado, ver "Trampas conocidas del stack" en
  `architecture.md`) y vuelve a derivar la banda con el motor existente, sin
  tocarlo.
- Ruta `/api/cron/vigilancia-mercado`, disparada a diario por Vercel Cron,
  protegida con `CRON_SECRET`.
- Redacción del aviso por el modelo a partir del JSON del módulo de mercado
  — nunca calcula, solo traduce, mismo patrón que el plan (Fase 8).
- Envío por correo (Resend) a Marta y al cliente, y señal nueva en el panel
  de Marta.

**Hecho cuando:** con un cliente de prueba en modo `completo`, forzar un
rendimiento de mercado que cruce de banda produce una fila en
`alertas_mercado`, un correo a Marta, un correo al cliente, y una señal
visible en el panel — y con un rendimiento que no cruza de banda, no se
genera nada.

---

## Fuera del roadmap

Están en `mejoras/backlog.md`: exportar el plan a PDF, recálculo masivo al
cambiar reglas, multi-asesor con permisos. El envío de correos (antes
MEJORA-02) se construye ya como parte de la Fase 11.
