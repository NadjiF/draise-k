import type { Categorie, Piece } from "@/types/piece";
import data from "@/data/pieces.json";

// L'import JSON est typé avec des `string` larges : on le convertit une seule fois ici.
const pieces = data as Piece[];

export function getPieces(): Piece[] {
  return pieces;
}

export function getPieceById(id: string): Piece | undefined {
  return pieces.find((piece) => piece.id === id);
}

export const libellesCategories: Record<Categorie, string> = {
  freinage: "Freinage",
  transmission: "Transmission",
  "pneus-chambres": "Pneus et chambres à air",
  eclairage: "Éclairage",
  accessoires: "Accessoires",
};

export function estCategorie(valeur: unknown): valeur is Categorie {
  return typeof valeur === "string" && Object.hasOwn(libellesCategories, valeur);
}

// Sans catégorie, renvoie tout le catalogue.
export function getPiecesParCategorie(categorie?: Categorie): Piece[] {
  return categorie
    ? pieces.filter((piece) => piece.categorie === categorie)
    : pieces;
}

const formatPrix = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formaterPrix(prixCentimes: number): string {
  return formatPrix.format(prixCentimes / 100);
}

export function cheminPiece(piece: Piece): string {
  return `/catalogue/${piece.categorie}/${piece.id}`;
}
