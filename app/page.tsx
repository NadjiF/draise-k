import Link from "next/link";

const classeAcces =
  "flex flex-col gap-1 rounded-lg border border-black/[.08] p-6 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]";

export default function Accueil() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">La Draise-K</h1>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
        Des pièces détachées pour entretenir et réparer votre vélo : freinage, transmission,
        pneus, éclairage et accessoires. Indiquez la taille de vos roues, votre type de frein
        ou votre nombre de vitesses, et ne voyez que les pièces qui vous conviennent.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        <li>
          <Link href="/catalogue" className={classeAcces}>
            <span className="text-lg font-medium">Parcourir le catalogue</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Toutes les pièces par catégorie, filtrables selon votre vélo.
            </span>
          </Link>
        </li>
        <li>
          <Link href="/assistant" className={classeAcces}>
            <span className="text-lg font-medium">Demander à l’assistant</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Décrivez votre besoin, l’assistant vous oriente vers les bonnes pièces.
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}
