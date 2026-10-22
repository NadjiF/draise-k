import { defineConfig } from "vitest/config";

// Tests avec le vrai Gemini (`npm run test:gemini`) : lents et soumis au quota.
export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: { include: ["**/*.gemini.test.ts"], testTimeout: 90_000 },
});
