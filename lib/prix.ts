// Séparé de lib/pieces.ts, qui importe tout le catalogue : utilisable côté client.
const formatPrix = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formaterPrix(prixCentimes: number): string {
  return formatPrix.format(prixCentimes / 100);
}
