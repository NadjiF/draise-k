import type { Compatibilites, Piece, TailleRoue, TypeFrein } from "@/types/piece";

// Profil du vélo de l'utilisateur : chaque critère est facultatif.
export interface Criteres {
  tailleRoue?: TailleRoue;
  typeFrein?: TypeFrein;
  vitesses?: number;
}

export const libellesTaillesRoue: Record<TailleRoue, string> = {
  "20": "20 pouces",
  "24": "24 pouces",
  "26": "26 pouces",
  "27.5": "27,5 pouces",
  "29": "29 pouces",
  "700c": "700c (route)",
};

// Object.keys placerait "27.5" et "700c" après les clés entières : ordre explicite.
const ordreTaillesRoue: TailleRoue[] = ["20", "24", "26", "27.5", "29", "700c"];

export const libellesTypesFrein: Record<TypeFrein, string> = {
  "v-brake": "V-Brake",
  etrier: "Étrier",
  "disque-mecanique": "Disque mécanique",
  "disque-hydraulique": "Disque hydraulique",
};

type SearchParams = Record<string, string | string[] | undefined>;

// Noms des paramètres d'URL : /catalogue/freinage?frein=v-brake
// Toute valeur absente, vide, répétée ou inconnue est ignorée.
export function parserCriteres(searchParams: SearchParams): Criteres {
  const { taille, frein, vitesses } = searchParams;
  const nbVitesses = typeof vitesses === "string" ? Number(vitesses) : NaN;
  return {
    tailleRoue:
      typeof taille === "string" && Object.hasOwn(libellesTaillesRoue, taille)
        ? (taille as TailleRoue)
        : undefined,
    typeFrein:
      typeof frein === "string" && Object.hasOwn(libellesTypesFrein, frein)
        ? (frein as TypeFrein)
        : undefined,
    vitesses: Number.isInteger(nbVitesses) && nbVitesses > 0 ? nbVitesses : undefined,
  };
}

export function aDesCriteres(criteres: Criteres): boolean {
  return Object.values(criteres).some((valeur) => valeur !== undefined);
}

// Une pièce qui ne déclare pas un critère n'en dépend pas : elle reste affichée.
export function filtrerPieces(pieces: Piece[], criteres: Criteres): Piece[] {
  return pieces.filter(
    ({ compatibilites }) =>
      accepte(compatibilites.taillesRoue, criteres.tailleRoue) &&
      accepte(compatibilites.typesFrein, criteres.typeFrein) &&
      accepte(compatibilites.vitesses, criteres.vitesses),
  );
}

function accepte<T>(valeurs: T[] | undefined, choisie: T | undefined): boolean {
  return choisie === undefined || valeurs === undefined || valeurs.includes(choisie);
}

// Valeurs proposées dans le formulaire : seulement celles présentes dans la liste,
// pour ne pas afficher de critère sans effet (ex. vitesses sur le freinage).
export function valeursDisponibles(pieces: Piece[]) {
  const taillesRoue = new Set(pieces.flatMap((p) => p.compatibilites.taillesRoue ?? []));
  const typesFrein = new Set(pieces.flatMap((p) => p.compatibilites.typesFrein ?? []));
  const vitesses = new Set(pieces.flatMap((p) => p.compatibilites.vitesses ?? []));
  return {
    taillesRoue: ordreTaillesRoue.filter((taille) => taillesRoue.has(taille)),
    typesFrein: (Object.keys(libellesTypesFrein) as TypeFrein[]).filter((type) =>
      typesFrein.has(type),
    ),
    vitesses: [...vitesses].sort((a, b) => a - b),
  };
}

const ordreTypesFrein = Object.keys(libellesTypesFrein) as TypeFrein[];

// Compatibilités en langage clair, ex. { critere: "Freins", valeurs: "V-Brake, étrier" }.
// Une liste vide signifie que la pièce convient à tous les vélos.
export function decrireCompatibilites(
  compatibilites: Compatibilites,
): { critere: string; valeurs: string }[] {
  const { taillesRoue, typesFrein, vitesses } = compatibilites;
  const lignes = [];
  if (taillesRoue) {
    lignes.push({
      critere: "Roues",
      valeurs: enClair(trierSelon(taillesRoue, ordreTaillesRoue).map((t) => libellesTaillesRoue[t])),
    });
  }
  if (typesFrein) {
    lignes.push({
      critere: "Freins",
      valeurs: enClair(trierSelon(typesFrein, ordreTypesFrein).map((t) => libellesTypesFrein[t])),
    });
  }
  if (vitesses) {
    lignes.push({
      critere: "Vitesses",
      valeurs: enClair([...vitesses].sort((a, b) => a - b).map(String)),
    });
  }
  return lignes;
}

function trierSelon<T>(valeurs: T[], ordre: T[]): T[] {
  return ordre.filter((valeur) => valeurs.includes(valeur));
}

// Seul le premier libellé garde sa majuscule : « V-Brake, étrier ».
// V-Brake étant premier dans l'ordre des freins, il n'est jamais mis en minuscules.
function enClair(libelles: string[]): string {
  return libelles
    .map((libelle, i) => (i === 0 ? libelle : libelle.toLocaleLowerCase("fr-FR")))
    .join(", ");
}
