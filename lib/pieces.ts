import type { Piece } from "@/types/piece";
import data from "@/data/pieces.json";

// L'import JSON est typé avec des `string` larges : on le convertit une seule fois ici.
const pieces = data as Piece[];

export function getPieces(): Piece[] {
  return pieces;
}

export function getPieceById(id: string): Piece | undefined {
  return pieces.find((piece) => piece.id === id);
}
