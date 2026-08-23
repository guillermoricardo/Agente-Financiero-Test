import { notFound } from 'next/navigation';
import NavFicha from '@/components/panel/NavFicha';
import PlanCliente from '@/components/PlanCliente';
import { obtenerContextoCliente, obtenerFichaYAnalisis, obtenerPlan } from '@/lib/panel/consultas';

// Fase 9 · Vista "Plan" — docs/user-flows.md § Flujo 2: "lo que se le
// entregó al cliente, tal cual lo vio." Por eso reutiliza el mismo
// componente `PlanCliente` de la Fase 8 en vez de redactar una versión
// propia para Marta: si hubiera dos representaciones del mismo plan,
// podrían divergir. A diferencia de la página del cliente
// (`entrevista/[token]/plan`), esta NUNCA genera un plan nuevo — Marta solo
// lee lo que ya existe; si todavía no se generó (nadie ha visitado la
// página del cliente), lo dice en vez de gastar una llamada al modelo por
// su cuenta.
export default async function PlanClienteAsesora({
  params,
}: {
  params: Promise<{ entrevistaId: string }>;
}) {
  const { entrevistaId } = await params;

  const contexto = await obtenerContextoCliente(entrevistaId);
  if (!contexto) notFound();

  const fichaYAnalisis = await obtenerFichaYAnalisis(entrevistaId);
  const plan = fichaYAnalisis?.analisisId ? await obtenerPlan(fichaYAnalisis.analisisId) : null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900">{contexto.clienteNombre || 'Cliente'}</h1>
      <p className="text-sm text-zinc-500">{contexto.clienteEmail}</p>
      <div className="mt-4">
        <NavFicha entrevistaId={entrevistaId} activa="plan" />
      </div>

      <div className="mt-6">
        {!plan ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-600 shadow-sm">
            Este cliente todavía no ha abierto su plan — se genera la primera
            vez que él lo visita, no desde aquí.
          </p>
        ) : (
          <PlanCliente nombreCliente={contexto.clienteNombre} secciones={plan.secciones} markdown={plan.markdown} />
        )}
      </div>
    </div>
  );
}
