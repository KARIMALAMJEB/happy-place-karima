import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Encadre } from "@/components/hp/encadre";
import { HpButton } from "@/components/hp/button";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { BloquanteMot, StatutBadge } from "@/components/hp/statut";
import {
  VISIBILITY_LABEL,
  fetchMyRequests,
  fetchValidatedRequests,
  refOf,
  stateOf,
  titleOf,
  type RequestRow,
} from "@/lib/requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/demandes")({
  head: () => ({ meta: [{ title: "Demandes — Happy Place" }] }),
  component: DemandesPage,
});

const date = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

function Ligne({ r, auteur }: { r: RequestRow; auteur: boolean }) {
  const etat = stateOf(r);
  return (
    <li className="flex flex-col gap-2 border-t border-line px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] leading-4 text-ink-2">
            {refOf(r)} · {r.team}
            {!auteur && (r.confidential_identity ? " · Auteur confidentiel" : ` · ${r.author_name}`)}
          </span>
          <span className="text-[16px] leading-6 font-semibold text-ink">{titleOf(r)}</span>
          <span className="text-[12px] leading-4 text-ink-2">
            <BloquanteMot bloquante={r.blocking} /> · {VISIBILITY_LABEL[r.visibility]} · Déposée le {date(r.created_at)}
          </span>
        </div>
        <StatutBadge state={etat} />
      </div>
      {etat === "refusee" && r.rejection_note && (
        <p className="text-[14px] leading-5 text-ink-2">Motif : {r.rejection_category}. {r.rejection_note}</p>
      )}
      {etat === "a_completer" && (
        <p className="text-[14px] leading-5 text-ink-2">
          On te demande des précisions : {r.rejection_note ?? "réponds aux questions posées."}
        </p>
      )}
    </li>
  );
}

function DemandesPage() {
  const { email } = useOwnProfile();
  const [onglet, setOnglet] = useState<"mes" | "validees">("mes");
  const [equipe, setEquipe] = useState("");
  const mes = useQuery({ queryKey: ["requests", "mine", email], enabled: !!email, queryFn: () => fetchMyRequests(email) });
  const validees = useQuery({ queryKey: ["requests", "validated"], queryFn: fetchValidatedRequests });

  const equipes = useMemo(() => [...new Set((validees.data ?? []).map((r) => r.team))].sort(), [validees.data]);
  const filtrees = (validees.data ?? []).filter((r) => !equipe || r.team === equipe);

  const tab = (id: "mes" | "validees", label: string, n?: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={onglet === id}
      onClick={() => setOnglet(id)}
      className={cn(
        "label h-11 border-b-2 px-4",
        onglet === id ? "border-b-anthracite bg-neutral-1 text-anthracite" : "border-b-transparent text-ink-2 hover:text-anthracite",
      )}
    >
      {label}{n !== undefined ? ` (${n})` : ""}
    </button>
  );

  return (
    <HpPage>
      <section className="flex flex-col gap-4 border border-line bg-white px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">Demandes</h1>
        <Link to="/deposer" className="contents">
          <HpButton role="publie" icon={Plus}>DÉPOSER UNE DEMANDE</HpButton>
        </Link>
      </section>

      <Encadre
        icon={ClipboardList}
        title={onglet === "mes" ? "Mes demandes" : "Demandes validées"}
        compteur={onglet === "mes" ? `${mes.data?.length ?? 0} demande(s)` : `${filtrees.length} demande(s)`}
        filtre={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div role="tablist" className="flex">
              {tab("mes", "Mes demandes", mes.data?.length)}
              {tab("validees", "Demandes validées", validees.data?.length)}
            </div>
            {onglet === "validees" && (
              <select
                aria-label="Filtrer par équipe"
                value={equipe}
                onChange={(e) => setEquipe(e.target.value)}
                className="min-h-11 border border-field bg-white px-3 text-[14px] text-ink"
              >
                <option value="">Toutes les équipes</option>
                {equipes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        }
      >
        {onglet === "mes" ? (
          mes.isLoading ? (
            <p className="px-6 py-6 text-ink-2">Chargement…</p>
          ) : mes.isError ? (
            <p role="alert" className="px-6 py-6">Tes demandes sont indisponibles pour le moment.</p>
          ) : (mes.data ?? []).length === 0 ? (
            <p className="px-6 py-6 text-ink-2">Tu n'as pas encore déposé de demande.</p>
          ) : (
            <ul>{(mes.data ?? []).map((r) => <Ligne key={r.id} r={r} auteur />)}</ul>
          )
        ) : validees.isLoading ? (
          <p className="px-6 py-6 text-ink-2">Chargement…</p>
        ) : filtrees.length === 0 ? (
          <p className="px-6 py-6 text-ink-2">Aucune demande validée à afficher.</p>
        ) : (
          <ul>{filtrees.map((r) => <Ligne key={r.id} r={r} auteur={false} />)}</ul>
        )}
      </Encadre>
    </HpPage>
  );
}
