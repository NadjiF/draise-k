import { describe, expect, it } from "vitest";
import {
  decrireCriteres,
  fusionnerCriteres,
  parserCriteres,
  validerCriteres,
} from "@/lib/criteres";

describe("validerCriteres", () => {
  it("accepte des critères complets ou partiels", () => {
    expect(validerCriteres({ tailleRoue: "700c", typeFrein: "etrier", vitesses: 11 })).toEqual({
      tailleRoue: "700c",
      typeFrein: "etrier",
      vitesses: 11,
    });
    expect(validerCriteres({ typeFrein: "v-brake" })).toEqual({ typeFrein: "v-brake" });
    expect(validerCriteres({})).toEqual({});
  });

  it("traite null comme un critère absent", () => {
    expect(validerCriteres({ tailleRoue: null, vitesses: 9 })).toEqual({ vitesses: 9 });
  });

  it.each([
    ["taille inconnue", { tailleRoue: "28" }],
    ["frein inconnu", { typeFrein: "tambour" }],
    ["vitesses en texte", { vitesses: "9" }],
    ["vitesses non entières", { vitesses: 9.5 }],
    ["vitesses nulles", { vitesses: 0 }],
    ["clé inconnue", { taille: "29" }],
    ["tableau", ["29"]],
    ["texte", "29"],
    ["null", null],
  ])("refuse : %s", (_, valeur) => {
    expect(validerCriteres(valeur)).toBeNull();
  });
});

describe("parserCriteres", () => {
  it("garde son comportement : valeurs inconnues ignorées", () => {
    expect(parserCriteres({ taille: "28", frein: "v-brake", vitesses: "9" })).toEqual({
      typeFrein: "v-brake",
      vitesses: 9,
    });
  });
});

describe("decrireCriteres", () => {
  it("décrit les critères renseignés dans un ordre fixe", () => {
    expect(
      decrireCriteres({ vitesses: 9, typeFrein: "v-brake", tailleRoue: "700c" }),
    ).toBe("roues 700c (route), freins V-Brake, 9 vitesses");
    expect(decrireCriteres({ vitesses: 10 })).toBe("10 vitesses");
    expect(decrireCriteres({})).toBe("");
  });
});

describe("fusionnerCriteres", () => {
  it("donne la priorité aux critères fournis et ne renvoie que les déductions utilisées", () => {
    expect(
      fusionnerCriteres(
        { tailleRoue: "26" },
        { tailleRoue: "29", typeFrein: "v-brake" },
      ),
    ).toEqual({
      effectifs: { tailleRoue: "26", typeFrein: "v-brake" },
      deduitsRetenus: { typeFrein: "v-brake" },
    });
  });

  it("sans déduction, renvoie les critères fournis", () => {
    expect(fusionnerCriteres({ vitesses: 9 }, {})).toEqual({
      effectifs: { vitesses: 9 },
      deduitsRetenus: {},
    });
  });
});
