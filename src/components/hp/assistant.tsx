import { Link } from "@tanstack/react-router";
import { FileText, Info, Sparkles, Send, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { supabase } from "@/integrations/supabase/client";

type Source = { titre: string; type: "Guide" | "Actualité" | "Process" | "Document"; lien: string };
type Reponse = {
  answer: string;
  sources: Source[];
  mode: "ia" | "sans-ia" | "aucun-resultat" | "hors-sujet" | "indisponible" | "donnee-personnelle";
  ia: boolean;
  contact?: { annuaire: string };
};
type Echange = { id: number; question: string; reponse?: Reponse; enCours: boolean };

const SUGGESTIONS = ["Comment déposer une demande ?", "Que se passe-t-il après mon envoi ?", "À quoi servent les indicateurs ?"];
const INDISPONIBLE: Reponse = { answer: "L'assistant est indisponible pour le moment, essaie la recherche en haut de page.", sources: [], mode: "indisponible", ia: false };

// Étiquette carrée (bordure anthracite, fond neutre) : la nature du texte est dite par un mot et une icône, jamais par la couleur
const ETIQUETTE = "label inline-flex w-fit items-center gap-1.5 border border-anthracite bg-neutral-1 px-2 py-0.5 text-anthracite";
function Etiquette({ icone: Icone, texte, lu }: { icone: LucideIcon; texte: string; lu?: string }) {
  return (
    <span role="note" aria-label={lu ?? texte} className={ETIQUETTE}>
      <Icone size={14} aria-hidden />
      <span aria-hidden>{texte}</span>
    </span>
  );
}
const etiquetteDe = (r: Reponse) =>
  r.ia ? (
    <Etiquette icone={Sparkles} texte="Réponse générée par IA" lu="Réponse générée par intelligence artificielle" />
  ) : r.mode === "sans-ia" ? (
    <Etiquette icone={FileText} texte="Extrait du contenu, sans IA" />
  ) : (
    <Etiquette icone={Info} texte="Message automatique, sans IA" />
  );

// Liens internes : chemin rendu par le serveur (« /boite-a-outils/r9 »)
const LIEN = "inline-flex min-h-6 items-center font-semibold text-anthracite underline underline-offset-2";

function Reponse({ r }: { r: Reponse }) {
  return (
    <div className="flex flex-col gap-3 border-l-4 border-anthracite bg-white py-1 pl-3">
      {etiquetteDe(r)}
      {!r.contact && <p className="text-[14px] leading-5">{r.answer}</p>}
      {r.contact && (
        <p className="text-[14px] leading-5">
          {r.mode === "hors-sujet"
            ? "Je réponds uniquement aux questions sur Happy Place et ses contenus. Reformule ta question ou cherche dans l'"
            : `${r.answer} Pour en savoir plus, contacte ton manager ou la bonne personne dans l'`}
          <Link to="/annuaire" className={LIEN}>
            Annuaire
          </Link>
          .
        </p>
      )}
      {r.sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="label text-ink-2">Sources</p>
          <ul className="flex flex-col gap-1">
            {r.sources.map((s) => (
              <li key={s.lien} className="flex flex-col">
                <Link to={s.lien as never} className={LIEN}>
                  {s.titre}
                </Link>
                <span className="text-[12px] leading-4 text-ink-2">{s.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Assistant IA Happy Place : bouton fixe en bas à droite, panneau latéral de 380 px.
// Transparence : il est présenté partout comme une IA (repère « IA », bandeau, étiquette sur chaque réponse), sans visage ni prénom.
export function Assistant() {
  const [ouvert, setOuvert] = useState(false);
  const [question, setQuestion] = useState("");
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const champ = useRef<HTMLInputElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const fil = useRef<HTMLDivElement>(null);
  const enCours = echanges.some((e) => e.enCours);
  const aOuvert = useRef(false);

  // À la fermeture, le focus revient sur le bouton Assistant IA (rendu de nouveau à ce moment-là)
  useEffect(() => {
    if (ouvert) aOuvert.current = true;
    else if (aOuvert.current) bouton.current?.focus();
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    champ.current?.focus();
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [ouvert]);

  useEffect(() => {
    fil.current?.scrollTo({ top: fil.current.scrollHeight });
  }, [echanges]);

  const demander = async (texte: string) => {
    const q = texte.trim();
    if (!q || enCours) return;
    const id = Date.now();
    setEchanges((l) => [...l, { id, question: q, enCours: true }]);
    setQuestion("");
    let reponse = INDISPONIBLE;
    try {
      const { data } = await supabase.auth.getSession();
      const jeton = data.session?.access_token ?? "";
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}` }, body: JSON.stringify({ question: q }) });
      if (res.ok) reponse = (await res.json()) as Reponse;
    } catch {
      // réseau coupé : message d'indisponibilité
    }
    setEchanges((l) => l.map((e) => (e.id === id ? { ...e, reponse, enCours: false } : e)));
  };

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    void demander(question);
  };

  return (
    <>
      {!ouvert && (
        <button
          ref={bouton}
          type="button"
          aria-expanded={false}
          aria-controls="assistant"
          onClick={() => setOuvert(true)}
          className="label-13 fixed right-6 bottom-6 z-30 inline-flex h-11 cursor-pointer items-center gap-2 bg-anthracite px-5 text-on-anthracite"
        >
          <Sparkles size={16} aria-hidden />
          ASSISTANT IA
        </button>
      )}

      {ouvert && (
        <aside
          id="assistant"
          role="dialog"
          aria-labelledby="assistant-titre"
          aria-describedby="assistant-avertissement"
          className="fixed top-0 right-0 bottom-0 z-40 flex w-[380px] max-w-full flex-col border-l-4 border-line border-l-anthracite bg-white"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 id="assistant-titre" className="text-[22px] leading-7">
                Assistant IA Happy Place
              </h2>
              <span className="label inline-flex h-6 items-center border border-anthracite bg-neutral-1 px-1.5 text-anthracite">IA</span>
            </div>
            <HpIconButton icon={X} label="Fermer l'assistant" className="border-0" onClick={() => setOuvert(false)} />
          </header>
          <p id="assistant-avertissement" className="flex gap-2 border-b border-line bg-neutral-1 px-5 py-3 text-[12px] leading-4 text-ink">
            <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
            Tu échanges avec une IA, pas avec une personne. Ses réponses viennent uniquement des contenus de Happy Place et peuvent être incomplètes ou fausses : vérifie dans la source.
          </p>

          <div ref={fil} className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
            {echanges.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="label text-ink-2">Questions fréquentes</p>
                <ul className="flex flex-col gap-1">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => void demander(s)} className="min-h-11 cursor-pointer text-left text-[14px] leading-5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink">{s}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Réponses annoncées aux lecteurs d'écran */}
            <div aria-live="polite" className="flex flex-col gap-5">
              {echanges.map((e) => (
                <article key={e.id} className="flex flex-col gap-3 border-b border-line pb-5 last:border-b-0">
                  <p className="bg-neutral-1 px-3 py-2 text-[14px] leading-5 font-semibold">
                    <span className="sr-only">Ta question : </span>
                    {e.question}
                  </p>
                  {e.enCours ? <p className="text-[14px] leading-5 text-ink-2">Recherche en cours…</p> : e.reponse && <Reponse r={e.reponse} />}
                </article>
              ))}
            </div>
          </div>

          <form onSubmit={envoyer} className="flex flex-col gap-2 border-t border-line px-5 py-4">
            <label htmlFor="assistant-question" className="label text-ink">
              Ta question
            </label>
            <div className="flex gap-2">
              <input
                ref={champ}
                id="assistant-question"
                type="text"
                maxLength={300}
                value={question}
                aria-describedby="assistant-rgpd"
                onChange={(e) => setQuestion(e.target.value)}
                className="h-11 min-w-0 flex-1 border border-field bg-white px-3 text-[14px] text-ink"
              />
              <HpButton role="principal" icon={Send} type="submit" disabled={!question.trim() || enCours}>
                ENVOYER
              </HpButton>
            </div>
            <p id="assistant-rgpd" className="text-[12px] leading-4 text-ink-2">
              Ne saisis pas de données personnelles (noms, santé, situation personnelle).
            </p>
          </form>
        </aside>
      )}
    </>
  );
}
