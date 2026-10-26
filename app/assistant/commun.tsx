import type { ReactNode } from "react";

export const classeChamp =
  "rounded-md border border-texte-doux bg-surface px-3 py-2";

export function BoutonEnvoi({
  chargement,
  attente,
  children,
}: {
  chargement: boolean;
  attente: number;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={chargement || attente > 0}
      className="inline-flex items-center gap-2 rounded-full bg-primaire px-5 py-2 text-sm text-sur-primaire transition-colors enabled:hover:bg-primaire-survol disabled:cursor-not-allowed disabled:opacity-60"
    >
      {chargement ? (
        <>
          <Indicateur className="size-4" />
          Recherche…
        </>
      ) : attente > 0 ? (
        `Réessayer dans ${attente} s`
      ) : (
        children
      )}
    </button>
  );
}

// Sans animation si l'utilisateur a demandé moins de mouvement : le texte suffit.
export function Indicateur({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin ${className}`}
    />
  );
}
