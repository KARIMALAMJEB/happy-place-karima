import { Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { refOf, titleOf, type Motif, type RequestRow } from "@/lib/requests";
import { cn } from "@/lib/utils";

const MAX_QUESTION = 200;
const MAX_QUESTIONS = 5;
const MAX_EXPLICATION = 500;

const MOTIFS: { valeur: Motif; label: string; aide: string }[] = [
  { valeur: "à clarifier", label: "À clarifier", aide: "Il manque des informations. L'auteur pourra compléter sa demande et la renvoyer." },
  { valeur: "en désaccord avec les process", label: "En désaccord avec les process", aide: "La demande ne respecte pas les règles internes. Le refus est définitif." },
  { valeur: "doublon", label: "Doublon", aide: "Une demande identique existe déjà. Le refus est définitif." },
  { valeur: "autre", label: "Autre", aide: "Une autre raison, à expliquer ci-dessous. Le refus est définitif." },
];

export type Refus = { motif: Motif; explication: string; precisions?: string[] };
type Erreurs = Partial<Record<"motif" | "questions" | "explication", string>>;

const Erreur = ({ children }: { children?: string }) =>
  children ? <p role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">{children}</p> : null;

// Modale « Refuser la demande » (reprise du prototype) : motif obligatoire ; « À clarifier » demande 1 à 5 précisions
// et rend la demande « À compléter » ; l'explication est transmise à l'auteur par e-mail.
export function RefusDialog({ demande: d, ouvert, onFermer, onConfirmer, envoi }: {
  demande: RequestRow;
  ouvert: boolean;
  onFermer: () => void;
  onConfirmer: (r: Refus) => void;
  envoi?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motif, setMotif] = useState<Motif | undefined>();
  const [questions, setQuestions] = useState<string[]>([""]);
  const [explication, setExplication] = useState("");
  const [erreurs, setErreurs] = useState<Erreurs>({});

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (ouvert && !dlg.open) dlg.showModal();
    if (!ouvert && dlg.open) dlg.close();
  }, [ouvert]);

  const clarifier = motif === "à clarifier";

  function confirmer() {
    const nomCite = d.confidential_identity && explication.toLowerCase().includes(d.author_name.toLowerCase());
    const err: Erreurs = {
      motif: motif ? undefined : "Choisis un motif.",
      questions: clarifier && !questions.some((q) => q.trim()) ? "Pose au moins une question à l'auteur." : undefined,
      explication: !explication.trim()
        ? "Rédige l'explication transmise à l'auteur."
        : nomCite
          ? "N'écris pas le nom de l'auteur : son identité est confidentielle."
          : undefined,
    };
    setErreurs(err);
    if (err.motif || err.questions || err.explication) return;
    onConfirmer({
      motif: motif!,
      explication: explication.trim(),
      precisions: clarifier ? questions.map((q) => q.trim()).filter(Boolean) : undefined,
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="refus-titre"
      onClose={onFermer}
      className="m-auto max-h-[90vh] w-[680px] max-w-[calc(100vw-32px)] overflow-y-auto border border-anthracite bg-white p-0 text-ink backdrop:bg-anthracite/50"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <div>
          <h2 id="refus-titre" className="text-[24px] leading-8">Refuser la demande</h2>
          <p className="text-[12px] leading-4 text-ink-2">{refOf(d)} · {titleOf(d)}</p>
        </div>
        <HpIconButton icon={X} label="Fermer" className="border-0" onClick={onFermer} />
      </div>

      <div className="flex flex-col gap-6 px-6 py-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-2 text-ink">Motif *</legend>
          {MOTIFS.map((m) => (
            <label
              key={m.valeur}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 hover:bg-neutral-1",
                motif === m.valeur ? "border-anthracite bg-neutral-1" : "border-line",
              )}
            >
              <input type="radio" name="motif" value={m.valeur} checked={motif === m.valeur} onChange={() => setMotif(m.valeur)} className="mt-0.5 size-5 shrink-0 accent-anthracite" />
              <span className="flex flex-col gap-1">
                <span className="text-[14px] leading-5 font-semibold">{m.label}</span>
                <span className="text-[12px] leading-4 text-ink-2">{m.aide}</span>
              </span>
            </label>
          ))}
          <Erreur>{erreurs.motif}</Erreur>
        </fieldset>

        {clarifier && (
          <fieldset className="flex flex-col gap-3 bg-neutral-1 p-4">
            <legend className="sr-only">Précisions demandées à l'auteur</legend>
            <p className="label text-ink">Précisions demandées à l'auteur</p>
            {questions.map((q, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={`question-${i}`} className="text-[14px] leading-5 font-semibold">Question {i + 1}</label>
                  <span className="text-[12px] leading-4 text-ink-2">{q.length} / {MAX_QUESTION}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`question-${i}`}
                    value={q}
                    maxLength={MAX_QUESTION}
                    onChange={(e) => setQuestions((l) => l.map((x, k) => (k === i ? e.target.value : x)))}
                    className="min-h-11 flex-1 border border-field bg-white px-3 text-[14px] leading-5"
                  />
                  {questions.length > 1 && (
                    <HpIconButton icon={Trash2} label={`Retirer la question ${i + 1}`} onClick={() => setQuestions((l) => l.filter((_, k) => k !== i))} />
                  )}
                </div>
              </div>
            ))}
            <Erreur>{erreurs.questions}</Erreur>
            {questions.length < MAX_QUESTIONS ? (
              <button type="button" onClick={() => setQuestions((l) => [...l, ""])} className="label-13 inline-flex h-11 w-fit items-center gap-2 text-anthracite underline underline-offset-4 hover:text-ink">
                <Plus size={16} aria-hidden /> Ajouter une précision
              </button>
            ) : (
              <p className="text-[12px] leading-4 text-ink-2">5 précisions au maximum.</p>
            )}
          </fieldset>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="explication" className="label text-ink">Explication transmise *</label>
            <span className="text-[12px] leading-4 text-ink-2">{explication.length} / {MAX_EXPLICATION} caractères</span>
          </div>
          <p id="explication-aide" className="text-[12px] leading-4 text-ink-2">
            Ce texte figurera dans le corps de l'e-mail.{d.confidential_identity && " L'identité de l'auteur est confidentielle : ne la cite pas."}
          </p>
          <textarea
            id="explication"
            rows={4}
            maxLength={MAX_EXPLICATION}
            value={explication}
            onChange={(e) => setExplication(e.target.value)}
            aria-describedby="explication-aide"
            className="w-full border border-field bg-white px-3 py-2 text-[14px] leading-5"
          />
          <Erreur>{erreurs.explication}</Erreur>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4 border-t border-line px-6 py-4">
        <p className="mr-auto text-[12px] leading-4 text-ink-2">
          {!motif
            ? "Choisis un motif."
            : clarifier
              ? "La demande passe à l'état À compléter, l'auteur est prévenu par e-mail."
              : "Le refus est définitif."}
        </p>
        <button type="button" onClick={onFermer} className="label-13 text-anthracite underline underline-offset-4 hover:text-ink">Annuler</button>
        {clarifier ? (
          <HpButton role="principal" icon={Send} disabled={envoi} onClick={confirmer}>DEMANDER DES PRÉCISIONS</HpButton>
        ) : (
          <HpButton role="refuse" icon={X} disabled={envoi} onClick={confirmer}>CONFIRMER LE REFUS</HpButton>
        )}
      </div>
    </dialog>
  );
}
