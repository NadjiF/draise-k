import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
};

const stack = [
  { nom: "Next.js 16", detail: "App Router, Cache Components et Partial Prefetching" },
  { nom: "React 19", detail: "Server Components par défaut, Client Components au besoin" },
  { nom: "TypeScript", detail: "types de routes générés par Next.js" },
  { nom: "Tailwind CSS 4", detail: "branché sur Turbopack, thème clair et sombre" },
  { nom: "Données JSON", detail: "un catalogue statique de 25 pièces, prérendu au build" },
];

export default function AProposPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">À propos</h1>
      <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
        La Draise-K est un projet de démonstration. Le catalogue, les prix et les
        compatibilités sont fictifs, et aucune commande n’est possible. Le site sert à
        montrer comment présenter des pièces détachées vélo filtrées selon le vélo de
        chacun.
      </p>
      <h2 className="mt-10 text-xl font-semibold">Stack</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
        {stack.map(({ nom, detail }) => (
          <div key={nom} className="contents">
            <dt className="font-medium">{nom}</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{detail}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
