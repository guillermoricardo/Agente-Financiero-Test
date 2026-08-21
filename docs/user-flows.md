# Flujos de usuario

---

## Flujo 1 · Un visitante llega y hace su entrevista

Este es el flujo principal del producto. **Empieza en una landing pública, no en
un enlace que alguien reparta.**

```
Landing ──▶ Consentimiento ──▶ Chat ──▶ Confirmación ──▶ Plan
   │              │              │            │
 botón       crea la        nombre y       correcciones
 «Empezar»   entrevista     correo →       → confirmado
             + token        se crea el
                            cliente (lead)
```

### Paso a paso

**1 · Landing.** Página pública y sencilla: qué es, para quién, y un botón para
empezar el diagnóstico. Sin registro, sin contraseña, sin formulario largo.

**2 · Consentimiento.** Al pulsar el botón se le explica qué datos se van a
recoger y para qué —**incluido que su correo se usará para que un asesor pueda
contactarle**— y tiene que aceptar con una acción explícita.

Al aceptar se crea la **entrevista** con su token, y la URL pasa a
`/entrevista/[token]`. Desde ese momento puede cerrar la pestaña y volver.

Todavía no existe ningún cliente: solo una entrevista anónima. Quien abandone
aquí no deja ningún dato personal.

**3 · Nombre y correo.** El asistente se presenta y pide, conversando, el
nombre y el correo. Con esos dos datos se crea el **cliente** y se enlaza a la
entrevista. **Este es el momento de captación**: un visitante anónimo se
convierte en lead.

Si el correo ya existe, se enlaza al cliente existente en vez de duplicarlo.

**4 · Entrevista.** Los 8 bloques de
`docs/criterio/plantilla-entrevista.md`. Una pregunta por mensaje.

Durante toda la conversación:

- Cada dato capturado se guarda al momento, con su etiqueta y su cita.
- La barra lateral marca los bloques completados.
- Si el cliente pide consejo a mitad, el asistente lo aplaza al final.
- Si suelta un dato fuera de orden, se registra y **no se vuelve a preguntar**.
- Máximo un rebote por variable. Después: se etiqueta y se avanza.

**5 · Confirmación.** Resumen editable de todo lo capturado. El cliente corrige
lo que haga falta; cada corrección pasa el dato a `confirmado`. Al aceptar, la
ficha se cierra y se versiona.

**6 · Cálculo.** Pantalla de espera mientras el motor trabaja. Es la única
espera larga del flujo, y conviene que se note que está pasando algo.

**7 · Plan.** Las 8 secciones en lenguaje llano. Descargable.

### Caminos alternativos

| Situación | Qué pasa |
|---|---|
| Abandona antes de dar nombre y correo | Queda una entrevista anónima. No hay dato personal que conservar. |
| Abandona a mitad de la entrevista | Lo capturado se conserva. Si vuelve con la misma URL, retoma donde lo dejó. |
| Vuelve con un correo que ya existe | Se enlaza al mismo cliente. Una entrevista nueva, el mismo lead. |
| El enlace ha caducado | Se le ofrece empezar una entrevista nueva desde la landing. |
| Se niega a hablar de deudas | Se insiste **una vez** explicando por qué importa. Si mantiene la negativa, `deudas: pendiente` y el sistema entra en modo suspendido: hay diagnóstico descriptivo, pero no recomendación. Y se le dice por qué. |
| Falta otra variable crítica | El plan sale **condicionado**: escenarios «si X fuera…», sin propuesta ejecutable. |
| Flujo libre cero o negativo | El plan cambia de objetivo: estabilización (R8). No se propone cartera. |
| Su meta es la renta de un negocio propio | No se convierte a patrimonio (R6). El plan dice claramente que esa meta no se consigue invirtiendo. |
| Pasa de ~12 intercambios | Se cierra capturando lo que falte como `pendiente`. |
| Supera el límite de uso | Se le pide que lo intente más tarde. Ver «Protección del flujo público» abajo. |

---

## Flujo 2 · Marta revisa los leads que han llegado

```
Login ──▶ Listado de clientes ──▶ Ficha de un cliente
                                        │
                          ┌─────────────┼─────────────┐
                     Diagnóstico    Ficha cruda    Plan entregado
                     (gráficos)     (trazabilidad)
```

**1 · Acceso.** Login con correo. Solo quien esté dado de alta como asesor
entra.

**2 · Listado.** Una fila por cliente: nombre, correo, meta, plazo, banda de
probabilidad y estado de la entrevista. Ordenable por banda, que es como se
detecta a quién hay que llamar primero.

**3 · Ficha del cliente.** Tres vistas:

- **Diagnóstico** — las cuatro visualizaciones. Es la vista por defecto.
- **Ficha cruda** — los datos con su etiqueta y la cita literal del cliente. Es
  la trazabilidad: responde «¿de dónde sale este número?».
- **Plan** — lo que se le entregó al cliente, tal cual lo vio.

**4 · Pendientes.** Visibles en la ficha: qué falta y cómo cambiaría el plan si
se supiera.

**Marta no crea nada.** No genera enlaces, no da de alta clientes, no inicia
entrevistas. Su panel es un buzón de leads ya diagnosticados. Puede usar la
aplicación desde el primer día, sin tener todavía un solo cliente.

---

## Protección del flujo público

La entrevista es abierta y cada mensaje cuesta dinero en la API del modelo. Sin
límites, recargar la página en bucle vacía el saldo.

- Límite de entrevistas nuevas por IP y hora.
- Límite de mensajes por entrevista — la plantilla ya marca ~12 intercambios.
- Caducidad de la entrevista a 30 días.

Se registra un **hash** de la IP, nunca la IP: sirve igual para contar y deja
de ser un dato personal identificable.

---

## Qué NO existe en ningún flujo

- **Registro del cliente con contraseña.** El token de la URL basta y evita
  guardar credenciales de gente que entra una vez.
- **Enlaces repartidos a mano por la asesora.** Fue el diseño inicial y se
  descartó: obligaba a Marta a dar de alta a cada cliente antes de que el
  producto sirviera para nada. Si algún día hace falta invitar a alguien en
  concreto, está en `mejoras/backlog.md`.
- **Edición del plan por parte de Marta.** Si algo está mal, se corrige la
  ficha y se recalcula: así el plan siempre es trazable hasta sus datos.
- **Recálculo automático al cambiar las reglas.** Los informes emitidos guardan
  con qué versión se calcularon; rehacerlos es una acción deliberada.
