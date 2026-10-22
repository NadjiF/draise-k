// Limitation simple, en mémoire : remise à zéro au redémarrage et propre à chaque
// instance du serveur. Suffisant tant que l'application tourne sur un seul processus.
export const FENETRE_MS = 60_000;
export const MAX_REQUETES = 10;

const historiques = new Map<string, number[]>();

export type ResultatLimite = { autorise: true } | { autorise: false; reessayerDansS: number };

// Fenêtre glissante : au plus MAX_REQUETES par clé sur les FENETRE_MS dernières ms.
export function limiter(cle: string, maintenant = Date.now()): ResultatLimite {
  const recentes = (historiques.get(cle) ?? []).filter((t) => t > maintenant - FENETRE_MS);
  if (recentes.length >= MAX_REQUETES) {
    historiques.set(cle, recentes);
    return {
      autorise: false,
      reessayerDansS: Math.ceil((recentes[0] + FENETRE_MS - maintenant) / 1000),
    };
  }
  recentes.push(maintenant);
  historiques.set(cle, recentes);
  if (historiques.size > 1000) purger(maintenant);
  return { autorise: true };
}

// Évite que la table grossisse indéfiniment avec des clients qui ne reviennent pas.
function purger(maintenant: number) {
  for (const [cle, horodatages] of historiques) {
    if (horodatages.every((t) => t <= maintenant - FENETRE_MS)) historiques.delete(cle);
  }
}
