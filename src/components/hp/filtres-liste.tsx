import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

// Filtres communs aux listes que l'admin (qui gère beaucoup de personnes) doit pouvoir trier : recherche par nom ou mot, équipe, date
export type Periode = "" | "7" | "30" | "90";

export const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export const dansPeriode = (iso: string | null | undefined, p: Periode) => !p || (!!iso && Date.now() - new Date(iso).getTime() <= Number(p) * 86_400_000);
export const correspond = (q: string, ...champs: (string | null | undefined)[]) => {
  const t = sansAccents(q.trim());
  return !t || sansAccents(champs.filter(Boolean).join(" ")).includes(t);
};
export const equipesDe = (valeurs: (string | null | undefined)[]) => [...new Set(valeurs.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "fr"));

const select = "min-h-11 border border-field bg-white px-3 text-[14px] leading-5 text-ink";

export function BarreFiltres({ recherche, onRecherche, placeholder, equipe, onEquipe, equipes, periode, onPeriode, onReinitialiser, actifs, children }: {
  recherche: string; onRecherche: (v: string) => void; placeholder: string;
  equipe: string; onEquipe: (v: string) => void; equipes: string[];
  periode: Periode; onPeriode: (v: Periode) => void;
  onReinitialiser: () => void; actifs: boolean; children?: ReactNode;
}) {
  return (
    <div role="search" className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-[240px] flex-1">
        <span className="sr-only">Rechercher</span>
        <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" />
        <input
          type="search"
          value={recherche}
          onChange={(e) => onRecherche(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 w-full border border-field bg-white pr-3 pl-9 text-[14px] leading-5 text-ink"
        />
      </label>
      <select aria-label="Filtrer par équipe" value={equipe} onChange={(e) => onEquipe(e.target.value)} className={select}>
        <option value="">Toutes les équipes</option>
        {equipes.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select aria-label="Filtrer par date" value={periode} onChange={(e) => onPeriode(e.target.value as Periode)} className={select}>
        <option value="">Toutes les dates</option>
        <option value="7">7 derniers jours</option>
        <option value="30">30 derniers jours</option>
        <option value="90">90 derniers jours</option>
      </select>
      {children}
      {actifs && (
        <button type="button" onClick={onReinitialiser} className="inline-flex h-11 cursor-pointer items-center gap-1.5 px-1 text-[14px] leading-5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink">
          <X size={14} aria-hidden />
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
