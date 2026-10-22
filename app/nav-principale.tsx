"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const liens = [
  { href: "/", libelle: "Accueil" },
  { href: "/catalogue", libelle: "Catalogue" },
  { href: "/assistant", libelle: "Assistant" },
  { href: "/a-propos", libelle: "À propos" },
];

// Une rubrique est active sur sa page et sur toutes ses sous-pages
// (Catalogue reste actif sur /catalogue/freinage/patins-v-brake).
function estActif(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavPrincipale() {
  return <LiensNav pathname={usePathname()} />;
}

export function LiensNav({ pathname }: { pathname?: string }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {liens.map(({ href, libelle }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={pathname !== undefined && estActif(href, pathname) ? "page" : undefined}
            className="inline-block rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-black/[.04] aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:underline-offset-4 dark:hover:bg-[#1a1a1a]"
          >
            {libelle}
          </Link>
        </li>
      ))}
    </ul>
  );
}
