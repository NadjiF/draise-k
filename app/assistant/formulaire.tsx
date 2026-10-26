import type { Dispatch, FormEvent, Ref, SetStateAction } from "react";
import { libellesTaillesRoue, libellesTypesFrein, type Criteres } from "@/lib/criteres";
import type { OptionsCriteres } from "./assistant";
import { BoutonEnvoi, classeChamp } from "./commun";

// Saisie du besoin et des critères facultatifs du vélo. L'état reste dans `Assistant`.
export function Formulaire({
  id,
  besoin,
  onChangeBesoin,
  champBesoin,
  criteres,
  setCriteres,
  criteresOuverts,
  onToggleCriteres,
  premierCritere,
  options,
  longueurMax,
  memeDemande,
  demandeEnvoyee,
  chargement,
  attente,
  onSubmit,
  onNouvelleDemande,
}: {
  id: string;
  besoin: string;
  onChangeBesoin: (besoin: string) => void;
  champBesoin: Ref<HTMLTextAreaElement>;
  criteres: Criteres;
  setCriteres: Dispatch<SetStateAction<Criteres>>;
  criteresOuverts: boolean;
  onToggleCriteres: (ouverts: boolean) => void;
  premierCritere: Ref<HTMLSelectElement>;
  options: OptionsCriteres;
  longueurMax: number;
  memeDemande: boolean;
  demandeEnvoyee: boolean;
  chargement: boolean;
  attente: number;
  onSubmit: (evenement: FormEvent<HTMLFormElement>) => void;
  onNouvelleDemande: () => void;
}) {
  return (
    <form onSubmit={onSubmit} aria-label="Votre besoin" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-besoin`} className="font-medium">
          Décrivez votre besoin
        </label>
        <p id={`${id}-exemple`} className="text-sm text-texte-doux">
          Par exemple : « Je veux changer ma chaîne » ou « Des plaquettes pour mon VTT à freins
          à disque ».
        </p>
        <textarea
          id={`${id}-besoin`}
          ref={champBesoin}
          value={besoin}
          onChange={(e) => onChangeBesoin(e.target.value)}
          required
          rows={4}
          maxLength={longueurMax}
          aria-describedby={`${id}-exemple ${id}-confidentialite ${id}-compteur`}
          className={`${classeChamp} resize-y`}
        />
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          {/* Aussi référencé par le champ de réponse de `QuestionAssistant`. */}
          <p id={`${id}-confidentialite`} className="font-medium">
            Ne saisissez pas d’informations personnelles (nom, adresse, téléphone…).
          </p>
          <p id={`${id}-compteur`} className="tabular-nums text-texte-doux">
            {besoin.length} / {longueurMax} caractères
          </p>
        </div>
      </div>

      <details
        open={criteresOuverts}
        onToggle={(e) => onToggleCriteres(e.currentTarget.open)}
        className="rounded-lg border border-cuivre/50 bg-surface"
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
        {demandeEnvoyee && (
          <button
            type="button"
            onClick={onNouvelleDemande}
            className="rounded-full border border-texte-doux/30 px-5 py-2 text-sm transition-colors hover:bg-surface-alt"
          >
            Nouvelle demande
          </button>
        )}
      </div>
    </form>
  );
}

const classeSelect =
  "rounded-md border border-texte-doux bg-surface px-3 py-1.5 text-sm";

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
