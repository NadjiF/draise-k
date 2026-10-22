import Link from "next/link";
import { Suspense } from "react";
import { LiensNav, NavPrincipale } from "./nav-principale";

export function EnTete() {
  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          La Draise-K
        </Link>
        <nav aria-label="Navigation principale">
          {/* usePathname suspend sur une URL non prérendue (ex. une pièce inconnue) :
              le fallback affiche les mêmes liens, sans page active. */}
          <Suspense fallback={<LiensNav />}>
            <NavPrincipale />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
