import { Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Règles d'arbitrage : texte commun aux pages Demandes et Déposer.
// Masquées par défaut : l'icône « i » les affiche au survol, au clic ou au clavier (Échap les referme).
export function ReglesArbitrage({ children }: { children?: ReactNode }) {
  const corpsId = useId();
  const [epingle, setEpingle] = useState(false);
  const [survol, setSurvol] = useState(false);
  const ouvert = epingle || survol;
  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
      <aside
        aria-labelledby="regles-titre"
        className="flex flex-col border border-line border-l-4 border-l-anthracite bg-white"
        onMouseEnter={() => setSurvol(true)}
        onMouseLeave={() => setSurvol(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setEpingle(false);
            setSurvol(false);
          }
        }}
      >
        <div className={cn("flex items-center justify-between gap-3 bg-neutral-1 px-5 py-3", ouvert && "border-b border-line")}>
          <h2 id="regles-titre" className="text-[22px] leading-7">
            Règles d'arbitrage
          </h2>
          <button
            type="button"
            onClick={() => setEpingle((v) => !v)}
            aria-expanded={ouvert}
            aria-controls={corpsId}
            aria-label={ouvert ? "Masquer les règles d'arbitrage" : "Afficher les règles d'arbitrage"}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center border border-field bg-white text-anthracite hover:bg-neutral-1"
          >
            <Info size={18} aria-hidden />
          </button>
        </div>
        <ul id={corpsId} hidden={!ouvert} className="flex list-disc flex-col gap-2 px-5 py-4 pl-10 text-[14px] leading-5">
          <li>
            <span className="font-semibold">Nature de la demande.</span> Une demande bloquante t'empêche de poursuivre ton travail et ouvre un suivi une fois validée. Une demande non bloquante te laisse continuer.
          </li>
          <li>Seul le motif « À clarifier » permet de compléter ta demande et de la renvoyer avec des précisions.</li>
          <li>Les motifs « En désaccord avec les process », « Doublon » et « Autre » sont définitifs : la demande passe en lecture seule. Tu peux déposer une nouvelle demande.</li>
          <li>Toute décision t'est envoyée par e-mail en moins de 5 minutes.</li>
          <li>Sans réponse après 5 jours ouvrés, tu peux relancer la personne qui décide.</li>
          <li>La visibilité choisie au dépôt ne change plus après l'envoi.</li>
        </ul>
      </aside>
      {children}
    </div>
  );
}
