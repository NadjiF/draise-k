import { defineConfig } from "vitest/config";

export default defineConfig({
  // Même alias que tsconfig.json : @/* pointe vers la racine du dépôt.
  resolve: { alias: { "@": import.meta.dirname } },
});
