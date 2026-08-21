# La entrada al diagnóstico pasa a ser pública

**Fecha:** 2026-08-11 14:30
**Tipo:** Documentación

## Qué se hizo

Se rediseñó cómo entra un cliente al sistema. Antes: la asesora daba de alta al
cliente, el sistema generaba un enlace con token y ella se lo hacía llegar.
Ahora: **landing pública → consentimiento → chat que pide nombre y correo →
entrevista.**

Cambios concretos:

- **Nueva Fase 3** en el roadmap («Landing y entrada al diagnóstico»). Las
  fases posteriores se renumeran: el proyecto pasa de 9 a 10 fases.
- **Orden de creación invertido en la base de datos.** La entrevista nace al
  aceptar el consentimiento, todavía sin cliente (`cliente_id` nullable). El
  cliente se crea cuando da nombre y correo dentro del chat.
- **El consentimiento se mueve** de `clientes` a `entrevistas`: ocurre antes de
  que exista el cliente.
- **`clientes.email` pasa a obligatorio y único.** Es el identificador del
  lead: quien repite entrevista se enlaza al mismo cliente.
- **Nueva tabla `limites_uso`** con hash de IP, para frenar el abuso.
- **`fichas.cliente_id` sigue siendo obligatorio**, y ahora es un invariante
  con significado: no puede haber datos financieros de alguien sin nombre.
- El texto de consentimiento debe declarar **dos finalidades**: procesar los
  datos para el diagnóstico, y permitir el contacto comercial.
- Lo descartado va a `mejoras/backlog.md` como MEJORA-01, no se pierde.

## Qué se modificó

- `docs/user-flows.md` — reescrito el Flujo 1; eliminado el Flujo 3
- `docs/prd.md` — nueva funcionalidad F0; requisito de resistencia al abuso
- `docs/data-model.md` — orden de creación, correo único, consentimiento
- `docs/architecture.md` — decisión 7 y sección de protección del flujo público
- `docs/business.md` — modelo de uso, finalidades del consentimiento, riesgos
- `docs/roadmap.md` — nueva Fase 3 y renumeración hasta la 10
- `supabase/migrations/0001_esquema_inicial.sql` — esquema actualizado
- `mejoras/backlog.md` — MEJORA-01, 02 y 03

## Por qué

Se detectó al construir la aplicación: el agente implementó el flujo tal y como
estaba documentado y el resultado era inusable. **Hasta que la asesora no
tuviera un cliente dado de alta, la aplicación no servía para nada.** Eso no es
un producto, es una herramienta interna.

El origen del error está en que la plantilla de entrevista heredada asume que
el agente es el asistente de una asesora que ya tiene al cliente delante. Al
pasar a web ese supuesto dejó de ser válido, y no se cuestionó al escribir la
documentación.

Con entrada pública el sistema capta por sí solo, y la asesora recibe leads ya
diagnosticados — que es más valioso que un panel vacío esperando a que ella
haga el trabajo de captación.

**La seguridad no se debilita:** el token sigue siendo la única credencial que
autoriza a leer o escribir en una entrevista. Solo cambia quién lo emite. Lo
que sí aparece es una superficie de abuso nueva —un chat público que llama a
una API de pago— y por eso entran los límites de uso.
