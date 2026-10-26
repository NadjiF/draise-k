import Link from "next/link";
import { Suspense } from "react";
import { BoutonTheme } from "./bouton-theme";
import { LiensNav, NavPrincipale } from "./nav-principale";

export function EnTete() {
  // Le contour de focus prend la couleur du texte de l'en-tête : celle du primaire
  // se confondrait avec son fond.
  return (
    <header className="border-b-2 border-cuivre bg-entete text-sur-entete [&_:focus-visible]:outline-sur-entete">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          La Draise-K
        </Link>
        {/* items-start : sur mobile, la navigation passe sur deux lignes et le bouton reste
            aligné sur la première. */}
        <div className="flex items-start gap-1">
          <nav aria-label="Navigation principale">
            {/* usePathname suspend sur une URL non prérendue (ex. une pièce inconnue) :
                le fallback affiche les mêmes liens, sans page active. */}
            <Suspense fallback={<LiensNav />}>
              <NavPrincipale />
            </Suspense>
          </nav>
          <BoutonTheme />
        </div>
      </div>
    </header>
  );
}
