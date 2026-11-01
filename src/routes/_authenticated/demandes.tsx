import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Encadre } from "@/components/hp/encadre";
import { HpButton } from "@/components/hp/button";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { ReglesArbitrage } from "@/components/hp/regles";
import { RecapTuiles, buildTuiles, type Onglet } from "@/components/hp/recap";
import { DELAI_RELANCE, Tableau, joursOuvres } from "@/components/hp/demandes-ui";
import {
  VISIBILITY_LABEL,
  fetchMyRequests,
  fetchAllRequests,
  fetchToReview,
  fetchValidatedRequests,
  nonLue,
  remindRequest,
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

function DemandesPage() {
  const { email } = useOwnProfile();
  const { role } = Route.useRouteContext();
  const [onglet, setOnglet] = useState<Onglet>(role === "collaborateur" ? "mes" : "traiter");
  const [equipe, setEquipe] = useState("");
  const [tuile, setTuile] = useState<string | null>(null);
  const mes = useQuery({ queryKey: ["requests", "mine", email], enabled: !!email, queryFn: () => fetchMyRequests(email) });
  const atraiter = useQuery({ queryKey: ["requests", "review"], enabled: role !== "collaborateur", queryFn: fetchToReview });
  const validees = useQuery({ queryKey: ["requests", "validated"], queryFn: fetchValidatedRequests });
  const toutes = useQuery({ queryKey: ["requests", "all"], enabled: role !== "collaborateur", queryFn: fetchAllRequests });

  const equipes = useMemo(() => [...new Set((validees.data ?? []).map((r) => r.team))].sort(), [validees.data]);
  const mesL = mes.data ?? [];
  const aTraiterL = atraiter.data ?? [];
  const decideesL = (toutes.data ?? []).filter((r) => r.status !== "en attente");
  const urgent = (r: RequestRow) => joursOuvres(r.created_at) >= DELAI_RELANCE;

  const tuiles = buildTuiles(role, mesL, aTraiterL);
  const actif = tuiles.find((t) => t.id === tuile) ?? null;
  const filtrer = (l: RequestRow[], pour: Onglet) => (actif && actif.onglet === pour ? l.filter(actif.garde) : l);
  const filtrees = filtrer((validees.data ?? []).filter((r) => !equipe || r.team === equipe), "validees");

  const tab = (id: Onglet, label: string, n?: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={onglet === id}
      onClick={() => { setOnglet(id); setTuile(null); }}
      className={cn(
        "label h-11 border-b-2 px-4",
        onglet === id ? "border-b-anthracite bg-neutral-1 text-anthracite" : "border-b-transparent text-ink-2 hover:text-anthracite",
      )}
    >
      {label}{n !== undefined ? ` (${n})` : ""}
    </button>
  );

  const bandeauFiltre = actif && (
    <p className="flex min-h-11 items-center justify-between gap-4 border-t border-line px-6 py-2 text-[14px] leading-5">
      <span>Filtre : <span className="font-semibold">{actif.label}</span></span>
      <button type="button" onClick={() => setTuile(null)} className="underline underline-offset-4 hover:text-ink">Retirer le filtre</button>
    </p>
  );

  return (
    <HpPage>
      <section className="flex flex-col gap-5 border border-line bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">
            {role === "collaborateur" ? "Mes demandes" : "Demandes"}
          </h1>
          <Link to="/deposer" className="contents">
            <HpButton role="publie" icon={Plus}>DÉPOSER UNE DEMANDE</HpButton>
          </Link>
        </div>
        <RecapTuiles tuiles={tuiles} actif={tuile} onChoisir={(t) => { if (!t) return setTuile(null); setOnglet(t.onglet); setTuile(t.id); }} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Encadre
          icon={ClipboardList}
          title={onglet === "mes" ? "Mes demandes" : onglet === "decidees" ? "Demandes décidées : mon équipe" : onglet === "toutes" ? "Toutes les demandes" : onglet === "traiter" ? (role === "manager" ? "Demandes à valider : mon équipe" : "Demandes à valider") : "Demandes visibles par tous"}
          subtitle={onglet === "validees" ? "Lecture seule ; l'auteur d'une demande confidentielle est masqué" : undefined}
          filtre={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div role="tablist" className="flex">
                {role !== "collaborateur" && tab("traiter", "À valider", aTraiterL.length)}
                {role === "manager" && tab("decidees", "Décidées", decideesL.length)}
                {role === "admin" && tab("toutes", "Toutes les demandes", toutes.data?.length)}
                {tab("mes", "Mes demandes", mesL.length)}
                {tab("validees", "Demandes visibles", validees.data?.length)}
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
          {bandeauFiltre}
          {onglet === "traiter" ? (
            <Tableau lignes={filtrer(aTraiterL, "traiter")} perspective="valideur" vide="Aucune demande n'attend ta décision." />
          ) : onglet === "decidees" ? (
            <Tableau lignes={decideesL} perspective="valideur" vide="Aucune demande décidée pour le moment." />
          ) : onglet === "toutes" ? (
            <Tableau lignes={toutes.data ?? []} perspective="valideur" vide="Aucune demande." />
          ) : onglet === "mes" ? (
            mes.isLoading ? (
              <p className="px-6 py-6 text-ink-2">Chargement…</p>
            ) : mes.isError ? (
              <p role="alert" className="px-6 py-6">Tes demandes sont indisponibles pour le moment.</p>
            ) : (
              <Tableau lignes={filtrer(mesL, "mes")} perspective="auteur" vide="Aucune demande dans cet onglet." />
            )
          ) : validees.isLoading ? (
            <p className="px-6 py-6 text-ink-2">Chargement…</p>
          ) : (
            <Tableau lignes={filtrees} perspective="lecteur" vide="Aucune demande ne correspond à ces filtres." />
          )}
        </Encadre>
        <ReglesArbitrage />
      </div>
    </HpPage>
  );
}
