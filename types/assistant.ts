import type { CodeErreur, Echange, Intention } from "@/lib/assistant";
import type { Criteres } from "@/lib/criteres";
import type { LigneDevis, PieceEcartee } from "@/lib/devis";

// Contrat de POST /api/assistant, partagé par la route et l'interface. Imports de
// types seulement : l'interface n'embarque ni le SDK Gemini ni le catalogue.

export interface RequeteAssistant {
  message: string; // toujours la demande initiale
  criteres?: Criteres;
  echanges?: Echange[];
}

export interface ReponseAssistant {
  intention: Intention;
  message: string;
  question: string | null;
  lignes: LigneDevis[];
  totalCentimes: number;
  nonCouvert: string[];
  ecartees: PieceEcartee[];
  criteres: Criteres; // effectifs : fournis, complétés par les déductions
  criteresDeduits: Criteres; // déductions retenues, à montrer pour correction
}

export interface ErreurApi {
  erreur: { code: CodeErreur; message: string };
}
