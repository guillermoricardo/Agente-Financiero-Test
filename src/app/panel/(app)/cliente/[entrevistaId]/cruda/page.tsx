import { notFound } from 'next/navigation';
import NavFicha from '@/components/panel/NavFicha';
import { obtenerContextoCliente, obtenerFichaYAnalisis } from '@/lib/panel/consultas';
import { CAMPOS_EDITABLES, resumenDeudasEnLenguajeLlano } from '@/lib/claude/ficha-entrevista';
import type { Dato, Deudas } from '@/lib/motor/ficha';

const COLOR_ETIQUETA: Record<string, string> = {
  confirmado: 'bg-zinc-100 text-zinc-600',
  estimado: 'bg-amber-100 text-amber-800',
  pendiente: 'bg-zinc-50 text-zinc-400 border border-dashed border-zinc-300',
};

// Fase 9 · Vista "Ficha cruda" — la trazabilidad. docs/user-flows.md § Flujo
// 2: "los datos con su etiqueta y la cita literal del cliente. Responde
// '¿de dónde sale este número?'." Reutiliza CAMPOS_EDITABLES
// (src/lib/claude/ficha-entrevista.ts), la misma lista que ya usa la
// pantalla de confirmación del cliente (Fase 6) — mismas etiquetas en
// español, para no mantener dos traducciones distintas del mismo campo.
export default async function FichaCrudaCliente({
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
      <h1 className="text-xl font-semibold text-zinc-900">{contexto.clienteNombre || 'Cliente'}</h1>
      <p className="text-sm text-zinc-500">{contexto.clienteEmail}</p>
      <div className="mt-4">
        <NavFicha entrevistaId={entrevistaId} activa="cruda" />
      </div>

      {!fichaYAnalisis ? (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-sm text-zinc-600 shadow-sm">
          Esta entrevista todavía no tiene ficha cerrada.
        </p>
      ) : (
        <div className="mt-6 space-y-2 rounded-2xl bg-white p-2 shadow-sm">
          {CAMPOS_EDITABLES.map(({ campo, etiquetaCampo }) => {
            const dato = (fichaYAnalisis.datos as Record<string, Dato<unknown> | undefined>)[campo];
            const etiqueta = dato?.etiqueta ?? 'pendiente';
            const valor = dato?.valor === null || dato?.valor === undefined || dato?.valor === '' ? '—' : String(dato.valor);

            return (
              <div key={campo} className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3 last:border-0">
                <div>
                  <p className="text-sm text-zinc-500">{etiquetaCampo}</p>
                  <p className="text-[15px] font-medium text-zinc-900">{valor}</p>
                  {dato?.cita && <p className="mt-0.5 text-xs italic text-zinc-400">«{dato.cita}»</p>}
                  {dato?.supuesto && <p className="mt-0.5 text-xs text-amber-700">{dato.supuesto}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_ETIQUETA[etiqueta]}`}>{etiqueta}</span>
              </div>
            );
          })}

          <div className="flex flex-wrap items-start justify-between gap-2 border-t border-zinc-100 px-4 py-3">
            <div>
              <p className="text-sm text-zinc-500">Deudas</p>
              <p className="text-[15px] font-medium text-zinc-900">
                {resumenDeudasEnLenguajeLlano(
                  (fichaYAnalisis.datos as Record<string, Dato<unknown> | undefined>).deudas as Dato<Deudas> | undefined,
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
