import type { Metadata } from "next";
import { Catalogue } from "./catalogue";

export const metadata: Metadata = {
  title: "Catalogue",
};

export default function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  return <Catalogue searchParams={searchParams} />;
}
