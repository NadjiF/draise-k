import { Indicateur } from "./commun";

// Purement visuel : l'annonce aux lecteurs d'écran passe par la zone `role="status"`.
export function Chargement() {
  return (
    <div
      aria-hidden="true"
      className="mt-6 flex items-center gap-3 rounded-lg border border-cuivre/50 bg-surface p-4"
    >
      <Indicateur className="size-5" />
      <div>
        <p className="font-medium">L’assistant cherche dans le catalogue…</p>
        <p className="text-sm text-texte-doux">
          Cela prend souvent 10 à 20 secondes.
        </p>
      </div>
    </div>
  );
}
