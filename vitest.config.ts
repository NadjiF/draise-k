import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Même alias que tsconfig.json : @/* pointe vers la racine du dépôt.
  resolve: { alias: { "@": import.meta.dirname } },
  // Les tests *.gemini.test.ts appellent le vrai Gemini : voir vitest.gemini.config.ts.
  test: { exclude: [...configDefaults.exclude, "**/*.gemini.test.ts"] },
});
