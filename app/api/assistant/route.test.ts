import { ApiError } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/assistant/route";
import { DELAI_MS, LONGUEUR_MAX_MESSAGE } from "@/lib/assistant";
import { MAX_REQUETES } from "@/lib/limiteur";

// Gemini est simulé : seule la classe GoogleGenAI est remplacée, le reste du SDK
// (dont ApiError) est le vrai. Aucun appel réseau n'est fait.
const generateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

// Une adresse IP par requête pour que la limite de débit ne lie pas les tests entre eux.
let numeroIp = 0;
function requete(corps: unknown, ip = `10.0.0.${++numeroIp}`) {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof corps === "string" ? corps : JSON.stringify(corps),
  });
}

function reponseModele(contenu: object) {
  return { text: JSON.stringify({ pieces: [], nonCouvert: [], criteresDeduits: {}, ...contenu }) };
}

async function erreurDe(reponse: Response) {
  return ((await reponse.json()) as { erreur: { code: string } }).erreur.code;
}

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "cle-de-test");
  generateContent.mockReset();
  generateContent.mockResolvedValue(reponseModele({ message: "Bonjour" }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/assistant : requêtes invalides", () => {
  it.each([
    ["JSON invalide", "{ message: "],
    ["corps qui n'est pas un objet", ["message"]],
    ["message absent", {}],
    ["message vide", { message: "" }],
    ["message fait d'espaces", { message: "   " }],
    ["message qui n'est pas du texte", { message: 42 }],
    ["critère inconnu", { message: "Un pneu", criteres: { tailleRoue: "28" } }],
    ["clé de critère inconnue", { message: "Un pneu", criteres: { taille: "29" } }],
  ])("%s → 400", async (_, corps) => {
    const reponse = await POST(requete(corps));
    expect(reponse.status).toBe(400);
    expect(await erreurDe(reponse)).toBe("requete_invalide");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it(`${LONGUEUR_MAX_MESSAGE + 1} caractères → 413`, async () => {
    const reponse = await POST(requete({ message: "a".repeat(LONGUEUR_MAX_MESSAGE + 1) }));
    expect(reponse.status).toBe(413);
    expect(await erreurDe(reponse)).toBe("message_trop_long");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it(`${LONGUEUR_MAX_MESSAGE} caractères, dont des emojis → accepté`, async () => {
    const reponse = await POST(requete({ message: "🚲".repeat(LONGUEUR_MAX_MESSAGE) }));
    expect(reponse.status).toBe(200);
  });
});

describe("POST /api/assistant : limitation du nombre de requêtes", () => {
  it(`la ${MAX_REQUETES + 1}e requête dans la minute → 429 avec Retry-After`, async () => {
    for (let i = 0; i < MAX_REQUETES; i++) {
      expect((await POST(requete({ message: "Un pneu" }, "192.168.1.1"))).status).toBe(200);
    }
    const reponse = await POST(requete({ message: "Un pneu" }, "192.168.1.1"));
    expect(reponse.status).toBe(429);
    expect(await erreurDe(reponse)).toBe("trop_de_requetes");
    const reessayer = Number(reponse.headers.get("Retry-After"));
    expect(reessayer).toBeGreaterThan(0);
    expect(reessayer).toBeLessThanOrEqual(60);
    expect(generateContent).toHaveBeenCalledTimes(MAX_REQUETES);

    // Les autres clients ne sont pas concernés.
    expect((await POST(requete({ message: "Un pneu" }, "192.168.1.2"))).status).toBe(200);
  });
});

describe("POST /api/assistant : erreurs de Gemini", () => {
  it("quota dépassé (429 de Gemini) → 503", async () => {
    generateContent.mockRejectedValue(
      new ApiError({ message: "Resource has been exhausted", status: 429 }),
    );
    const reponse = await POST(requete({ message: "Un pneu" }));
    expect(reponse.status).toBe(503);
    expect(await erreurDe(reponse)).toBe("quota_depasse");
  });

  it("texte non JSON → 502", async () => {
    generateContent.mockResolvedValue({ text: "Voici les pièces que je vous conseille." });
    const reponse = await POST(requete({ message: "Un pneu" }));
    expect(reponse.status).toBe(502);
    expect(await erreurDe(reponse)).toBe("reponse_invalide");
  });

  it("JSON qui ne respecte pas le schéma → 502", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ pieces: "antivol-u" }) });
    const reponse = await POST(requete({ message: "Un antivol" }));
    expect(reponse.status).toBe(502);
    expect(await erreurDe(reponse)).toBe("reponse_invalide");
  });

  it("délai dépassé → 504", async () => {
    vi.useFakeTimers();
    // Ne répond jamais, sauf annulation par le serveur.
    generateContent.mockImplementation(
      ({ config }: { config: { abortSignal: AbortSignal } }) =>
        new Promise((_, rejeter) =>
          config.abortSignal.addEventListener("abort", () => rejeter(new Error("aborted"))),
        ),
    );
    const promesse = POST(requete({ message: "Un pneu" }));
    await vi.waitFor(() => expect(generateContent).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(DELAI_MS);
    const reponse = await promesse;
    expect(reponse.status).toBe(504);
    expect(await erreurDe(reponse)).toBe("delai_depasse");
  });

  it("clé absente → 500, sans appel à Gemini", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const reponse = await POST(requete({ message: "Un pneu" }));
    expect(reponse.status).toBe(500);
    expect(await erreurDe(reponse)).toBe("erreur_interne");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("erreur imprévue → 500", async () => {
    generateContent.mockRejectedValue(new TypeError("fetch failed"));
    const reponse = await POST(requete({ message: "Un pneu" }));
    expect(reponse.status).toBe(500);
    expect(await erreurDe(reponse)).toBe("erreur_interne");
  });
});

describe("POST /api/assistant : devis", () => {
  it("cas 1b : la roue dynamo proposée malgré des freins à disque est écartée", async () => {
    generateContent.mockResolvedValue(
      reponseModele({
        message: "Voici une roue dynamo et un kit USB.",
        pieces: [
          { id: "roue-avant-dynamo-700c", quantite: 1, raison: "Éclairage dynamo" },
          { id: "kit-eclairage-usb", quantite: 1, raison: "Éclairage sans dynamo" },
        ],
      }),
    );
    const reponse = await POST(
      requete({
        message: "Je voudrais un éclairage dynamo",
        criteres: { typeFrein: "disque-hydraulique" },
      }),
    );
    expect(reponse.status).toBe(200);
    const corps = await reponse.json();
    expect(corps.ecartees).toEqual([
      {
        id: "roue-avant-dynamo-700c",
        nom: "Roue avant 700c à moyeu dynamo",
        motif: "Incompatible avec votre vélo (freins Disque hydraulique)",
      },
    ]);
    expect(corps.lignes.map((l: { id: string }) => l.id)).toEqual(["kit-eclairage-usb"]);
    expect(corps.totalCentimes).toBe(2990);
    expect(corps.criteres).toEqual({ typeFrein: "disque-hydraulique" });
  });

  it("renvoie les critères déduits et s'en sert pour vérifier les compatibilités", async () => {
    generateContent.mockResolvedValue(
      reponseModele({
        message: "Une chambre 700c convient à un vélo 28 pouces.",
        pieces: [
          { id: "chambre-air-700c-presta", quantite: 1, raison: "28 pouces = 700c" },
          { id: "chambre-air-29", quantite: 1, raison: "Erreur du modèle" },
          { id: "chambre-air-inventee", quantite: 1, raison: "Id inventé" },
        ],
        criteresDeduits: { tailleRoue: "700c" },
      }),
    );
    const corps = await (
      await POST(requete({ message: "Chambre à air pour mon vélo 28 pouces" }))
    ).json();
    expect(corps.criteresDeduits).toEqual({ tailleRoue: "700c" });
    expect(corps.criteres).toEqual({ tailleRoue: "700c" });
    expect(corps.lignes.map((l: { id: string }) => l.id)).toEqual(["chambre-air-700c-presta"]);
    expect(corps.ecartees.map((e: { id: string }) => e.id)).toEqual(["chambre-air-29"]);
    expect(corps.totalCentimes).toBe(790);
  });

  it("renvoie la question du modèle sans pièce", async () => {
    generateContent.mockResolvedValue(
      reponseModele({
        message: "Je peux vous aider.",
        question: "Combien de vitesses a votre vélo ?",
      }),
    );
    const corps = await (await POST(requete({ message: "Je veux changer ma chaîne" }))).json();
    expect(corps).toMatchObject({
      question: "Combien de vitesses a votre vélo ?",
      lignes: [],
      totalCentimes: 0,
    });
  });

  it("transmet au modèle le message, les critères connus et le format JSON imposé", async () => {
    await POST(requete({ message: "  Un pneu  ", criteres: { tailleRoue: "29" } }));
    const [{ contents, config }] = generateContent.mock.calls[0];
    expect(contents).toContain('{"tailleRoue":"29"}');
    expect(contents).toContain("Un pneu");
    expect(config.responseMimeType).toBe("application/json");
    expect(config.responseJsonSchema.required).toContain("criteresDeduits");
  });
});
