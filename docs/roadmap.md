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
| Aplicación | 🟡 Fase 4 (la entrevista que habla) completada — siguiente: Fase 5 |

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

## Fase 5 · La entrevista que escucha

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

---

## Fase 6 · Confirmación y cierre

- Pantalla de resumen editable en lenguaje llano.
- Correcciones → `confirmado`.
- Cierre y versionado de la ficha.
- Descargo de orientación educativa visible, no escondido.

**Hecho cuando:** se llega al final, se corrige un dato, y en la base de datos
aparece cambiado y como `confirmado`.

---

## Fase 7 · Diagnóstico

Conectar el motor, que ya está hecho.

- Clasificar la meta: patrimonio / renta de cartera / renta de negocio / mixta
  (§3 de `instrucciones-motor.md`). **Las de negocio no se convierten.**
- Determinar el modo del informe.
- Ejecutar el motor y guardar en `analisis` con versión de motor y reglas.

**Hecho cuando:** una ficha completa produce un análisis con probabilidad y
banda, y una ficha con negativa sobre deudas queda en modo suspendido sin
recomendación.

---

## Fase 8 · El plan en cristiano

- Redacción por el modelo de las 8 secciones fijas, **a partir del JSON del
  motor**. Ni un número generado por el modelo.
- Guardar en `planes` con su descargo.
- Página del plan para el cliente.

**Hecho cuando:** el plan se lee sin saber finanzas, y toda cifra que aparece
está también en `analisis`.

---

## Fase 9 · El panel de Marta

- Auth y tabla `asesores`.
- Listado ordenable por banda de probabilidad.
- Ficha de cliente con las tres vistas y las cuatro visualizaciones.

**Hecho cuando:** Marta identifica en menos de 30 segundos qué cliente tiene la
meta en riesgo.

---

## Fase 10 · Publicación

Despliegue en Vercel, variables de entorno en el servidor, `/security-review`,
y repaso de que no queda ninguna clave de servicio con prefijo público.

---

## Fuera del roadmap

Están en `mejoras/backlog.md`: envío de correos, exportar el plan a PDF,
recálculo masivo al cambiar reglas, multi-asesor con permisos.
