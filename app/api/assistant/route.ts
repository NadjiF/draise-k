import {
  ErreurAssistant,
  estCoherente,
  estObjet,
  interrogerModele,
  LONGUEUR_MAX_MESSAGE,
  MAX_ECHANGES,
  QUESTION_PAR_DEFAUT,
  validerEchanges,
  type CodeErreur,
} from "@/lib/assistant";
import { fusionnerCriteres, validerCriteres } from "@/lib/criteres";
import { etablirDevis } from "@/lib/devis";
import { limiter } from "@/lib/limiteur";
import type { ErreurApi, ReponseAssistant } from "@/types/assistant";

// POST /api/assistant { message, criteres?, echanges? } → devis calculé par le serveur.
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
  if (nbCaracteres(message) > LONGUEUR_MAX_MESSAGE) {
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

  // Questions de l'assistant et réponses de l'utilisateur, renvoyées par le client.
  const echanges = corps.echanges == null ? [] : validerEchanges(corps.echanges);
  if (!echanges) {
    return erreur(400, "requete_invalide", "Les échanges précédents sont invalides.");
  }
  if (echanges.length > MAX_ECHANGES) {
    return erreur(
      400,
      "requete_invalide",
      "Trop d’échanges pour une même demande : reformulez votre besoin depuis le début.",
    );
  }
  const tropLong = (texte: string) => nbCaracteres(texte) > LONGUEUR_MAX_MESSAGE;
  if (echanges.some(({ question, reponse }) => tropLong(question) || tropLong(reponse))) {
    return erreur(
      413,
      "message_trop_long",
      `Votre réponse dépasse ${LONGUEUR_MAX_MESSAGE} caractères.`,
    );
  }

  let reponse;
  try {
    reponse = await interrogerModele(message, criteres, echanges);
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

  // Une réponse incohérente devient une question : l'utilisateur garde le message du
  // modèle et a toujours quelque chose à répondre.
  // Variable locale : TypeScript ne restreint pas reponse.intention via `coherente`.
  const { intention } = reponse;
  const coherente = estCoherente(intention, {
    question: reponse.question,
    nbLignes: devis.lignes.length,
    nonCouvert: reponse.nonCouvert,
  });
  if (!coherente) {
    console.warn("Réponse incohérente du modèle, traitée comme une question :", {
      intention,
      question: reponse.question,
      lignes: devis.lignes.length,
      nonCouvert: reponse.nonCouvert,
    });
  }

  return Response.json({
    intention: coherente ? intention : "question",
    message: reponse.message,
    question: coherente ? reponse.question : (reponse.question ?? QUESTION_PAR_DEFAUT),
    lignes: devis.lignes,
    totalCentimes: devis.totalCentimes,
    nonCouvert: reponse.nonCouvert,
    ecartees: devis.ecartees,
    criteres: effectifs,
    criteresDeduits: deduitsRetenus,
  } satisfies ReponseAssistant);
}

// Compté en caractères, pas en unités UTF-16 (un emoji compte pour un).
function nbCaracteres(texte: string): number {
  return [...texte].length;
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
  return Response.json({ erreur: { code, message } } satisfies ErreurApi, {
    status: statut,
    headers: enTetes,
  });
}
