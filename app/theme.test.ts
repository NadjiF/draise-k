import { afterEach, describe, expect, it, vi } from "vitest";
import { scriptTheme } from "@/app/theme";

// Le script de <head> est une chaîne : ni TypeScript ni le lint ne le vérifient.
// On l'exécute avec un faux document et un faux localStorage.
function executer(stocke: string | null | Error) {
  const attributs = new Map<string, string>();
  vi.stubGlobal("document", {
    documentElement: { setAttribute: (nom: string, valeur: string) => attributs.set(nom, valeur) },
  });
  vi.stubGlobal("localStorage", {
    getItem: () => {
      if (stocke instanceof Error) throw stocke;
      return stocke;
    },
  });
  new Function(scriptTheme)();
  return attributs.get("data-theme");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scriptTheme", () => {
  it("force le thème choisi", () => {
    expect(executer("clair")).toBe("light");
    expect(executer("sombre")).toBe("dark");
  });

  it("laisse le système décider sans choix ou avec une valeur inconnue", () => {
    expect(executer(null)).toBeUndefined();
    expect(executer("systeme")).toBeUndefined();
    expect(executer("constructor")).toBeUndefined();
  });

  it("ne lève pas d'erreur si le stockage est inaccessible", () => {
    expect(executer(new Error("SecurityError"))).toBeUndefined();
  });
});
