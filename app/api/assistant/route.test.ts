import { ApiError } from "@google/genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/assistant/route";
import { DELAI_MS, LONGUEUR_MAX_MESSAGE, QUESTION_PAR_DEFAUT } from "@/lib/assistant";
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

// Par défaut, une réponse cohérente sans pièce : « hors_sujet » n'exige rien d'autre.
function reponseModele(contenu: object) {
  return {
    text: JSON.stringify({
      intention: "hors_sujet",
      pieces: [],
      nonCouvert: [],
      criteresDeduits: {},
      ...contenu,
    }),
  };
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

  it("modèle saturé (503 de Gemini) → 503", async () => {
    generateContent.mockRejectedValue(
      new ApiError({ message: "This model is currently experiencing high demand.", status: 503 }),
    );
    const reponse = await POST(requete({ message: "Un pneu" }));
    expect(reponse.status).toBe(503);
    expect(await reponse.json()).toEqual({
      erreur: {
        code: "service_indisponible",
        message: "L’assistant est momentanément indisponible. Réessayez dans quelques instants.",
      },
    });
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
        intention: "devis",
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
    expect(corps.intention).toBe("devis");
    expect(corps.criteres).toEqual({ typeFrein: "disque-hydraulique" });
  });

  it("renvoie les critères déduits et s'en sert pour vérifier les compatibilités", async () => {
    generateContent.mockResolvedValue(
      reponseModele({
        intention: "devis",
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
        intention: "question",
        message: "Je peux vous aider.",
        question: "Combien de vitesses a votre vélo ?",
      }),
    );
    const corps = await (await POST(requete({ message: "Je veux changer ma chaîne" }))).json();
    expect(corps).toMatchObject({
      intention: "question",
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
    expect(config.responseJsonSchema.required).toContain("intention");
    expect(config.responseJsonSchema.properties.intention.enum).toEqual([
      "devis",
      "question",
      "non_couvert",
      "hors_sujet",
    ]);
  });
});

describe("POST /api/assistant : catalogue filtré", () => {
  function catalogueEnvoye() {
    const [{ config }] = generateContent.mock.calls[0];
    return {
      instructions: config.systemInstruction as string,
      ids: config.responseJsonSchema.properties.pieces.items.properties.id.enum as string[],
    };
  }

  it("avec des critères connus, n'envoie que les pièces compatibles", async () => {
    await POST(requete({ message: "Un éclairage", criteres: { typeFrein: "disque-hydraulique" } }));
    const { instructions, ids } = catalogueEnvoye();
    expect(ids).not.toContain("roue-avant-dynamo-700c");
    expect(ids).not.toContain("patins-v-brake");
    expect(ids).toContain("plaquettes-disque-resine");
    expect(ids).toContain("kit-eclairage-usb"); // sans critère : convient à tous
    expect(instructions).not.toContain("roue-avant-dynamo-700c");
    expect(instructions).toContain("ne contient QUE les pièces compatibles");
    expect(instructions).toContain("(freins Disque hydraulique)");
  });

  it("indique au modèle tous les critères ayant servi au filtre", async () => {
    await POST(
      requete({ message: "Une chaîne", criteres: { tailleRoue: "26", vitesses: 10 } }),
    );
    expect(catalogueEnvoye().instructions).toContain("(roues 26 pouces, 10 vitesses)");
  });

  it("sans critère, envoie tout le catalogue", async () => {
    await POST(requete({ message: "Un éclairage" }));
    const { instructions, ids } = catalogueEnvoye();
    expect(ids).toHaveLength(25);
    expect(ids).toContain("roue-avant-dynamo-700c");
    expect(instructions).not.toContain("ne contient QUE les pièces compatibles");
  });

  it("filtre avec les critères fournis, pas avec ceux que le modèle déduira", async () => {
    await POST(requete({ message: "Chaîne pour mon 10 vitesses", criteres: { vitesses: 10 } }));
    const { ids } = catalogueEnvoye();
    expect(ids).not.toContain("chaine-9v");
    expect(ids).not.toContain("chaine-11v");
    expect(ids).toContain("cassette-10v-11-32");
    expect(ids).toContain("chambre-air-29"); // ne dépend pas des vitesses
  });
});

describe("POST /api/assistant : intention", () => {
  async function envoyer(contenu: object, criteres?: object) {
    generateContent.mockResolvedValue(reponseModele({ message: "Message du modèle.", ...contenu }));
    const reponse = await POST(requete({ message: "Ma demande", criteres }));
    expect(reponse.status).toBe(200);
    return reponse.json();
  }

  it.each([
    ["devis", { pieces: [{ id: "antivol-u", quantite: 1, raison: "Sécurité" }] }],
    ["question", { question: "Combien de vitesses a votre vélo ?" }],
    ["non_couvert", { nonCouvert: ["Selle"] }],
    ["hors_sujet", {}],
  ])("intention cohérente « %s » renvoyée telle quelle", async (intention, contenu) => {
    const corps = await envoyer({ intention, ...contenu });
    expect(corps.intention).toBe(intention);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["question sans question", { intention: "question" }],
    ["question vide", { intention: "question", question: "  " }],
    ["devis sans pièce", { intention: "devis" }],
    [
      "devis dont la seule pièce est inconnue",
      { intention: "devis", pieces: [{ id: "selle-gel", quantite: 1, raison: "Confort" }] },
    ],
    ["non_couvert sans nonCouvert", { intention: "non_couvert" }],
    ["intention absente", { intention: undefined }],
    ["intention inconnue", { intention: "salutation" }],
  ])("%s → traitée comme une question, avec le message conservé", async (_, contenu) => {
    const corps = await envoyer(contenu);
    expect(corps).toMatchObject({
      intention: "question",
      message: "Message du modèle.",
      question: QUESTION_PAR_DEFAUT,
    });
    expect(console.warn).toHaveBeenCalledWith(
      "Réponse incohérente du modèle, traitée comme une question :",
      expect.anything(),
    );
  });

  it("devis dont toutes les pièces sont écartées → question, écartées toujours renvoyées", async () => {
    const corps = await envoyer(
      {
        intention: "devis",
        pieces: [{ id: "roue-avant-dynamo-700c", quantite: 1, raison: "Dynamo" }],
      },
      { typeFrein: "disque-mecanique" },
    );
    expect(corps).toMatchObject({ intention: "question", question: QUESTION_PAR_DEFAUT, lignes: [] });
    expect(corps.ecartees.map((e: { id: string }) => e.id)).toEqual(["roue-avant-dynamo-700c"]);
  });

  it("incohérente mais avec une question du modèle → garde sa question", async () => {
    const corps = await envoyer({
      intention: "non_couvert",
      question: "Quelle taille de roue avez-vous ?",
    });
    expect(corps).toMatchObject({
      intention: "question",
      question: "Quelle taille de roue avez-vous ?",
    });
  });
});
