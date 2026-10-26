import type { CodeErreur } from "@/lib/assistant";

// Toujours présente dans la page, pour que l'apparition d'une erreur soit annoncée.
export function MessageErreur({ erreur }: { erreur: string | null }) {
  return (
    <div role="alert">
      {erreur && (
        <p className="mt-6 rounded-lg border border-erreur/30 bg-erreur-fond p-4 text-sm text-erreur">
          {erreur}
        </p>
      )}
    </div>
  );
}

// Les messages du serveur sont déjà en français, mais seuls ceux des requêtes invalides
// sont assez précis pour être montrés tels quels (ex. « Trop d’échanges… »).
export function messageErreur(
  code: CodeErreur | undefined,
  messageServeur: string | undefined,
  secondes: number,
): string {
  switch (code) {
    case "requete_invalide":
    case "message_trop_long":
      return messageServeur ?? "Votre demande n’a pas pu être lue. Vérifiez-la et réessayez.";
    case "trop_de_requetes":
      return `Vous avez envoyé beaucoup de demandes en peu de temps. Patientez ${secondes} secondes avant de réessayer.`;
    case "quota_depasse":
      return "L’assistant est très sollicité en ce moment. Réessayez dans quelques minutes.";
    case "service_indisponible":
      return "L’assistant est momentanément indisponible. Réessayez dans quelques instants.";
    case "reponse_invalide":
      return "L’assistant a renvoyé une réponse inutilisable. Réessayez, si besoin en reformulant.";
    case "delai_depasse":
      return "L’assistant a mis trop de temps à répondre. Réessayez.";
    default:
      return "Une erreur est survenue. Réessayez plus tard.";
  }
}
