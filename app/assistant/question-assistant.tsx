import type { FormEvent, Ref } from "react";
import { BoutonEnvoi, classeChamp } from "./commun";

// Question posée par l'assistant quand il lui manque une information. Au-delà de
// `maxEchanges` réponses, l'utilisateur doit reformuler sa demande initiale.
export function QuestionAssistant({
  id,
  question,
  peutRepondre,
  maxEchanges,
  longueurMax,
  reponse,
  onChangeReponse,
  onSubmit,
  champReponse,
  chargement,
  attente,
}: {
  id: string;
  question: string;
  peutRepondre: boolean;
  maxEchanges: number;
  longueurMax: number;
  reponse: string;
  onChangeReponse: (reponse: string) => void;
  onSubmit: (evenement: FormEvent<HTMLFormElement>) => void;
  champReponse: Ref<HTMLInputElement>;
  chargement: boolean;
  attente: number;
}) {
  if (!peutRepondre) {
    return (
      <div className="mt-6 rounded-lg border border-cuivre/50 bg-surface p-4">
        <p className="font-medium">{question}</p>
        <p className="mt-2 text-sm text-texte-doux">
          Vous avez déjà apporté {maxEchanges} précisions. Reformulez votre besoin dans le
          champ ci-dessus en les incluant toutes, puis envoyez-le.
        </p>
      </div>
    );
  }
  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 flex flex-col gap-3 rounded-lg border border-cuivre/50 bg-surface p-4"
    >
      <label htmlFor={`${id}-reponse`} className="font-medium">
        {question}
      </label>
      <input
        id={`${id}-reponse`}
        ref={champReponse}
        type="text"
        value={reponse}
        onChange={(e) => onChangeReponse(e.target.value)}
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
  );
}
