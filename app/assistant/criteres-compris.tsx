import { decrireCriteres, type Criteres } from "@/lib/criteres";

// Critères déduits du message par l'assistant, que l'utilisateur peut corriger.
export function CriteresCompris({
  criteres,
  onCorriger,
}: {
  criteres: Criteres;
  onCorriger: (criteres: Criteres) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-surface-alt px-4 py-3 text-sm">
      <p>
        J’ai compris : <strong>{decrireCriteres(criteres)}</strong>
      </p>
      <button
        type="button"
        onClick={() => onCorriger(criteres)}
        className="text-primaire underline underline-offset-2 hover:text-primaire-survol"
      >
        Corriger
      </button>
    </div>
  );
}
