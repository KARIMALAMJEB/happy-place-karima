import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { deltaText, formatMetricValue, TREND_LABELS, type Metric } from "@/lib/dashboard";

export const LABEL_METRIC: Record<string, string> = { training_kpi: "Taux de placement", active_users: "Missions actives" };

const tuile = "flex flex-1 items-center justify-between gap-4 border border-line bg-white px-5 py-4";

export const dateMaj = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

export const derniereMaj = (liste: Metric[]) =>
  (liste as (Metric & { updated_at?: string })[]).map((m) => m.updated_at).filter((d): d is string => !!d).sort().pop();

function Contenu({ m }: { m: Metric }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="label text-ink-2">{LABEL_METRIC[m.key] ?? m.label}</span>
      <span className="font-title text-[28px] leading-9 font-bold whitespace-nowrap text-ink">{formatMetricValue(m.value, m.unit)}</span>
      <span className="text-[12px] leading-4 text-ink-2">{TREND_LABELS[m.trend]}{deltaText(m) ? ` · ${deltaText(m)}` : ""}</span>
    </span>
  );
}

// Tuile cliquable (tableau de bord, vers la page Indicateurs) ou en lecture seule (aperçu)
export function MetricTile({ m, lien }: { m: Metric; lien?: boolean }) {
  if (!lien)
    return (
      <div className={tuile}>
        <Contenu m={m} />
      </div>
    );
  return (
    <Link to="/indicateurs" className={`${tuile} hover:bg-neutral-1`}>
      <Contenu m={m} />
      <ChevronRight size={18} aria-hidden className="text-ink" />
    </Link>
  );
}
