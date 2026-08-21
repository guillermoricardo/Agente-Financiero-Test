import Link from 'next/link';

// docs/design-system.md: calma antes que impacto, cero jerga sin traducir,
// una cosa por pantalla. La landing solo necesita decir qué es, para quién,
// y dar un botón — todo lo demás pasa en /consentimiento y en la entrevista.
export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
          Sabe si vas bien encaminado con tu dinero, en cinco minutos
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-600">
          Platica con nuestro asistente sobre tus ingresos, tu ahorro y tu
          meta. Al terminar, recibes un diagnóstico con tus números, escrito
          en español sencillo — sin formularios largos y sin costo.
        </p>
        <Link
          href="/consentimiento"
          className="mt-10 inline-block rounded-full bg-zinc-900 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Empezar mi diagnóstico
        </Link>
        <p className="mt-6 text-sm text-zinc-500">
          Es orientación educativa, no asesoramiento financiero regulado.
        </p>
      </div>
    </div>
  );
}
