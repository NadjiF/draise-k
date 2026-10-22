import type { Metadata } from "next";
import { LONGUEUR_MAX_MESSAGE, MAX_ECHANGES } from "@/lib/assistant";
import { valeursDisponibles } from "@/lib/criteres";
import { getPieces } from "@/lib/pieces";
import { Assistant } from "./assistant";

export const metadata: Metadata = {
  title: "Assistant",
};

// Page statique : les options des listes sont calculées ici, côté serveur, pour que
// le composant client n'embarque pas le catalogue.
export default function AssistantPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Assistant</h1>
      <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Décrivez ce que vous cherchez : l’assistant choisit les pièces dans le catalogue et le
        site calcule le devis. S’il lui manque une information, il vous pose une question.
      </p>
      <Assistant
        options={valeursDisponibles(getPieces())}
        longueurMax={LONGUEUR_MAX_MESSAGE}
        maxEchanges={MAX_ECHANGES}
      />
    </>
  );
}
