import { notFound } from 'next/navigation';
import NavFicha from '@/components/panel/NavFicha';
import GraficoProbabilidad from '@/components/panel/GraficoProbabilidad';
import GraficoCartera from '@/components/panel/GraficoCartera';
import GraficoProyeccion from '@/components/panel/GraficoProyeccion';
import ChecklistR1 from '@/components/panel/ChecklistR1';
import { euros, anios } from '@/lib/panel/formato';
import { obtenerContextoCliente, obtenerFichaYAnalisis } from '@/lib/panel/consultas';
import { ETIQUETA_MODO } from '@/lib/panel/tipos';

// Fase 9 · Vista "Diagnóstico" — la vista por defecto de la ficha del
// cliente (docs/user-flows.md § Flujo 2, paso 3). Las cuatro visualizaciones
// de docs/design-system.md, todas en euros de hoy, más los supuestos y lo
// pendiente a la vista.
export default async function DiagnosticoCliente({
  params,
}: {
  params: Promise<{ entrevistaId: string }>;
}) {
  const { entrevistaId } = await params;

  const contexto = await obtenerContextoCliente(entrevistaId);
  if (!contexto) notFound();

  const fichaYAnalisis = await obtenerFichaYAnalisis(entrevistaId);

  return (
    <div>
      <Cabecera nombre={contexto.clienteNombre} correo={contexto.clienteEmail} entrevistaId={entrevistaId} />

      {!fichaYAnalisis ? (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-sm text-zinc-600 shadow-sm">
          Esta entrevista todavía no tiene ficha cerrada.
        </p>
      ) : !fichaYAnalisis.resultado ? (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-sm text-zinc-600 shadow-sm">
          La ficha está cerrada pero el análisis todavía no se ha calculado.
          Recarga en unos segundos.
        </p>
      ) : (
        <Diagnostico resultado={fichaYAnalisis.resultado} />
      )}
    </div>
  );
}

function Cabecera({ nombre, correo, entrevistaId }: { nombre: string; correo: string; entrevistaId: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900">{nombre || 'Cliente'}</h1>
      <p className="text-sm text-zinc-500">{correo}</p>
      <div className="mt-4">
        <NavFicha entrevistaId={entrevistaId} activa="diagnostico" />
      </div>
    </div>
  );
}

function Diagnostico({ resultado }: { resultado: import('@/lib/analisis/generar-analisis').AnalisisResultado }) {
  const { situacionActual, proyeccion, monteCarlo, cartera, modo, faltantes, pendientes, supuestos } = resultado;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
          Modo del informe: {ETIQUETA_MODO[modo]}
        </span>
        {faltantes.length > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Faltan: {faltantes.join(', ')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta titulo="Probabilidad de cumplimiento">
          <GraficoProbabilidad probabilidad={monteCarlo?.probCumplimiento ?? null} banda={monteCarlo?.banda ?? null} />
        </Tarjeta>

        <Tarjeta titulo="Composición de la cartera propuesta">
          <GraficoCartera pesos={cartera?.pesos ?? null} />
        </Tarjeta>

        <Tarjeta titulo="Proyección (p10 / p50 / p90)" ancho="md:col-span-2">
          <GraficoProyeccion
            patrimonioHoy={situacionActual.patrimonioTotal ?? 0}
            anios={proyeccion?.anios ?? 0}
            p10={monteCarlo?.p10 ?? null}
            p50={monteCarlo?.p50 ?? null}
            p90={monteCarlo?.p90 ?? null}
          />
        </Tarjeta>

        <Tarjeta titulo="Prioridades de R1" ancho="md:col-span-2">
          <ChecklistR1 resultado={resultado} />
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta titulo="Situación actual">
          <dl className="space-y-1.5 text-sm">
            <Fila etiqueta="Ingresos netos/mes" valor={euros(situacionActual.ingresosNetosMes)} />
            <Fila etiqueta="Gasto total/mes" valor={euros(situacionActual.gastoTotalMes)} />
            <Fila etiqueta="Flujo libre/mes" valor={euros(situacionActual.flujoLibre)} />
            <Fila etiqueta="Patrimonio total" valor={euros(situacionActual.patrimonioTotal)} />
            <Fila etiqueta="Colchón" valor={situacionActual.colchonMeses !== null ? `${situacionActual.colchonMeses} meses` : '—'} />
            <Fila etiqueta="Perfil de riesgo" valor={situacionActual.perfilRiesgo + (situacionActual.perfilEsSupuesto ? ' (supuesto)' : '')} />
          </dl>
        </Tarjeta>

        {proyeccion && (
          <Tarjeta titulo="Proyección determinista">
            <dl className="space-y-1.5 text-sm">
              <Fila etiqueta="Objetivo (euros de hoy)" valor={euros(proyeccion.objetivoReal)} />
              <Fila etiqueta="Plazo" valor={anios(proyeccion.anios)} />
              <Fila etiqueta="Valor hoy al ritmo actual" valor={euros(proyeccion.vfActualEurosHoy)} />
              <Fila etiqueta="Brecha" valor={euros(proyeccion.gapEuros)} />
            </dl>
          </Tarjeta>
        )}
      </div>

      {pendientes.length > 0 && (
        <Tarjeta titulo="Pendientes">
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-700">
            {pendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {supuestos.length > 0 && (
        <Tarjeta titulo="Supuestos aplicados">
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600">
            {supuestos.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

function Tarjeta({ titulo, children, ancho }: { titulo: string; children: React.ReactNode; ancho?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ${ancho ?? ''}`}>
      <h2 className="text-sm font-semibold text-zinc-900">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-500">{etiqueta}</dt>
      <dd className="font-medium text-zinc-900">{valor}</dd>
    </div>
  );
}
