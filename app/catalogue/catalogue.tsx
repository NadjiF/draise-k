import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import type { Categorie, Piece } from "@/types/piece";
import { cheminPiece, getPiecesParCategorie, libellesCategories } from "@/lib/pieces";
import { formaterPrix } from "@/lib/prix";
import {
  type Criteres,
  aDesCriteres,
  filtrerPieces,
  libellesTaillesRoue,
  libellesTypesFrein,
  parserCriteres,
  valeursDisponibles,
} from "@/lib/criteres";

type SearchParams = PageProps<"/catalogue">["searchParams"];

// La catégorie vient du chemin : la page est prérendue en entier, liste comprise,
// et reste lisible sans JavaScript. Les critères secondaires viennent de l'URL
// (?taille=29) et ne peuvent être lus qu'à la requête : le fallback de la Suspense
// affiche donc la liste non filtrée, et c'est ce que voit un navigateur sans JS.
export function Catalogue({
  categorie,
  searchParams,
}: {
  categorie?: Categorie;
  searchParams: SearchParams;
}) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-primaire">
        {categorie ? libellesCategories[categorie] : "Catalogue"}
      </h1>
      <NavCategories actif={categorie} />
      <Suspense fallback={<ListePieces pieces={getPiecesParCategorie(categorie)} />}>
        <ResultatsFiltres categorie={categorie} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResultatsFiltres({
  categorie,
  searchParams,
}: {
  categorie?: Categorie;
  searchParams: SearchParams;
}) {
  const criteres = parserCriteres(await searchParams);
  return <ResultatsEnCache categorie={categorie} criteres={criteres} />;
}

// Mis en cache par (catégorie, critères) : un lien prefetch={true} récupère ce
// résultat avant le clic.
async function ResultatsEnCache({
  categorie,
  criteres,
}: {
  categorie?: Categorie;
  criteres: Criteres;
}) {
  "use cache";
  const pieces = getPiecesParCategorie(categorie);
  return (
    <>
      <FormulaireCriteres categorie={categorie} pieces={pieces} criteres={criteres} />
      <ListePieces pieces={filtrerPieces(pieces, criteres)} filtre={aDesCriteres(criteres)} />
    </>
  );
}

function cheminCategorie(categorie?: Categorie): string {
  return categorie ? `/catalogue/${categorie}` : "/catalogue";
}

const categories = Object.keys(libellesCategories) as Categorie[];

function NavCategories({ actif }: { actif?: Categorie }) {
  const liens = [
    { href: cheminCategorie(), libelle: "Toutes", estActif: actif === undefined },
    ...categories.map((categorie) => ({
      href: cheminCategorie(categorie),
      libelle: libellesCategories[categorie],
      estActif: actif === categorie,
    })),
  ];

  return (
    <nav aria-label="Catégories" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        {liens.map(({ href, libelle, estActif }) => (
          <li key={href}>
            <Link
              href={href}
              prefetch={true}
              aria-current={estActif ? "page" : undefined}
              className="inline-block rounded-full border border-texte-doux/30 px-4 py-1.5 text-sm transition-colors hover:bg-surface-alt aria-[current=page]:border-transparent aria-[current=page]:bg-primaire aria-[current=page]:text-sur-primaire"
            >
              {libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const classeSelect =
  "rounded-md border border-texte-doux bg-surface px-3 py-1.5 text-sm";

function FormulaireCriteres({
  categorie,
  pieces,
  criteres,
}: {
  categorie?: Categorie;
  pieces: Piece[];
  criteres: Criteres;
}) {
  const { taillesRoue, typesFrein, vitesses } = valeursDisponibles(pieces);
  if (taillesRoue.length + typesFrein.length + vitesses.length === 0) return null;

  return (
    // key : les defaultValue doivent suivre l'URL après une navigation client.
    <Form
      key={JSON.stringify(criteres)}
      action={cheminCategorie(categorie)}
      aria-label="Compatibilité avec mon vélo"
      className="mt-6 flex flex-wrap items-end gap-4"
    >
      {taillesRoue.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Taille de roue
          <select name="taille" defaultValue={criteres.tailleRoue ?? ""} className={classeSelect}>
            <option value="">Toutes</option>
            {taillesRoue.map((taille) => (
              <option key={taille} value={taille}>
                {libellesTaillesRoue[taille]}
              </option>
            ))}
          </select>
        </label>
      )}
      {typesFrein.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Type de frein
          <select name="frein" defaultValue={criteres.typeFrein ?? ""} className={classeSelect}>
            <option value="">Tous</option>
            {typesFrein.map((type) => (
              <option key={type} value={type}>
                {libellesTypesFrein[type]}
              </option>
            ))}
          </select>
        </label>
      )}
      {vitesses.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Vitesses
          <select name="vitesses" defaultValue={criteres.vitesses ?? ""} className={classeSelect}>
            <option value="">Toutes</option>
            {vitesses.map((nb) => (
              <option key={nb} value={nb}>
                {nb} vitesses
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="submit"
        className="rounded-full bg-primaire px-4 py-1.5 text-sm text-sur-primaire transition-colors hover:bg-primaire-survol"
      >
        Filtrer
      </button>
      {aDesCriteres(criteres) && (
        <Link
          href={cheminCategorie(categorie)}
          prefetch={true}
          className="py-1.5 text-sm text-primaire underline underline-offset-2 hover:text-primaire-survol"
        >
          Réinitialiser
        </Link>
      )}
    </Form>
  );
}

function ListePieces({ pieces, filtre = false }: { pieces: Piece[]; filtre?: boolean }) {
  const pluriel = pieces.length > 1 ? "s" : "";
  return (
    <>
      <p className="mt-6 text-sm text-texte-doux" aria-live="polite">
        {pieces.length} pièce{pluriel}
        {filtre && ` compatible${pluriel}`}
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pieces.map((piece) => (
          <li
            key={piece.id}
            className="relative flex flex-col gap-2 rounded-lg border border-cuivre/50 bg-surface p-4 transition-[border-color,box-shadow] hover:border-cuivre hover:shadow-md hover:shadow-cuivre/15 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-primaire"
          >
            <p className="text-xs uppercase tracking-wide text-texte-doux">
              {libellesCategories[piece.categorie]}
            </p>
            <h2 className="font-medium text-primaire">
              {/* Le pseudo-élément étend le lien à toute la carte : un seul arrêt
                  au clavier par pièce, avec le nom de la pièce comme intitulé. */}
              <Link
                href={cheminPiece(piece)}
                prefetch={true}
                className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
              >
                {piece.nom}
              </Link>
            </h2>
            <p className="flex-1 text-sm text-texte-doux">
              {piece.description}
            </p>
            <p className="font-semibold">{formaterPrix(piece.prixCentimes)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
