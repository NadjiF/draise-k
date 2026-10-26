"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  appliquerMode,
  CLE_THEME,
  lireModeAffiche,
  lireModeMemorise,
  memoriserMode,
  type Mode,
} from "./theme";

const EVENEMENT = "changement-theme";

function abonner(notifier: () => void) {
  const systeme = matchMedia("(prefers-color-scheme: dark)");
  // Un choix fait dans un autre onglet s'applique aussi à celui-ci.
  function depuisAutreOnglet(evenement: StorageEvent) {
    if (evenement.key !== CLE_THEME) return;
    const mode = lireModeMemorise();
    if (mode) appliquerMode(mode);
    notifier();
  }
  systeme.addEventListener("change", notifier);
  window.addEventListener("storage", depuisAutreOnglet);
  window.addEventListener(EVENEMENT, notifier);
  return () => {
    systeme.removeEventListener("change", notifier);
    window.removeEventListener("storage", depuisAutreOnglet);
    window.removeEventListener(EVENEMENT, notifier);
  };
}

// L'icône est choisie en CSS (variante dark:, qui suit data-theme et le système) : elle est
// juste dès le premier affichage. Le libellé dépend de JavaScript : le serveur ne connaît pas
// le mode, il rend celui du mode clair, corrigé à l'hydratation, quand le bouton devient actif.
export function BoutonTheme() {
  const mode = useSyncExternalStore<Mode>(abonner, lireModeAffiche, () => "clair");

  // En développement, le remontage du Strict Mode efface data-theme posé par le script
  // (cf. guide preventing-flash-before-hydration) ; sans effet en production.
  useLayoutEffect(() => {
    const memorise = lireModeMemorise();
    if (memorise) appliquerMode(memorise);
  }, []);

  function basculer() {
    const suivant: Mode = lireModeAffiche() === "sombre" ? "clair" : "sombre";
    memoriserMode(suivant);
    appliquerMode(suivant);
    window.dispatchEvent(new Event(EVENEMENT));
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={mode === "sombre" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="rounded-md p-1.5 hover:bg-sur-entete/10"
    >
      <IconeLune className="size-5 dark:hidden" />
      <IconeSoleil className="hidden size-5 dark:block" />
    </button>
  );
}

function IconeLune({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.6 6.6 0 0 0 10.6 10.6Z" />
    </svg>
  );
}

function IconeSoleil({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
