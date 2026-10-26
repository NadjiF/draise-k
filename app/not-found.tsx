import type { Metadata } from "next";
import Link from "next/link";

// La page 404 par défaut suit seulement prefers-color-scheme et ignore le thème choisi
// (data-theme) : celle-ci utilise la palette du site.
export const metadata: Metadata = {
  title: "Page introuvable",
};

const classeLien = "text-primaire underline underline-offset-2 hover:text-primaire-survol";

export default function PageIntrouvable() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-primaire">Page introuvable</h1>
      <p className="mt-4 max-w-2xl text-texte-doux">
        Cette page n’existe pas ou n’existe plus. La pièce que vous cherchez est peut-être dans
        le catalogue.
      </p>
      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/catalogue" className={classeLien}>
          Parcourir le catalogue
        </Link>
        <Link href="/" className={classeLien}>
          Revenir à l’accueil
        </Link>
      </p>
    </>
  );
}
