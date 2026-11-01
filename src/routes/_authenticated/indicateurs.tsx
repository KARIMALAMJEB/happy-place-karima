import { Link, createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SquarePen } from "lucide-react";
import { HpPage } from "@/components/hp/page";
import { hpButtonVariants } from "@/components/hp/button";
import { deltaText, fetchMetrics, formatMetricValue, TREND_LABELS } from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/indicateurs")({
  head: () => ({ meta: [{ title: "Happy Place — Indicateurs" }] }),
  component: Indicateurs,
});

const LABEL_METRIC: Record<string, string> = { training_kpi: "Taux de placement", active_users: "Missions actives" };

const maj = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

function Indicateurs() {
  return (
    <HpPage>
      <Page />
    </HpPage>
  );
}

function Page() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics, retry: false });
  const liste = metrics.data ?? [];
  const derniere = (metrics.data as ({ updated_at?: string } & Record<string, unknown>)[] | undefined)
    ?.map((m) => m.updated_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/" className={hpButtonVariants({ role: "consulte" })}>
          <ArrowLeft size={16} aria-hidden />
          <span>RETOUR AU TABLEAU DE BORD</span>
        </Link>
      </div>
      <header className="flex flex-wrap items-end justify-between gap-6 border border-line bg-white px-8 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] leading-[44px]">Indicateurs de performance de l'entreprise</h1>
          <p className="text-[16px] leading-6">
            Ces indicateurs sont saisis par l'admin. Ils s'affichent sur le tableau de bord de tous les collaborateurs.
          </p>
        </div>
        {role === "admin" && (
          <Link to="/manage/metrics" className={hpButtonVariants({ role: "modifie" })}>
            <SquarePen size={16} aria-hidden />
            <span>SAISIR LES INDICATEURS</span>
          </Link>
        )}
      </header>

      <section className="flex flex-col border border-line border-l-4 border-l-anthracite bg-white">
        <div className="flex flex-col gap-1 border-b border-line bg-neutral-1 px-6 py-4">
          <h2 className="text-[22px] leading-7 text-anthracite">Indicateurs clés</h2>
          <p className="text-[14px] leading-5">Performance de l'entreprise</p>
        </div>
        {metrics.isError ? (
          <p role="alert" className="px-6 py-6">Les indicateurs sont indisponibles.</p>
        ) : metrics.isLoading ? (
          <p className="px-6 py-6 text-ink-2">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Aucun indicateur.</p>
        ) : (
          <ul className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {liste.map((m) => (
              <li key={m.key} className="flex items-center justify-between gap-4 border border-line bg-white px-5 py-4">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="label text-ink-2">{LABEL_METRIC[m.key] ?? m.label}</span>
                  <span className="font-title text-[28px] leading-9 font-bold whitespace-nowrap text-ink">{formatMetricValue(m.value, m.unit)}</span>
                  <span className="text-[12px] leading-4 text-ink-2">
                    {TREND_LABELS[m.trend]}
                    {deltaText(m) ? ` · ${deltaText(m)}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {derniere && <p className="border-t border-line px-6 py-4 text-[12px] leading-4 text-ink-2">Mis à jour le {maj(derniere)}</p>}
      </section>
    </div>
  );
}
