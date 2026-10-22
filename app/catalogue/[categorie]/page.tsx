import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Categorie } from "@/types/piece";
import { estCategorie, libellesCategories } from "@/lib/pieces";
import { Catalogue } from "../catalogue";

// Les catégories sont en nombre fini : toutes les pages sont prérendues au build.
export function generateStaticParams() {
  return (Object.keys(libellesCategories) as Categorie[]).map((categorie) => ({ categorie }));
}

export async function generateMetadata({
  params,
}: PageProps<"/catalogue/[categorie]">): Promise<Metadata> {
  const { categorie } = await params;
  return {
    title: estCategorie(categorie) ? `${libellesCategories[categorie]} · Catalogue` : "Catalogue",
  };
}

// params est lu sous la Suspense (cf. guide ISR with Cache Components) ; pour les
// catégories prérendues, la Suspense est résolue au build et n'apparaît pas.
export default function CategoriePage({
  params,
  searchParams,
}: PageProps<"/catalogue/[categorie]">) {
  return (
    <Suspense>
      {params.then(({ categorie }) =>
        estCategorie(categorie) ? (
          <Catalogue categorie={categorie} searchParams={searchParams} />
        ) : (
          notFound()
        ),
      )}
    </Suspense>
  );
}
