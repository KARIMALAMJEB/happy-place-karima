import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { deltaText, formatMetricValue, TREND_LABELS, type Metric } from "@/lib/dashboard";

export const LABEL_METRIC: Record<string, string> = {};

// Couleurs de la charte, réservées au décor des graphiques (le sens passe toujours par le texte)
const ANTHRACITE = "#28282D";
const ROSE = "#C99695";
const ROSE_CLAIR = "#F5D5D4";
const PECHE = "#F0D0BC";

const tuile = "flex flex-col gap-3 border border-line bg-white p-4";

export const dateMaj = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

type AvecMaj = Metric & { updated_at?: string; updated_by_name?: string | null };

export const derniereMaj = (liste: Metric[]) =>
  (liste as AvecMaj[]).map((m) => m.updated_at).filter((d): d is string => !!d).sort().pop();

// Date et auteur de la mise à jour la plus récente
export function derniereMajPar(liste: Metric[]): { date: string; par: string | null } | undefined {
  const l = (liste as AvecMaj[]).filter((m) => m.updated_at).sort((a, b) => (a.updated_at! < b.updated_at! ? 1 : -1));
  return l.length ? { date: l[0].updated_at!, par: l[0].updated_by_name ?? null } : undefined;
}

export const texteMaj = (m: { date: string; par: string | null }) => `Mis à jour le ${dateMaj(m.date)}${m.par ? ` par ${m.par}` : ""}`;

const W = 120;
const H = 36;
const echelle = (serie: number[]) => {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const plage = max - min || 1;
  return serie.map((v, i) => ({ x: serie.length === 1 ? W / 2 : (i / (serie.length - 1)) * W, y: H - 4 - ((v - min) / plage) * (H - 10) }));
};

// Courbe d'évolution avec aire douce et point final
function Courbe({ serie }: { serie: number[] }) {
  const pts = echelle(serie);
  const ligne = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const aire = `${ligne} L${W},${H} L0,${H} Z`;
  const fin = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      <path d={aire} fill={ROSE_CLAIR} />
      <path d={ligne} fill="none" stroke={ANTHRACITE} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={fin.x} cy={fin.y} r="2.5" fill={ROSE} stroke={ANTHRACITE} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Barres mensuelles, la dernière en anthracite
function Barres({ serie }: { serie: number[] }) {
  const max = Math.max(...serie) || 1;
  const l = W / serie.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      {serie.map((v, i) => {
        const h = Math.max(3, (v / max) * (H - 4));
        return <rect key={i} x={i * l + 2} y={H - h} width={l - 4} height={h} fill={i === serie.length - 1 ? ANTHRACITE : PECHE} />;
      })}
    </svg>
  );
}

// Jauge de taux (0 à 100 %)
function Jauge({ valeur }: { valeur: number }) {
  const pct = Math.max(0, Math.min(100, valeur));
  return (
    <svg viewBox={`0 0 ${W} 12`} preserveAspectRatio="none" className="h-3 w-full" aria-hidden>
      <rect x="0" y="2" width={W} height="8" fill={ROSE_CLAIR} />
      <rect x="0" y="2" width={(pct / 100) * W} height="8" fill={ROSE} />
      <rect x={(pct / 100) * W - 1} y="0" width="2" height="12" fill={ANTHRACITE} />
    </svg>
  );
}

function Graphique({ m, serie }: { m: Metric; serie?: number[] }) {
  if (m.unit === "%") return <Jauge valeur={Number(m.value)} />;
  if (!serie || serie.length < 2) return null;
  return m.unit === "j" ? <Barres serie={serie} /> : <Courbe serie={serie} />;
}

function Contenu({ m, serie, lien }: { m: Metric; serie?: number[]; lien?: boolean }) {
  const a = m as AvecMaj;
  const evolution = serie && serie.length > 1 ? `Évolution sur ${serie.length} mois : de ${formatMetricValue(serie[0], m.unit)} à ${formatMetricValue(serie[serie.length - 1], m.unit)}.` : "";
  return (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="label text-ink-2">{LABEL_METRIC[m.key] ?? m.label}</span>
        {lien && <ChevronRight size={18} aria-hidden className="shrink-0 text-ink" />}
      </span>
      <span className="font-title text-[32px] leading-10 font-bold whitespace-nowrap text-ink">{formatMetricValue(m.value, m.unit)}</span>
      <Graphique m={m} serie={serie} />
      {evolution && <span className="sr-only">{evolution}</span>}
      <span className="text-[12px] leading-4 text-ink-2">
        {TREND_LABELS[m.trend]}
        {deltaText(m) ? ` · ${deltaText(m)}` : ""}
      </span>
      {a.updated_at && (
        <span className="border-t border-line pt-2 text-[12px] leading-4 text-ink-2">
          {texteMaj({ date: a.updated_at, par: a.updated_by_name ?? null })}
        </span>
      )}
    </>
  );
}

// Tuile cliquable (tableau de bord, vers la page Indicateurs) ou en lecture seule (aperçu)
export function MetricTile({ m, serie, lien }: { m: Metric; serie?: number[]; lien?: boolean }) {
  if (!lien)
    return (
      <div className={tuile}>
        <Contenu m={m} serie={serie} />
      </div>
    );
  return (
    <Link to="/indicateurs" className={`${tuile} hover:bg-neutral-1`}>
      <Contenu m={m} serie={serie} lien />
    </Link>
  );
}
