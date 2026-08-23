import Link from 'next/link';
import BotonCerrarSesion from '@/components/panel/BotonCerrarSesion';

// Fase 9 · Cabecera fija del panel. docs/design-system.md § Móvil: "El panel
// de la asesora se diseña primero para escritorio." Layout simple sin menú
// lateral: solo el listado y, desde ahí, la ficha de cada cliente.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/panel" className="text-sm font-semibold text-zinc-900">
          Panel de la asesora
        </Link>
        <BotonCerrarSesion />
      </header>
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
