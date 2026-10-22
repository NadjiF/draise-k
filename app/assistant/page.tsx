import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Assistant",
};

// Page provisoire : l'assistant sera construit dans une prochaine étape.
export default function AssistantPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Assistant</h1>
      <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
        L’assistant n’est pas encore disponible. En attendant, le{" "}
        <Link href="/catalogue" className="underline">
          catalogue
        </Link>{" "}
        permet de filtrer les pièces selon votre vélo.
      </p>
    </>
  );
}
