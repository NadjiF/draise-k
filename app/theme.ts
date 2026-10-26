// Mode d'affichage : sans choix mémorisé, le site suit prefers-color-scheme ; le bouton de
// l'en-tête force l'autre mode via data-theme sur <html> (cf. globals.css). Le choix reste dans
// le navigateur (localStorage) : le lire côté serveur rendrait toutes les pages dynamiques.

export type Mode = "clair" | "sombre";

export const CLE_THEME = "theme";

const valeursDataTheme = { clair: "light", sombre: "dark" } as const;

export function lireModeMemorise(): Mode | null {
  try {
    const valeur = localStorage.getItem(CLE_THEME);
    return valeur === "clair" || valeur === "sombre" ? valeur : null;
  } catch {
    return null;
  }
}

// Mode affiché : le choix posé sur <html>, sinon le réglage du système.
export function lireModeAffiche(): Mode {
  const dataTheme = document.documentElement.getAttribute("data-theme");
  if (dataTheme === valeursDataTheme.sombre) return "sombre";
  if (dataTheme === valeursDataTheme.clair) return "clair";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "sombre" : "clair";
}

export function appliquerMode(mode: Mode) {
  document.documentElement.setAttribute("data-theme", valeursDataTheme[mode]);
}

export function memoriserMode(mode: Mode) {
  try {
    localStorage.setItem(CLE_THEME, mode);
  } catch {
    // Stockage inaccessible (navigation privée stricte…) : le mode vaut pour cette page.
  }
}

// Exécuté pendant la lecture du HTML, avant le premier affichage : pas de flash quand le mode
// mémorisé diffère de celui du système. try/catch : localStorage peut être inaccessible.
export const scriptTheme = `(function(){try{var t=localStorage.getItem(${JSON.stringify(CLE_THEME)}),v=t==="clair"?"${valeursDataTheme.clair}":t==="sombre"?"${valeursDataTheme.sombre}":null;if(v)document.documentElement.setAttribute("data-theme",v)}catch(e){}})()`;
