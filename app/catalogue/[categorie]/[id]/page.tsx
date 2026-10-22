import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Piece } from "@/types/piece";
import { getPieceById, getPieces, libellesCategories } from "@/lib/pieces";
import { formaterPrix } from "@/lib/prix";
import { decrireCompatibilites } from "@/lib/criteres";

// Les 25 fiches sont prérendues au build.
export function generateStaticParams() {
  return getPieces().map(({ categorie, id }) => ({ categorie, id }));
}

// La pièce doit exister et être demandée sous sa propre catégorie :
// /catalogue/eclairage/patins-v-brake ne doit pas dupliquer la fiche.
function trouverPiece(categorie: string, id: string): Piece | undefined {
  const piece = getPieceById(id);
  return piece?.categorie === categorie ? piece : undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/catalogue/[categorie]/[id]">): Promise<Metadata> {
  const { categorie, id } = await params;
  const piece = trouverPiece(categorie, id);
  return piece ? { title: piece.nom, description: piece.description } : {};
}

// Même schéma que la page catégorie : params est lu sous la Suspense, résolue au
// build pour les fiches prérendues.
export default function PiecePage({ params }: PageProps<"/catalogue/[categorie]/[id]">) {
  return (
    <Suspense>
      {params.then(({ categorie, id }) => {
        const piece = trouverPiece(categorie, id);
        return piece ? <FichePiece piece={piece} /> : notFound();
      })}
    </Suspense>
  );
}

function FichePiece({ piece }: { piece: Piece }) {
  const libelleCategorie = libellesCategories[piece.categorie];
  const cheminCategorie = `/catalogue/${piece.categorie}`;
  const compatibilites = decrireCompatibilites(piece.compatibilites);

  return (
    <article>
      <nav aria-label="Fil d’Ariane" className="text-sm text-zinc-600 dark:text-zinc-400">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/catalogue" className="underline">
              Catalogue
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={cheminCategorie} prefetch={true} className="underline">
              {libelleCategorie}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page">{piece.nom}</li>
        </ol>
      </nav>

      <p className="mt-8 text-xs uppercase tracking-wide text-zinc-500">{libelleCategorie}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{piece.nom}</h1>
      <p className="mt-4 text-2xl font-semibold">{formaterPrix(piece.prixCentimes)}</p>
      <p className="mt-6 max-w-2xl text-zinc-600 dark:text-zinc-400">{piece.description}</p>

      <h2 className="mt-10 text-xl font-semibold">Compatibilités</h2>
      {compatibilites.length > 0 ? (
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-2">
          {compatibilites.map(({ critere, valeurs }) => (
            <div key={critere} className="contents">
              <dt className="font-medium">{critere} :</dt>
              <dd>{valeurs}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4">Compatible avec tous les vélos.</p>
      )}

      <p className="mt-10">
        <Link href={cheminCategorie} prefetch={true} className="underline">
          <span aria-hidden="true">← </span>Retour à {libelleCategorie}
        </Link>
      </p>
    </article>
  );
}
