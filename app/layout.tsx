import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { EnTete } from "./en-tete";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Aller au contenu
        </a>
        <EnTete />
        <main id="contenu" className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-8">
          {children}
        </main>
        <footer className="border-t border-black/[.08] dark:border-white/[.145]">
          <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-zinc-600 sm:px-8 dark:text-zinc-400">
            La Draise-K est un projet de démonstration : les pièces et les prix sont fictifs,
            rien n’est à vendre.{" "}
            <Link href="/a-propos" className="underline">
              En savoir plus
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
