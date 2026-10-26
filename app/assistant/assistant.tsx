"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { Echange } from "@/lib/assistant";
import type { Criteres } from "@/lib/criteres";
import type { ErreurApi, ReponseAssistant, RequeteAssistant } from "@/types/assistant";
import type { TailleRoue, TypeFrein } from "@/types/piece";
import { Chargement } from "./chargement";
import { Formulaire } from "./formulaire";
import { MessageErreur, messageErreur } from "./message-erreur";
import { Resultat } from "./resultat";

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
      <Formulaire
        id={id}
        besoin={besoin}
        onChangeBesoin={setBesoin}
        champBesoin={champBesoin}
        criteres={criteres}
        setCriteres={setCriteres}
        criteresOuverts={criteresOuverts}
        onToggleCriteres={setCriteresOuverts}
        premierCritere={premierCritere}
        options={options}
        longueurMax={longueurMax}
        memeDemande={memeDemande}
        demandeEnvoyee={demande !== null}
        chargement={chargement}
        attente={attente}
        onSubmit={soumettreDemande}
        onNouvelleDemande={nouvelleDemande}
      />

      {/* Toujours présente dans la page, pour que ses changements soient annoncés. */}
      <p role="status" className="sr-only">
        {chargement
          ? "Recherche en cours. L’assistant met souvent 10 à 20 secondes à répondre."
          : reponse && !erreur
            ? "Réponse de l’assistant reçue."
            : ""}
      </p>
      <MessageErreur erreur={erreur} />

      {chargement && <Chargement />}

      {reponse && (
        <Resultat
          id={id}
          reponse={reponse}
          echanges={echanges}
          titreResultat={titreResultat}
          champReponse={champReponse}
          reponseUtilisateur={reponseUtilisateur}
          onChangeReponse={setReponseUtilisateur}
          onRepondre={soumettreReponse}
          onCorrigerCriteres={corrigerCriteres}
          peutRepondre={peutRepondre}
          maxEchanges={maxEchanges}
          longueurMax={longueurMax}
          chargement={chargement}
          attente={attente}
        />
      )}
    </div>
  );
}
