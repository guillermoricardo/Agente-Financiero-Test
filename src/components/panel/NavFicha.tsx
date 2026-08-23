import Link from 'next/link';

// Fase 9 · Las "tres vistas" de docs/user-flows.md § Flujo 2, paso 3:
// Diagnóstico (por defecto) → Ficha cruda → Plan.
const PESTANAS = [
  { clave: 'diagnostico', etiqueta: 'Diagnóstico', ruta: '' },
  { clave: 'cruda', etiqueta: 'Ficha cruda', ruta: '/cruda' },
  { clave: 'plan', etiqueta: 'Plan', ruta: '/plan' },
] as const;

export default function NavFicha({
  entrevistaId,
  activa,
}: {
  entrevistaId: string;
  activa: (typeof PESTANAS)[number]['clave'];
}) {
  return (
    <nav className="flex gap-1 border-b border-zinc-200">
      {PESTANAS.map((pestana) => (
        <Link
          key={pestana.clave}
          href={`/panel/cliente/${entrevistaId}${pestana.ruta}`}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activa === pestana.clave
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          {pestana.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
