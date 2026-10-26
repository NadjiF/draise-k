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
      <h1 className="text-3xl font-semibold tracking-tight text-primaire">À propos</h1>
      <p className="mt-4 max-w-2xl text-texte-doux">
        La Draise-K est un projet de démonstration. Le catalogue, les prix et les
        compatibilités sont fictifs, et aucune commande n’est possible. Le site sert à
        montrer comment présenter des pièces détachées vélo filtrées selon le vélo de
        chacun.
      </p>
      <h2 className="mt-10 border-t border-cuivre/40 pt-8 text-xl font-semibold text-primaire">
        Stack
      </h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
        {stack.map(({ nom, detail }) => (
          <div key={nom} className="contents">
            <dt className="font-medium">{nom}</dt>
            <dd className="text-texte-doux">{detail}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
