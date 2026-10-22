import type { Categorie, Piece } from "@/types/piece";
import { criteresIncompatibles, decrireCritere, type Criteres } from "@/lib/criteres";
import { cheminPiece, getPieces } from "@/lib/pieces";

export const QUANTITE_MAX = 10;

// Pièce proposée par le modèle : rien n'est garanti avant le passage dans etablirDevis.
export interface Proposition {
  id: string;
  quantite: number;
  raison: string;
}

export interface LigneDevis {
  id: string;
  nom: string;
  categorie: Categorie;
  quantite: number;
  prixUnitaireCentimes: number;
  totalCentimes: number;
  raison: string;
  chemin: string;
}

export interface PieceEcartee {
  id: string;
  nom: string;
  motif: string;
}

export interface Devis {
  lignes: LigneDevis[];
  totalCentimes: number;
  ecartees: PieceEcartee[];
  idsInconnus: string[]; // pour les journaux du serveur, pas pour l'utilisateur
}

// Seul point où les prix sont calculés : ceux du modèle ne sont jamais utilisés.
// Ids inconnus ignorés, doublons regroupés (quantités additionnées, plafonnées),
// pièces incompatibles avec les critères ou à quantité invalide écartées.
export function etablirDevis(
  propositions: Proposition[],
  criteres: Criteres,
  catalogue: Piece[] = getPieces(),
): Devis {
  const parId = new Map(catalogue.map((piece) => [piece.id, piece]));
  const lignes = new Map<string, LigneDevis>();
  const ecartees = new Map<string, PieceEcartee>();
  const idsInconnus: string[] = [];

  for (const { id, quantite, raison } of propositions) {
    const piece = parId.get(id);
    if (!piece) {
      idsInconnus.push(id);
      continue;
    }
    if (!Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) {
      ecartees.set(id, { id, nom: piece.nom, motif: `Quantité invalide : ${quantite}` });
      continue;
    }
    const incompatibles = criteresIncompatibles(piece.compatibilites, criteres);
    if (incompatibles.length > 0) {
      ecartees.set(id, {
        id,
        nom: piece.nom,
        motif: `Incompatible avec votre vélo (${incompatibles
          .map((critere) => decrireCritere(critere, criteres))
          .join(", ")})`,
      });
      continue;
    }
    const existante = lignes.get(id);
    if (existante) {
      existante.quantite = Math.min(existante.quantite + quantite, QUANTITE_MAX);
      existante.totalCentimes = existante.quantite * existante.prixUnitaireCentimes;
      continue;
    }
    lignes.set(id, {
      id,
      nom: piece.nom,
      categorie: piece.categorie,
      quantite,
      prixUnitaireCentimes: piece.prixCentimes,
      totalCentimes: quantite * piece.prixCentimes,
      raison,
      chemin: cheminPiece(piece),
    });
  }

  // Une pièce retenue par une autre proposition n'est pas signalée comme écartée.
  for (const id of lignes.keys()) ecartees.delete(id);

  const listeLignes = [...lignes.values()];
  return {
    lignes: listeLignes,
    totalCentimes: listeLignes.reduce((total, ligne) => total + ligne.totalCentimes, 0),
    ecartees: [...ecartees.values()],
    idsInconnus,
  };
}
