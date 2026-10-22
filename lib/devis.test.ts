import { describe, expect, it } from "vitest";
import { etablirDevis, QUANTITE_MAX } from "@/lib/devis";

// Les tests utilisent le vrai catalogue (data/pieces.json) : ids et prix y sont définis.
const proposition = (id: string, quantite = 1) => ({ id, quantite, raison: `Raison ${id}` });

describe("etablirDevis", () => {
  it("calcule les prix et le total à partir du catalogue", () => {
    const devis = etablirDevis(
      [proposition("chambre-air-29", 2), proposition("kit-reparation-crevaison")],
      {},
    );
    expect(devis.lignes).toEqual([
      {
        id: "chambre-air-29",
        nom: "Chambre à air 29x2.10-2.40",
        categorie: "pneus-chambres",
        quantite: 2,
        prixUnitaireCentimes: 890,
        totalCentimes: 1780,
        raison: "Raison chambre-air-29",
        chemin: "/catalogue/pneus-chambres/chambre-air-29",
      },
      expect.objectContaining({ id: "kit-reparation-crevaison", totalCentimes: 790 }),
    ]);
    expect(devis.totalCentimes).toBe(2570);
    expect(devis.ecartees).toEqual([]);
  });

  it("renvoie un devis vide sans proposition", () => {
    expect(etablirDevis([], { tailleRoue: "29" })).toEqual({
      lignes: [],
      totalCentimes: 0,
      ecartees: [],
      idsInconnus: [],
    });
  });

  it("ignore les ids inconnus et les garde pour les journaux", () => {
    const devis = etablirDevis(
      [proposition("velo-electrique"), proposition("antivol-u")],
      {},
    );
    expect(devis.lignes.map((l) => l.id)).toEqual(["antivol-u"]);
    expect(devis.idsInconnus).toEqual(["velo-electrique"]);
    expect(devis.ecartees).toEqual([]);
    expect(devis.totalCentimes).toBe(4490);
  });

  it("regroupe les doublons en additionnant les quantités, dans la limite du maximum", () => {
    const devis = etablirDevis(
      [proposition("chambre-air-29", 2), proposition("chambre-air-29", 3)],
      {},
    );
    expect(devis.lignes).toHaveLength(1);
    expect(devis.lignes[0]).toMatchObject({ quantite: 5, totalCentimes: 4450 });
    expect(devis.lignes[0].raison).toBe("Raison chambre-air-29");

    const plafonne = etablirDevis(
      [proposition("chambre-air-29", 8), proposition("chambre-air-29", 8)],
      {},
    );
    expect(plafonne.lignes[0]).toMatchObject({ quantite: QUANTITE_MAX, totalCentimes: 8900 });
  });

  it.each([0, -1, 1.5, QUANTITE_MAX + 1, NaN])("écarte une quantité invalide (%s)", (quantite) => {
    const devis = etablirDevis([proposition("antivol-u", quantite)], {});
    expect(devis.lignes).toEqual([]);
    expect(devis.ecartees).toEqual([
      { id: "antivol-u", nom: "Antivol en U", motif: `Quantité invalide : ${quantite}` },
    ]);
  });

  it("écarte la roue dynamo sur un vélo à freins à disque", () => {
    const devis = etablirDevis(
      [proposition("roue-avant-dynamo-700c"), proposition("kit-eclairage-usb")],
      { typeFrein: "disque-hydraulique" },
    );
    expect(devis.lignes.map((l) => l.id)).toEqual(["kit-eclairage-usb"]);
    expect(devis.ecartees).toEqual([
      {
        id: "roue-avant-dynamo-700c",
        nom: "Roue avant 700c à moyeu dynamo",
        motif: "Incompatible avec votre vélo (freins Disque hydraulique)",
      },
    ]);
    expect(devis.totalCentimes).toBe(2990);
  });

  it("indique tous les critères incompatibles", () => {
    const devis = etablirDevis([proposition("roue-avant-dynamo-700c")], {
      tailleRoue: "26",
      typeFrein: "disque-mecanique",
    });
    expect(devis.ecartees[0].motif).toBe(
      "Incompatible avec votre vélo (roues 26 pouces, freins Disque mécanique)",
    );
  });

  it("écarte une pièce de transmission au mauvais nombre de vitesses", () => {
    const devis = etablirDevis(
      [proposition("chaine-9v"), proposition("plateau-mono-32d")],
      { vitesses: 10 },
    );
    expect(devis.lignes.map((l) => l.id)).toEqual(["plateau-mono-32d"]);
    expect(devis.ecartees[0]).toMatchObject({
      id: "chaine-9v",
      motif: "Incompatible avec votre vélo (10 vitesses)",
    });
  });

  it("garde une pièce qui ne dépend pas du critère connu", () => {
    const devis = etablirDevis([proposition("pompe-a-pied")], {
      tailleRoue: "20",
      typeFrein: "v-brake",
      vitesses: 7,
    });
    expect(devis.lignes.map((l) => l.id)).toEqual(["pompe-a-pied"]);
  });

  it("garde une pièce dont les critères sont inconnus", () => {
    const devis = etablirDevis([proposition("roue-avant-dynamo-700c")], {});
    expect(devis.lignes.map((l) => l.id)).toEqual(["roue-avant-dynamo-700c"]);
  });

  it("ne signale pas comme écartée une pièce retenue par une autre proposition", () => {
    const devis = etablirDevis(
      [proposition("antivol-u", 0), proposition("antivol-u", 1)],
      {},
    );
    expect(devis.lignes.map((l) => l.id)).toEqual(["antivol-u"]);
    expect(devis.ecartees).toEqual([]);
  });
});
