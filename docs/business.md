# Business

> Contexto de negocio, modelo de valor y restricciones regulatorias.

---

## Contexto

Este proyecto nace como **caso práctico de un curso de vibe coding**: el
objetivo docente es construir un sistema real, con reglas de negocio reales,
donde las decisiones de arquitectura tengan consecuencias visibles.

Eso no lo convierte en un juguete. El criterio financiero de `docs/criterio/`
está escrito como si fuera a usarse de verdad, y las restricciones legales que
aparecen más abajo son las que aplicarían a un producto en producción. Se
respetan como si lo fuera.

---

## Propuesta de valor

**Para el cliente final:** un diagnóstico financiero con sus números, en
lenguaje que entiende, sin coste de entrada y sin tener que rellenar un
formulario.

**Para la asesora:** el diagnóstico inicial deja de consumirle horas. Recibe a
cada cliente con la foto financiera ya tomada, los cálculos hechos y las
señales de alerta marcadas.

El sistema **no sustituye a la asesora**: automatiza su fase mecánica. Todo lo
que requiere criterio —elegir productos concretos, fiscalidad, acompañar una
decisión difícil— sigue siendo suyo, y el producto lo dice explícitamente en
cada plan que emite.

---

## Modelo de uso previsto

El asesor despliega su propia instancia y **la publica**. Cualquiera que llegue
a la web puede hacerse el diagnóstico: entra, acepta el consentimiento, deja su
nombre y su correo, conversa y recibe su plan. El asesor ve el lead en su panel,
ya diagnosticado y con la conversación completa.

Es decir, **el producto capta por sí solo**. El asesor no tiene que dar de alta
a nadie ni repartir enlaces: puede usar la aplicación desde el primer día,
antes de tener un solo cliente.

Eso convierte la herramienta en dos cosas a la vez: un servicio para el
visitante, y un canal de captación cualificada para el asesor — que recibe a
alguien que ya ha contado su situación financiera entera.

Monetización natural, aunque queda fuera del alcance actual: suscripción por
asesor, con límite de entrevistas por plan.

---

## Restricciones regulatorias · no negociables

Estas restricciones vienen del dominio, no de una preferencia técnica. Un
producto que las incumple no es «un producto mejorable»: es un producto que no
se puede publicar.

### No es asesoramiento financiero regulado

<!-- ⚠️ PENDIENTE DE REVISAR: este párrafo sigue anclado a España (CNMV). Al
     mover el producto a clientes de Latinoamérica/EE.UU. probablemente haga
     falta referenciar el regulador que corresponda en tu jurisdicción (p.ej.
     la CNBV en México). No se ha tocado porque no se pidió explícitamente;
     dilo cuando quieras que se actualice. -->

En España, el asesoramiento en materia de inversión es una actividad reservada
que requiere autorización de la CNMV. Este producto **no la tiene** y por tanto
ofrece orientación educativa.

Consecuencias prácticas, y todas son obligatorias:

- El descargo aparece **en todo plan emitido**, sin excepción, y también en la
  interfaz antes de empezar.
- **Nunca se nombran productos concretos.** «Un fondo indexado mundial» como
  categoría, sí. Una gestora, un fondo o un ticker, jamás.
- **Nunca se promete una rentabilidad.** Siempre horquillas y probabilidades,
  con los supuestos declarados.

### Protección de datos (LFPDPPP)

El sistema trata datos financieros de personas identificables: ingresos,
deudas, patrimonio.

- **Consentimiento explícito** antes de recoger ningún dato. Sin él, la
  entrevista no arranca — literalmente: la fila de la entrevista se crea en el
  momento de aceptar.
- **Declarar las dos finalidades.** El correo no solo sirve para entregarle su
  plan: también permite que un asesor le contacte comercialmente. Son
  finalidades distintas y el texto de consentimiento tiene que decir ambas. Si
  solo se menciona la primera, el uso comercial no está amparado.
- **Región Americas** en el proveedor de base de datos (los clientes son de
  Latinoamérica/EE.UU., no de la UE).
- **Minimización**: no se pide ningún dato que el diagnóstico no necesite. Por
  eso la entrevista no desglosa gastos por categorías.
- El cliente puede **pedir la eliminación** de sus datos.

### La alerta de mercado (F7) no cambia el estatus regulatorio

Desde 2026-08-23 el sistema avisa periódicamente si el mercado movería la
banda de probabilidad de un cliente (R11). Esto **no** convierte al producto
en gestión de carteras ni en asesoramiento continuo regulado, siempre que se
respete el límite que lo separa: el sistema **informa**, nunca **decide ni
ejecuta** nada sobre el dinero de nadie.

- El aviso lleva el mismo descargo de orientación educativa que cualquier
  plan.
- Nunca sugiere una acción concreta («vende», «compra más») ni nombra un
  producto: solo dice que la probabilidad calculada cambió y remite a hablar
  con Marta.
- No hay ejecución automática de ningún tipo. Si algún día se plantea que el
  sistema actúe sobre la cartera sin intervención humana, eso sí cruzaría la
  línea hacia gestión regulada — y no está en el alcance de este proyecto.

### Prudencia como criterio, no como estilo

Las reglas obligan a que todo supuesto sobre un dato incierto vaya sesgado
**contra el optimismo**: gastos e inflación al alza, ingresos y rentabilidad a
la baja. Y prohíben subir el nivel de riesgo para hacer que una meta cuadre.

Es una decisión de negocio antes que técnica: un sistema que le dice a alguien
que llegará a su meta cuando probablemente no llegue hace daño real.

---

## Riesgos del proyecto

| Riesgo | Mitigación |
|---|---|
| El modelo de lenguaje inventa una cifra en un plan | Separación estricta: el motor calcula, el modelo redacta. Ningún número se genera en el prompt. |
| El modelo rellena un dato que el cliente no dio | Prohibición explícita en el prompt y etiqueta `pendiente` obligatoria. Verificable con el guion de prueba. |
| Un cambio en las reglas no llega al motor | Los supuestos viven en un único archivo (`src/lib/motor/supuestos.ts`) y hay tests que verifican cada valor. |
| Filtración de datos financieros | El cliente nunca habla con la base de datos; sin políticas de acceso anónimo. |
| Un plan se interpreta como asesoramiento regulado | Descargo obligatorio, sin productos concretos, sin promesas. |
| **Alguien agota el saldo de la API** recargando la entrevista pública | Límite por IP y hora, tope de mensajes por entrevista, caducidad a 30 días. Riesgo nuevo al abrir la entrada: con enlaces por invitación no existía. |
| Leads basura con correos falsos | Asumido de momento. La entrevista dura 5 minutos: quien la completa entera con datos coherentes ya se ha cualificado solo. |
| La alerta de mercado (F7) se lee como gestión activa o como promesa de rentabilidad | Límites duros de R11: nunca sugiere una acción concreta, nunca nombra un producto, mismo descargo educativo que el resto. |
| La fuente de datos de mercado (Yahoo Finance, endpoint no oficial) cambia o deja de responder | Riesgo aceptado y documentado en `docs/architecture.md`. El job de vigilancia falla de forma visible (sin alerta ese día) en vez de inventar un dato. |
