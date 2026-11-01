import { Bold, Highlighter, Italic, Link2, List, Quote } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { HpIconButton as IconButton } from "@/components/hp/button";
import { cn } from "@/lib/utils";

// Texte enrichi conforme à la charte. Syntaxe stockée dans le texte :
// lignes : « ## » titre, « ### » sous-titre, « > » citation, « - » liste à puces
// en ligne : **gras**, *italique*, ==surligné== (fond neutre), {{texte secondaire}} (gris), [lien](https://…)
// Aucune autre couleur : rouge, vert et ambre sont réservés aux statuts, le rose poudré n'est jamais un texte.
const EN_LIGNE = /(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==|\{\{[^}]+\}\}|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function Ligne({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(EN_LIGNE).map((m, k): ReactNode => {
        if (m.startsWith("**") && m.endsWith("**") && m.length > 4) return <strong key={k}>{m.slice(2, -2)}</strong>;
        if (m.startsWith("==") && m.endsWith("==") && m.length > 4) return <mark key={k} className="bg-neutral-1 px-0.5 text-ink">{m.slice(2, -2)}</mark>;
        if (m.startsWith("{{") && m.endsWith("}}")) return <span key={k} className="text-ink-2">{m.slice(2, -2)}</span>;
        if (m.startsWith("*") && m.endsWith("*") && m.length > 2) return <em key={k}>{m.slice(1, -1)}</em>;
        const lien = m.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
        if (lien)
          return (
            <a key={k} href={lien[2]} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
              {lien[1]}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          );
        return m;
      })}
    </>
  );
}

export function RichText({ texte }: { texte: string }) {
  const blocs: ReactNode[] = [];
  let puces: string[] = [];
  const viderPuces = () => {
    if (puces.length) {
      const items = puces;
      blocs.push(
        <ul key={`ul-${blocs.length}`} className="list-disc pl-6">
          {items.map((p, i) => (
            <li key={i}>
              <Ligne texte={p} />
            </li>
          ))}
        </ul>,
      );
      puces = [];
    }
  };
  texte.split("\n").forEach((ligne, i) => {
    if (ligne.startsWith("- ")) return void puces.push(ligne.slice(2));
    viderPuces();
    if (ligne.startsWith("### ")) blocs.push(<h4 key={i} className="label text-ink"><Ligne texte={ligne.slice(4)} /></h4>);
    else if (ligne.startsWith("## ")) blocs.push(<h3 key={i} className="font-title text-[20px] leading-7 font-bold"><Ligne texte={ligne.slice(3)} /></h3>);
    else if (ligne.startsWith("> ")) blocs.push(<blockquote key={i} className="border-l-[3px] border-anthracite bg-neutral-1 px-4 py-2"><Ligne texte={ligne.slice(2)} /></blockquote>);
    else blocs.push(<p key={i} className="min-h-5"><Ligne texte={ligne} /></p>);
  });
  viderPuces();
  return <>{blocs}</>;
}

// Texte brut (extraits, e-mails) : retire les marques de mise en forme
export const texteBrut = (t: string) =>
  t
    .replace(/^(#{2,3}|>|-) /gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/\{\{([^}]+)\}\}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const STYLES = [
  { valeur: "", label: "Paragraphe" },
  { valeur: "## ", label: "Titre" },
  { valeur: "### ", label: "Sous-titre" },
] as const;

// Éditeur : textarea + encadré de mise en forme (styles, gras, italique, liste, citation, lien, couleurs de la charte) + aperçu
export function RichTextEditor({ id, value, onChange, maxLength, rows = 6, invalide, decritPar }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  rows?: number;
  invalide?: boolean;
  decritPar?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const appliquer = (nouveau: string, debut: number, fin: number) => {
    onChange(maxLength ? nouveau.slice(0, maxLength) : nouveau);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(debut, fin);
    });
  };
  // Entoure la sélection (ou un texte d'exemple) de marques en ligne
  const entourer = (avant: string, apres: string, defaut: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const choisi = value.slice(a, b) || defaut;
    appliquer(value.slice(0, a) + avant + choisi + apres + value.slice(b), a + avant.length, a + avant.length + choisi.length);
  };
  // Applique un préfixe de ligne (style, liste, citation) aux lignes sélectionnées
  const prefixer = (prefixe: string) => {
    const el = ref.current;
    if (!el) return;
    const debut = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const finSel = value.indexOf("\n", el.selectionEnd);
    const fin = finSel === -1 ? value.length : finSel;
    const lignes = value
      .slice(debut, fin)
      .split("\n")
      .map((l) => prefixe + l.replace(/^(#{2,3}|>|-) /, ""));
    const bloc = lignes.join("\n");
    appliquer(value.slice(0, debut) + bloc + value.slice(fin), debut, debut + bloc.length);
  };

  const outil = "border-0 bg-transparent";
  return (
    <div className="flex flex-col">
      <div role="toolbar" aria-label="Mise en forme du texte" aria-controls={id} className="flex flex-wrap items-center gap-1 border border-b-0 border-field bg-neutral-1 p-1">
        <label className="flex items-center gap-2 pr-2">
          <span className="sr-only">Style du paragraphe</span>
          <select
            defaultValue=""
            onChange={(e) => {
              prefixer(e.target.value);
              e.target.value = "";
            }}
            className="h-11 border border-field bg-white px-2 text-[14px] text-ink"
          >
            <option value="" disabled hidden>
              Style
            </option>
            {STYLES.map((s) => (
              <option key={s.label} value={s.valeur}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <IconButton icon={Bold} label="Gras" className={outil} onClick={() => entourer("**", "**", "texte en gras")} />
        <IconButton icon={Italic} label="Italique" className={outil} onClick={() => entourer("*", "*", "texte en italique")} />
        <IconButton icon={List} label="Liste à puces" className={outil} onClick={() => prefixer("- ")} />
        <IconButton icon={Quote} label="Citation" className={outil} onClick={() => prefixer("> ")} />
        <IconButton icon={Link2} label="Insérer un lien" className={outil} onClick={() => entourer("[", "](https://)", "texte du lien")} />
        <span aria-hidden className="mx-1 h-6 w-px bg-line" />
        <span className="label px-1 text-ink-2">Couleur</span>
        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            const { selectionStart: a, selectionEnd: b } = el;
            const choisi = value.slice(a, b).replace(/^\{\{|\}\}$/g, "");
            appliquer(value.slice(0, a) + choisi + value.slice(b), a, a + choisi.length);
          }}
          className="inline-flex h-11 items-center gap-2 px-2 text-[14px] text-ink cursor-pointer hover:bg-white"
        >
          <span aria-hidden className="size-3 bg-ink" />
          Principal
        </button>
        <button type="button" onClick={() => entourer("{{", "}}", "texte secondaire")} className="inline-flex h-11 items-center gap-2 px-2 text-[14px] text-ink cursor-pointer hover:bg-white">
          <span aria-hidden className="size-3 bg-ink-2" />
          Secondaire
        </button>
        <IconButton icon={Highlighter} label="Surligner (fond neutre)" className={outil} onClick={() => entourer("==", "==", "texte surligné")} />
      </div>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalide}
        aria-describedby={[`${id}-palette`, decritPar].filter(Boolean).join(" ")}
        className="min-h-11 w-full border border-field bg-white px-3 py-2 text-[14px] leading-5 text-ink"
      />
      <p id={`${id}-palette`} className="mt-1 text-[12px] leading-4 text-ink-2">
        Couleurs limitées à la charte : le rouge, le vert et l'ambre sont réservés aux statuts.
      </p>
      {value.trim() && (
        <details className="mt-2 border border-line">
          <summary className="label flex min-h-11 cursor-pointer items-center px-3 text-ink">Aperçu de la mise en forme</summary>
          <div className={cn("flex flex-col gap-2 border-t border-line px-4 py-3 text-[14px] leading-6")}>
            <RichText texte={value} />
          </div>
        </details>
      )}
    </div>
  );
}
