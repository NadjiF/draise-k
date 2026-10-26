import type { FormEvent, Ref } from "react";
import type { Echange } from "@/lib/assistant";
import { aDesCriteres, type Criteres } from "@/lib/criteres";
import type { ReponseAssistant } from "@/types/assistant";
import { CriteresCompris } from "./criteres-compris";
import { Devis } from "./devis";
import { NonCouvert } from "./non-couvert";
import { QuestionAssistant } from "./question-assistant";

// Réponse de l'assistant : le message, commun à toutes les intentions, puis le bloc propre
// à l'intention (devis ou question). Atténuée pendant qu'une nouvelle réponse est attendue.
export function Resultat({
  id,
  reponse,
  echanges,
  titreResultat,
  champReponse,
  reponseUtilisateur,
  onChangeReponse,
  onRepondre,
  onCorrigerCriteres,
  peutRepondre,
  maxEchanges,
  longueurMax,
  chargement,
  attente,
}: {
  id: string;
  reponse: ReponseAssistant;
  echanges: Echange[];
  titreResultat: Ref<HTMLHeadingElement>;
  champReponse: Ref<HTMLInputElement>;
  reponseUtilisateur: string;
  onChangeReponse: (reponse: string) => void;
  onRepondre: (evenement: FormEvent<HTMLFormElement>) => void;
  onCorrigerCriteres: (criteres: Criteres) => void;
  peutRepondre: boolean;
  maxEchanges: number;
  longueurMax: number;
  chargement: boolean;
  attente: number;
}) {
  return (
    <section
      aria-labelledby={`${id}-resultat`}
      aria-busy={chargement}
      className={`mt-10 transition-opacity ${chargement ? "opacity-50" : ""}`}
    >
      <h2
        id={`${id}-resultat`}
        ref={titreResultat}
        tabIndex={-1}
        className="text-xl font-semibold text-primaire"
      >
        Réponse de l’assistant
      </h2>

      {echanges.length > 0 && <Echanges echanges={echanges} />}

      <p className="mt-4">{reponse.message}</p>

      {aDesCriteres(reponse.criteresDeduits) && (
        <CriteresCompris criteres={reponse.criteresDeduits} onCorriger={onCorrigerCriteres} />
      )}

      {reponse.intention === "devis" && (
        <Devis lignes={reponse.lignes} totalCentimes={reponse.totalCentimes} />
      )}

      {reponse.intention === "question" && reponse.question && (
        <QuestionAssistant
          id={id}
          question={reponse.question}
          peutRepondre={peutRepondre}
          maxEchanges={maxEchanges}
          longueurMax={longueurMax}
          reponse={reponseUtilisateur}
          onChangeReponse={onChangeReponse}
          onSubmit={onRepondre}
          champReponse={champReponse}
          chargement={chargement}
          attente={attente}
        />
      )}

      {reponse.nonCouvert.length > 0 && <NonCouvert besoins={reponse.nonCouvert} />}

      {reponse.ecartees.length > 0 && (
        <div className="mt-6 text-sm text-texte-doux">
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
  );
}

function Echanges({ echanges }: { echanges: Echange[] }) {
  return (
    <dl className="mt-4 flex flex-col gap-2 border-l-2 border-cuivre/40 pl-4 text-sm">
      {echanges.map(({ question, reponse }, i) => (
        <div key={i}>
          <dt className="text-texte-doux">{question}</dt>
          <dd className="font-medium">{reponse}</dd>
        </div>
      ))}
    </dl>
  );
}
