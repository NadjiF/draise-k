import type { Metadata } from "next";
import { Catalogue } from "./catalogue";

export const metadata: Metadata = {
  title: "Catalogue",
};

export default function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8">
      <Catalogue searchParams={searchParams} />
    </main>
  );
}
