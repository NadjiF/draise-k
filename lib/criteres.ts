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

export function estTailleRoue(valeur: unknown): valeur is TailleRoue {
  return typeof valeur === "string" && Object.hasOwn(libellesTaillesRoue, valeur);
}

export function estTypeFrein(valeur: unknown): valeur is TypeFrein {
  return typeof valeur === "string" && Object.hasOwn(libellesTypesFrein, valeur);
}

export function estNbVitesses(valeur: unknown): valeur is number {
  return Number.isInteger(valeur) && (valeur as number) > 0;
}

type SearchParams = Record<string, string | string[] | undefined>;

// Noms des paramètres d'URL : /catalogue/freinage?frein=v-brake
// Toute valeur absente, vide, répétée ou inconnue est ignorée.
export function parserCriteres(searchParams: SearchParams): Criteres {
  const { taille, frein, vitesses } = searchParams;
  const nbVitesses = typeof vitesses === "string" ? Number(vitesses) : NaN;
  return {
    tailleRoue: estTailleRoue(taille) ? taille : undefined,
    typeFrein: estTypeFrein(frein) ? frein : undefined,
    vitesses: estNbVitesses(nbVitesses) ? nbVitesses : undefined,
  };
}

const clesCriteres = ["tailleRoue", "typeFrein", "vitesses"] as const;

// Critères reçus en JSON (API de l'assistant). Contrairement à l'URL, toute valeur
// inconnue invalide l'ensemble : renvoie null. `null` vaut critère absent.
export function validerCriteres(valeur: unknown): Criteres | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) return null;
  const champs = valeur as Record<string, unknown>;
  if (Object.keys(champs).some((cle) => !(clesCriteres as readonly string[]).includes(cle))) {
    return null;
  }
  const { tailleRoue, typeFrein, vitesses } = champs;
  const absent = (v: unknown) => v === undefined || v === null;
  if (!absent(tailleRoue) && !estTailleRoue(tailleRoue)) return null;
  if (!absent(typeFrein) && !estTypeFrein(typeFrein)) return null;
  if (!absent(vitesses) && !estNbVitesses(vitesses)) return null;
  return {
    tailleRoue: estTailleRoue(tailleRoue) ? tailleRoue : undefined,
    typeFrein: estTypeFrein(typeFrein) ? typeFrein : undefined,
    vitesses: estNbVitesses(vitesses) ? vitesses : undefined,
  };
}

// Les critères fournis par l'utilisateur l'emportent sur ceux déduits de son message.
// `deduitsRetenus` ne garde que les déductions réellement utilisées, pour que
// l'interface les affiche et permette de les corriger.
export function fusionnerCriteres(
  fournis: Criteres,
  deduits: Criteres,
): { effectifs: Criteres; deduitsRetenus: Criteres } {
  const effectifs: Criteres = {};
  const deduitsRetenus: Criteres = {};
  for (const cle of clesCriteres) {
    if (fournis[cle] !== undefined) {
      Object.assign(effectifs, { [cle]: fournis[cle] });
    } else if (deduits[cle] !== undefined) {
      Object.assign(effectifs, { [cle]: deduits[cle] });
      Object.assign(deduitsRetenus, { [cle]: deduits[cle] });
    }
  }
  return { effectifs, deduitsRetenus };
}

export function aDesCriteres(criteres: Criteres): boolean {
  return Object.values(criteres).some((valeur) => valeur !== undefined);
}

// Une pièce qui ne déclare pas un critère n'en dépend pas : elle reste affichée.
export function filtrerPieces(pieces: Piece[], criteres: Criteres): Piece[] {
  return pieces.filter(
    ({ compatibilites }) => criteresIncompatibles(compatibilites, criteres).length === 0,
  );
}

// Ex. « roues 26 pouces », « freins Disque hydraulique », « 10 vitesses ».
export function decrireCritere(critere: keyof Criteres, criteres: Criteres): string {
  switch (critere) {
    case "tailleRoue":
      return `roues ${libellesTaillesRoue[criteres.tailleRoue!]}`;
    case "typeFrein":
      return `freins ${libellesTypesFrein[criteres.typeFrein!]}`;
    case "vitesses":
      return `${criteres.vitesses} vitesses`;
  }
}

// Tous les critères renseignés, ex. « roues 26 pouces, 10 vitesses ».
export function decrireCriteres(criteres: Criteres): string {
  return clesCriteres
    .filter((cle) => criteres[cle] !== undefined)
    .map((cle) => decrireCritere(cle, criteres))
    .join(", ");
}

// Critères de l'utilisateur que la pièce n'accepte pas (vide si elle est compatible).
export function criteresIncompatibles(
  compatibilites: Compatibilites,
  criteres: Criteres,
): (keyof Criteres)[] {
  const incompatibles: (keyof Criteres)[] = [];
  if (!accepte(compatibilites.taillesRoue, criteres.tailleRoue)) incompatibles.push("tailleRoue");
  if (!accepte(compatibilites.typesFrein, criteres.typeFrein)) incompatibles.push("typeFrein");
  if (!accepte(compatibilites.vitesses, criteres.vitesses)) incompatibles.push("vitesses");
  return incompatibles;
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
