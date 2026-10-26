import Link from "next/link";
import { formaterPrix } from "@/lib/prix";
import type { ReponseAssistant } from "@/types/assistant";

export function Devis({
  lignes,
  totalCentimes,
}: {
  lignes: ReponseAssistant["lignes"];
  totalCentimes: number;
}) {
  return (
    <>
      {/* Le contour est sur un conteneur : border-radius ne s'applique pas à un tableau
          en border-collapse. Le défilement évite de déborder sur un écran étroit. */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-cuivre/50 bg-surface">
        <table className="w-full text-left text-sm">
          <caption className="px-4 pt-3 pb-2 text-left font-semibold">Pièces proposées</caption>
          <thead>
            <tr className="border-y border-cuivre/30 bg-surface-alt">
              <th scope="col" className="px-4 py-2 font-medium">
                Pièce
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Quantité
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Prix
              </th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne) => (
              <tr key={ligne.id} className="border-b border-cuivre/30 align-top">
                <td className="px-4 py-3">
                  <Link
                    href={ligne.chemin}
                    className="font-medium text-primaire underline underline-offset-2 hover:text-primaire-survol"
                  >
                    {ligne.nom}
                  </Link>
                  <p className="mt-1 text-texte-doux">{ligne.raison}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{ligne.quantite}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formaterPrix(ligne.totalCentimes)}
                  {ligne.quantite > 1 && (
                    <span className="block text-xs text-texte-doux">
                      {formaterPrix(ligne.prixUnitaireCentimes)} l’unité
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2} className="px-4 py-3 text-right font-semibold">
                Total
              </th>
              <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                {formaterPrix(totalCentimes)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-4 text-sm text-texte-doux">
        Devis indicatif : prix TTC du catalogue, calculés par le site et non par l’assistant.
        Vérifiez les compatibilités sur la fiche de chaque pièce.
      </p>
    </>
  );
}
