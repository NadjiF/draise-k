import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/assistant/route";

// Test de bout en bout avec le vrai Gemini : consomme du quota et prend 10 à 20 s par
// appel. Exclu de `npm test`, lancé par `npm run test:gemini` (vitest.gemini.config.ts).
// Le modèle n'est pas déterministe : un échec isolé peut venir d'une réponse
// inhabituelle, les réponses complètes sont affichées pour en juger.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function appeler(corps: object) {
  const reponse = await POST(
    new Request("http://localhost/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
      body: JSON.stringify(corps),
    }),
  );
  const contenu = await reponse.json();
  console.log(`→ ${JSON.stringify(corps)}\n← ${reponse.status} ${JSON.stringify(contenu, null, 2)}`);
  expect(reponse.status).toBe(200);
  return contenu;
}

describe.skipIf(!process.env.GEMINI_API_KEY)("Assistant avec le vrai Gemini", () => {
  it("chaîne → question sur les vitesses → « 9 vitesses » → devis avec chaine-9v", async () => {
    const demande = "Je veux changer ma chaîne";

    const premiere = await appeler({ message: demande });
    expect(premiere.intention).toBe("question");
    expect(premiere.question).toMatch(/vitesse/i);
    expect(premiere.lignes).toEqual([]);

    const seconde = await appeler({
      message: demande,
      echanges: [{ question: premiere.question, reponse: "9 vitesses" }],
    });
    expect(seconde.intention).toBe("devis");
    expect(seconde.criteresDeduits).toMatchObject({ vitesses: 9 });
    const ids = seconde.lignes.map((ligne: { id: string }) => ligne.id);
    expect(ids).toContain("chaine-9v");
    expect(ids).not.toContain("chaine-11v");
    expect(seconde.totalCentimes).toBeGreaterThan(0);
  });
});
