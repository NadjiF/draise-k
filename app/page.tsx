import Link from "next/link";

const classeAcces =
  "flex h-full flex-col gap-1 rounded-lg border border-cuivre/50 bg-surface p-6 transition-[border-color,box-shadow] hover:border-cuivre hover:shadow-md hover:shadow-cuivre/15";

export default function Accueil() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-primaire">La Draise-K</h1>
      <p className="mt-4 max-w-2xl text-lg text-texte-doux">
        Des pièces détachées pour entretenir et réparer votre vélo : freinage, transmission,
        pneus, éclairage et accessoires. Indiquez la taille de vos roues, votre type de frein
        ou votre nombre de vitesses, et ne voyez que les pièces qui vous conviennent.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        <li>
          <Link href="/catalogue" className={classeAcces}>
            <span className="text-lg font-medium text-primaire">Parcourir le catalogue</span>
            <span className="text-sm text-texte-doux">
              Toutes les pièces par catégorie, filtrables selon votre vélo.
            </span>
          </Link>
        </li>
        <li>
          <Link href="/assistant" className={classeAcces}>
            <span className="text-lg font-medium text-primaire">Demander à l’assistant</span>
            <span className="text-sm text-texte-doux">
              Décrivez votre besoin, l’assistant vous oriente vers les bonnes pièces.
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}
