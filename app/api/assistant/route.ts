import {
  ErreurAssistant,
  estObjet,
  interrogerModele,
  LONGUEUR_MAX_MESSAGE,
  type CodeErreur,
} from "@/lib/assistant";
import { fusionnerCriteres, validerCriteres } from "@/lib/criteres";
import { etablirDevis } from "@/lib/devis";
import { limiter } from "@/lib/limiteur";

// POST /api/assistant { message, criteres? } → devis calculé par le serveur.
// Format de réponse et codes d'erreur : voir la section « Assistant » de CLAUDE.md.
export async function POST(request: Request) {
  const limite = limiter(adresseClient(request));
  if (!limite.autorise) {
    return erreur(429, "trop_de_requetes", "Trop de demandes. Patientez un instant.", {
      "Retry-After": String(limite.reessayerDansS),
    });
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "requete_invalide", "Le corps de la requête doit être du JSON.");
  }
  if (!estObjet(corps)) {
    return erreur(400, "requete_invalide", "Le corps de la requête doit être un objet JSON.");
  }

  const message = typeof corps.message === "string" ? corps.message.trim() : "";
  if (!message) {
    return erreur(400, "requete_invalide", "Décrivez votre besoin.");
  }
  // Compté en caractères, pas en unités UTF-16 (un emoji compte pour un).
  if ([...message].length > LONGUEUR_MAX_MESSAGE) {
    return erreur(
      413,
      "message_trop_long",
      `Votre message dépasse ${LONGUEUR_MAX_MESSAGE} caractères.`,
    );
  }

  const criteres = corps.criteres == null ? {} : validerCriteres(corps.criteres);
  if (!criteres) {
    return erreur(400, "requete_invalide", "Les critères du vélo sont invalides.");
  }

  let reponse;
  try {
    reponse = await interrogerModele(message, criteres);
  } catch (e) {
    if (e instanceof ErreurAssistant) return erreur(e.statut, e.code, e.message);
    console.error("Erreur de l'assistant :", e);
    return erreur(500, "erreur_interne", "Une erreur est survenue. Réessayez plus tard.");
  }

  const { effectifs, deduitsRetenus } = fusionnerCriteres(criteres, reponse.criteresDeduits);
  const devis = etablirDevis(reponse.pieces, effectifs);
  if (devis.idsInconnus.length > 0) {
    console.warn("Ids inconnus proposés par le modèle :", devis.idsInconnus);
  }

  return Response.json({
    message: reponse.message,
    question: reponse.question,
    lignes: devis.lignes,
    totalCentimes: devis.totalCentimes,
    nonCouvert: reponse.nonCouvert,
    ecartees: devis.ecartees,
    criteres: effectifs,
    criteresDeduits: deduitsRetenus,
  });
}

// Derrière un proxy, la première adresse de x-forwarded-for est celle du client.
// L'en-tête peut être falsifié : la limite reste un garde-fou, pas une protection forte.
function adresseClient(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "inconnue";
}

function erreur(
  statut: number,
  code: CodeErreur,
  message: string,
  enTetes?: Record<string, string>,
) {
  return Response.json({ erreur: { code, message } }, { status: statut, headers: enTetes });
}
