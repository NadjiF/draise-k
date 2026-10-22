"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type Ref,
} from "react";
import { flushSync } from "react-dom";
import type { CodeErreur, Echange } from "@/lib/assistant";
import {
  aDesCriteres,
  decrireCriteres,
  libellesTaillesRoue,
  libellesTypesFrein,
  type Criteres,
} from "@/lib/criteres";
import { formaterPrix } from "@/lib/prix";
import type { ErreurApi, ReponseAssistant, RequeteAssistant } from "@/types/assistant";
import type { TailleRoue, TypeFrein } from "@/types/piece";

export interface OptionsCriteres {
  taillesRoue: TailleRoue[];
  typesFrein: TypeFrein[];
  vitesses: number[];
}

// La route ne garde aucun historique : la demande initiale (`demande`) et les échanges
// déjà validés (`echanges`) sont conservés ici et renvoyés à chaque appel.
export function Assistant({
  options,
  longueurMax,
  maxEchanges,
}: {
  options: OptionsCriteres;
  longueurMax: number;
  maxEchanges: number;
}) {
  const [besoin, setBesoin] = useState("");
  const [criteres, setCriteres] = useState<Criteres>({});
  const [criteresOuverts, setCriteresOuverts] = useState(false);
  const [demande, setDemande] = useState<string | null>(null);
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const [reponse, setReponse] = useState<ReponseAssistant | null>(null);
  const [reponseUtilisateur, setReponseUtilisateur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [attente, setAttente] = useState(0); // secondes avant de pouvoir réessayer (429)

  const controleur = useRef<AbortController | null>(null);
  const champBesoin = useRef<HTMLTextAreaElement>(null);
  const premierCritere = useRef<HTMLSelectElement>(null);
  const titreResultat = useRef<HTMLHeadingElement>(null);
  const champReponse = useRef<HTMLInputElement>(null);
  const id = useId();

  const enAttente = attente > 0;
  useEffect(() => {
    if (!enAttente) return;
    const minuteur = setInterval(() => setAttente((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(minuteur);
  }, [enAttente]);

  useEffect(() => () => controleur.current?.abort(), []);

  const bloque = chargement || enAttente;
  // Même texte que la demande envoyée : on la relance avec les précisions déjà données
  // (ex. après correction des critères). Un texte modifié repart de zéro.
  const memeDemande = demande !== null && besoin.trim() === demande;
  const peutRepondre = echanges.length < maxEchanges;

  // Renvoie null en cas d'erreur (affichée) ou si l'appel a été remplacé par un autre.
  async function envoyer(corps: RequeteAssistant): Promise<ReponseAssistant | null> {
    controleur.current?.abort();
    const actuel = new AbortController();
    controleur.current = actuel;
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corps),
        signal: actuel.signal,
      });
      const contenu: unknown = await res.json().catch(() => null);
      if (res.ok && contenu) return contenu as ReponseAssistant;

      const { code, message } = (contenu as ErreurApi | null)?.erreur ?? {};
      const secondes = Math.ceil(Number(res.headers.get("Retry-After"))) || 60;
      setErreur(messageErreur(code, message, secondes));
      if (code === "trop_de_requetes") setAttente(secondes);
      return null;
    } catch {
      if (!actuel.signal.aborted) {
        setErreur("Impossible de joindre l’assistant. Vérifiez votre connexion et réessayez.");
      }
      return null;
    } finally {
      if (controleur.current === actuel) setChargement(false);
    }
  }

  // Après une réponse, le focus va au champ de réponse s'il y a une question à
  // laquelle répondre, sinon au titre du résultat, lu en premier par les lecteurs d'écran.
  function afficher(nouvelle: ReponseAssistant, message: string, nouveaux: Echange[]) {
    flushSync(() => {
      setDemande(message);
      setEchanges(nouveaux);
      setReponse(nouvelle);
      setReponseUtilisateur("");
    });
    const question = nouvelle.intention === "question" && nouveaux.length < maxEchanges;
    (question ? champReponse : titreResultat).current?.focus();
  }

  async function soumettreDemande(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const message = besoin.trim();
    if (!message || bloque) return;
    const precedents = memeDemande ? echanges : [];
    const nouvelle = await envoyer({ message, criteres, echanges: precedents });
    if (nouvelle) afficher(nouvelle, message, precedents);
  }

  async function soumettreReponse(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const texte = reponseUtilisateur.trim();
    const question = reponse?.question;
    if (demande === null || !question || !texte || bloque) return;
    const suivants = [...echanges, { question, reponse: texte }];
    const nouvelle = await envoyer({ message: demande, criteres, echanges: suivants });
    if (nouvelle) afficher(nouvelle, demande, suivants);
  }

  // Les déductions passent dans les listes, où l'utilisateur les corrige avant de relancer.
  function corrigerCriteres(deduits: Criteres) {
    flushSync(() => {
      setCriteres((actuels) => ({ ...actuels, ...deduits }));
      setCriteresOuverts(true);
    });
    premierCritere.current?.focus();
  }

  function nouvelleDemande() {
    controleur.current?.abort();
    flushSync(() => {
      setBesoin("");
      setCriteres({});
      setDemande(null);
      setEchanges([]);
      setReponse(null);
      setReponseUtilisateur("");
      setChargement(false);
      setErreur(null);
    });
    champBesoin.current?.focus();
  }

  return (
    <div className="mt-8 max-w-3xl">
      <form onSubmit={soumettreDemande} aria-label="Votre besoin" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-besoin`} className="font-medium">
            Décrivez votre besoin
          </label>
          <p id={`${id}-exemple`} className="text-sm text-zinc-600 dark:text-zinc-400">
            Par exemple : « Je veux changer ma chaîne » ou « Des plaquettes pour mon VTT à
            freins à disque ».
          </p>
          <textarea
            id={`${id}-besoin`}
            ref={champBesoin}
            value={besoin}
            onChange={(e) => setBesoin(e.target.value)}
            required
            rows={4}
            maxLength={longueurMax}
            aria-describedby={`${id}-exemple ${id}-confidentialite ${id}-compteur`}
            className={`${classeChamp} resize-y`}
          />
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
            <p id={`${id}-confidentialite`} className="font-medium">
              Ne saisissez pas d’informations personnelles (nom, adresse, téléphone…).
            </p>
            <p id={`${id}-compteur`} className="tabular-nums text-zinc-600 dark:text-zinc-400">
              {besoin.length} / {longueurMax} caractères
            </p>
          </div>
        </div>

        <details
          open={criteresOuverts}
          onToggle={(e) => setCriteresOuverts(e.currentTarget.open)}
          className="rounded-lg border border-black/[.08] dark:border-white/[.145]"
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Préciser mon vélo (facultatif)
          </summary>
          <div className="flex flex-wrap gap-4 px-4 pb-4">
            <ChampCritere
              ref={premierCritere}
              libelle="Taille de roue"
              valeur={criteres.tailleRoue}
              options={options.taillesRoue}
              libelleOption={(taille) => libellesTaillesRoue[taille]}
              onChange={(tailleRoue) => setCriteres((c) => ({ ...c, tailleRoue }))}
            />
            <ChampCritere
              libelle="Type de frein"
              valeur={criteres.typeFrein}
              options={options.typesFrein}
              libelleOption={(type) => libellesTypesFrein[type]}
              onChange={(typeFrein) => setCriteres((c) => ({ ...c, typeFrein }))}
            />
            <ChampCritere
              libelle="Vitesses"
              valeur={criteres.vitesses}
              options={options.vitesses}
              libelleOption={(nb) => `${nb} vitesses`}
              onChange={(vitesses) => setCriteres((c) => ({ ...c, vitesses }))}
            />
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <BoutonEnvoi chargement={chargement} attente={attente}>
            {memeDemande ? "Relancer la demande" : "Envoyer"}
          </BoutonEnvoi>
          {demande !== null && (
            <button
              type="button"
              onClick={nouvelleDemande}
              className="rounded-full border border-black/[.08] px-5 py-2 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Nouvelle demande
            </button>
          )}
        </div>
      </form>

      {/* Toujours présentes dans la page, pour que leurs changements soient annoncés. */}
      <p role="status" className="sr-only">
        {chargement
          ? "Recherche en cours. L’assistant met souvent 10 à 20 secondes à répondre."
          : reponse && !erreur
            ? "Réponse de l’assistant reçue."
            : ""}
      </p>
      <div role="alert">
        {erreur && (
          <p className="mt-6 rounded-lg border border-red-700/30 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200">
            {erreur}
          </p>
        )}
      </div>

      {chargement && (
        <div
          aria-hidden="true"
          className="mt-6 flex items-center gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
        >
          <Indicateur className="size-5" />
          <div>
            <p className="font-medium">L’assistant cherche dans le catalogue…</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Cela prend souvent 10 à 20 secondes.
            </p>
          </div>
        </div>
      )}

      {reponse && (
        <section
          aria-labelledby={`${id}-resultat`}
          aria-busy={chargement}
          className={`mt-10 transition-opacity ${chargement ? "opacity-50" : ""}`}
        >
          <h2
            id={`${id}-resultat`}
            ref={titreResultat}
            tabIndex={-1}
            className="text-xl font-semibold"
          >
            Réponse de l’assistant
          </h2>

          {echanges.length > 0 && <Echanges echanges={echanges} />}

          <p className="mt-4">{reponse.message}</p>

          {aDesCriteres(reponse.criteresDeduits) && (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg bg-black/[.04] px-4 py-3 text-sm dark:bg-white/[.06]">
              <p>
                J’ai compris : <strong>{decrireCriteres(reponse.criteresDeduits)}</strong>
              </p>
              <button
                type="button"
                onClick={() => corrigerCriteres(reponse.criteresDeduits)}
                className="underline"
              >
                Corriger
              </button>
            </div>
          )}

          {reponse.intention === "devis" && (
            <Devis lignes={reponse.lignes} totalCentimes={reponse.totalCentimes} />
          )}

          {reponse.intention === "question" &&
            reponse.question &&
            (peutRepondre ? (
              <form
                onSubmit={soumettreReponse}
                className="mt-6 flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
              >
                <label htmlFor={`${id}-reponse`} className="font-medium">
                  {reponse.question}
                </label>
                <input
                  id={`${id}-reponse`}
                  ref={champReponse}
                  type="text"
                  value={reponseUtilisateur}
                  onChange={(e) => setReponseUtilisateur(e.target.value)}
                  required
                  maxLength={longueurMax}
                  autoComplete="off"
                  aria-describedby={`${id}-confidentialite`}
                  className={classeChamp}
                />
                <div>
                  <BoutonEnvoi chargement={chargement} attente={attente}>
                    Répondre
                  </BoutonEnvoi>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
                <p className="font-medium">{reponse.question}</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Vous avez déjà apporté {maxEchanges} précisions. Reformulez votre besoin
                  dans le champ ci-dessus en les incluant toutes, puis envoyez-le.
                </p>
              </div>
            ))}

          {reponse.nonCouvert.length > 0 && <NonCouvert besoins={reponse.nonCouvert} />}

          {reponse.ecartees.length > 0 && (
            <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
              <p>Pièces proposées par l’assistant mais écartées par le site :</p>
              <ul className="mt-1 list-disc pl-5">
                {reponse.ecartees.map(({ id: idPiece, nom, motif }) => (
                  <li key={idPiece}>
                    {nom} : {motif}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const classeChamp =
  "rounded-md border border-black/[.15] bg-background px-3 py-2 dark:border-white/[.2]";

const classeSelect =
  "rounded-md border border-black/[.08] bg-background px-3 py-1.5 text-sm dark:border-white/[.145]";

function ChampCritere<T extends string | number>({
  ref,
  libelle,
  valeur,
  options,
  libelleOption,
  onChange,
}: {
  ref?: Ref<HTMLSelectElement>;
  libelle: string;
  valeur: T | undefined;
  options: T[];
  libelleOption: (valeur: T) => string;
  onChange: (valeur: T | undefined) => void;
}) {
  // Une valeur déduite peut ne correspondre à aucune pièce (ex. roues 24 pouces) :
  // elle reste affichée pour que la liste montre bien la valeur utilisée.
  const valeurs = valeur === undefined || options.includes(valeur) ? options : [...options, valeur];
  return (
    <label className="flex flex-col gap-1 text-sm">
      {libelle}
      <select
        ref={ref}
        value={valeur ?? ""}
        onChange={(e) => onChange(valeurs.find((v) => String(v) === e.target.value))}
        className={classeSelect}
      >
        <option value="">Je ne sais pas</option>
        {valeurs.map((v) => (
          <option key={v} value={v}>
            {libelleOption(v)}
          </option>
        ))}
      </select>
    </label>
  );
}

function BoutonEnvoi({
  chargement,
  attente,
  children,
}: {
  chargement: boolean;
  attente: number;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={chargement || attente > 0}
      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-60"
    >
      {chargement ? (
        <>
          <Indicateur className="size-4" />
          Recherche…
        </>
      ) : attente > 0 ? (
        `Réessayer dans ${attente} s`
      ) : (
        children
      )}
    </button>
  );
}

// Sans animation si l'utilisateur a demandé moins de mouvement : le texte suffit.
function Indicateur({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin ${className}`}
    />
  );
}

function Echanges({ echanges }: { echanges: Echange[] }) {
  return (
    <dl className="mt-4 flex flex-col gap-2 border-l-2 border-black/[.08] pl-4 text-sm dark:border-white/[.145]">
      {echanges.map(({ question, reponse }, i) => (
        <div key={i}>
          <dt className="text-zinc-600 dark:text-zinc-400">{question}</dt>
          <dd className="font-medium">{reponse}</dd>
        </div>
      ))}
    </dl>
  );
}

function Devis({
  lignes,
  totalCentimes,
}: {
  lignes: ReponseAssistant["lignes"];
  totalCentimes: number;
}) {
  return (
    <>
      <table className="mt-6 w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold">Pièces proposées</caption>
        <thead>
          <tr className="border-b border-black/[.08] dark:border-white/[.145]">
            <th scope="col" className="py-2 pr-4 font-medium">
              Pièce
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              Quantité
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Prix
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr
              key={ligne.id}
              className="border-b border-black/[.08] align-top dark:border-white/[.145]"
            >
              <td className="py-3 pr-4">
                <Link href={ligne.chemin} className="font-medium underline">
                  {ligne.nom}
                </Link>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{ligne.raison}</p>
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">{ligne.quantite}</td>
              <td className="whitespace-nowrap py-3 text-right tabular-nums">
                {formaterPrix(ligne.totalCentimes)}
                {ligne.quantite > 1 && (
                  <span className="block text-xs text-zinc-500">
                    {formaterPrix(ligne.prixUnitaireCentimes)} l’unité
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2} className="pt-3 pr-4 text-right font-semibold">
              Total
            </th>
            <td className="whitespace-nowrap pt-3 text-right font-semibold tabular-nums">
              {formaterPrix(totalCentimes)}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Devis indicatif : prix TTC du catalogue, calculés par le site et non par l’assistant.
        Vérifiez les compatibilités sur la fiche de chaque pièce.
      </p>
    </>
  );
}

function NonCouvert({ besoins }: { besoins: string[] }) {
  return (
    <div className="mt-6">
      <p className="font-medium">Ce que le catalogue ne couvre pas :</p>
      <ul className="mt-1 list-disc pl-5">
        {besoins.map((besoin) => (
          <li key={besoin}>{besoin}</li>
        ))}
      </ul>
    </div>
  );
}

// Les messages du serveur sont déjà en français, mais seuls ceux des requêtes invalides
// sont assez précis pour être montrés tels quels (ex. « Trop d’échanges… »).
function messageErreur(
  code: CodeErreur | undefined,
  messageServeur: string | undefined,
  secondes: number,
): string {
  switch (code) {
    case "requete_invalide":
    case "message_trop_long":
      return messageServeur ?? "Votre demande n’a pas pu être lue. Vérifiez-la et réessayez.";
    case "trop_de_requetes":
      return `Vous avez envoyé beaucoup de demandes en peu de temps. Patientez ${secondes} secondes avant de réessayer.`;
    case "quota_depasse":
      return "L’assistant est très sollicité en ce moment. Réessayez dans quelques minutes.";
    case "service_indisponible":
      return "L’assistant est momentanément indisponible. Réessayez dans quelques instants.";
    case "reponse_invalide":
      return "L’assistant a renvoyé une réponse inutilisable. Réessayez, si besoin en reformulant.";
    case "delai_depasse":
      return "L’assistant a mis trop de temps à répondre. Réessayez.";
    default:
      return "Une erreur est survenue. Réessayez plus tard.";
  }
}
