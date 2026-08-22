import { notFound } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/cliente-servidor';
import ConfirmarFicha from '@/components/ConfirmarFicha';
import { CAMPOS_EDITABLES, resumenDeudasEnLenguajeLlano, type FichaParcial } from '@/lib/claude/ficha-entrevista';
import type { Dato, Deudas } from '@/lib/motor/ficha';

// Fase 6 · "Confirmación y cierre". Pantalla a la que se llega desde el chat
// una vez terminada la conversación (ver el enlace que aparece en
// ChatEntrevista.tsx tras la despedida literal). Igual que
// /entrevista/[token], un token inventado da 404 — no hay otra forma de
// llegar aquí que haberlo generado el propio sistema.
export default async function ConfirmarEntrevista({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: entrevista } = await supabaseServidor
    .from('entrevistas')
    .select('id, cliente_id, estado, expira_en')
    .eq('token', token)
    .maybeSingle();

  if (!entrevista) {
    notFound();
  }

  const expirada = new Date(entrevista.expira_en) < new Date();

  if (expirada) {
    return (
      <PantallaAviso titulo="Este enlace ya caducó">
        Las entrevistas duran 30 días. Si necesitas corregir algo, contacta
        directamente con Marta.
      </PantallaAviso>
    );
  }

  if (!entrevista.cliente_id) {
    return (
      <PantallaAviso titulo="Todavía no hay nada que confirmar">
        Antes de llegar aquí hace falta terminar la conversación con el
        asistente.
      </PantallaAviso>
    );
  }

  const { data: cliente } = await supabaseServidor
    .from('clientes')
    .select('nombre')
    .eq('id', entrevista.cliente_id)
    .maybeSingle();

  const { data: fichas } = await supabaseServidor
    .from('fichas')
    .select('datos')
    .eq('entrevista_id', entrevista.id)
    .order('version', { ascending: false })
    .limit(1);

  const ficha = (fichas?.[0]?.datos as FichaParcial) ?? null;

  if (!ficha) {
    return (
      <PantallaAviso titulo="Todavía no hay nada que confirmar">
        Antes de llegar aquí hace falta terminar la conversación con el
        asistente.
      </PantallaAviso>
    );
  }

  const campos = CAMPOS_EDITABLES.map(({ clave, campo, etiquetaCampo, tipo }) => {
    const dato = (ficha as Record<string, Dato<unknown> | undefined>)[campo];
    return {
      clave,
      etiquetaCampo,
      tipo,
      valor: dato?.valor === undefined || dato?.valor === null ? '' : String(dato.valor),
      etiquetaCalidad: dato?.etiqueta ?? null,
    };
  });

  const resumenDeudas = resumenDeudasEnLenguajeLlano(ficha.deudas as Dato<Deudas> | undefined);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-8">
      <ConfirmarFicha
        token={token}
        nombreCliente={cliente?.nombre ?? ''}
        campos={campos}
        resumenDeudas={resumenDeudas}
      />
    </div>
  );
}

function PantallaAviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">{titulo}</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">{children}</p>
      </div>
    </div>
  );
}
