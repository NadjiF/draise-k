import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { EnTete } from "./en-tete";
import { scriptTheme } from "./theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "La Draise-K",
    template: "%s · La Draise-K",
  },
  description: "Pièces détachées vélo, triées par compatibilité. Projet de démonstration.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : le script de <head> peut poser data-theme avant l'hydratation.
    <html lang="fr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-primaire focus:px-4 focus:py-2 focus:text-sur-primaire"
        >
          Aller au contenu
        </a>
        <EnTete />
        <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-8">
          {children}
        </main>
        <footer className="border-t border-cuivre/40">
          <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-texte-doux sm:px-8">
            La Draise-K est un projet de démonstration : les pièces et les prix sont fictifs,
            rien n’est à vendre.{" "}
            <Link
              href="/a-propos"
              className="text-primaire underline underline-offset-2 hover:text-primaire-survol"
            >
              En savoir plus
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
