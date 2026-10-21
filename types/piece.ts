export type Categorie =
  | "freinage"
  | "transmission"
  | "pneus-chambres"
  | "eclairage"
  | "accessoires";

export type TailleRoue = "20" | "24" | "26" | "27.5" | "29" | "700c";

export type TypeFrein =
  | "v-brake"
  | "etrier" // frein à patins des vélos de route
  | "disque-mecanique"
  | "disque-hydraulique";

// Un critère absent signifie que la pièce n'en dépend pas.
export interface Compatibilites {
  taillesRoue?: TailleRoue[];
  typesFrein?: TypeFrein[];
  vitesses?: number[];
}

export interface Piece {
  id: string; // slug, utilisable dans les URL
  nom: string;
  categorie: Categorie;
  prixCentimes: number; // entier, en centimes d'euro TTC (ex. 1290 pour 12,90 €)
  compatibilites: Compatibilites;
  description: string;
}
