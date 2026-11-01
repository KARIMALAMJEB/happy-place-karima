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
  fetchToReview,
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
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

// Jours ouvrés (lundi à vendredi) écoulés depuis une date
function joursOuvres(depuis: string) {
  const d = new Date(depuis);
  const fin = new Date();
  let n = 0;
  for (const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); c <= fin; c.setDate(c.getDate() + 1)) {
    if (c.getDay() !== 0 && c.getDay() !== 6) n++;
  }
  return n;
}
const DELAI_RELANCE = 5;
const jo = (n: number) => `${n} jour${n > 1 ? "s" : ""} ouvré${n > 1 ? "s" : ""}`;

type Perspective = "auteur" | "valideur" | "lecteur";

// Grille du prototype : Demande | Visibilité | Déposée le | Statut et nature | Action
const GRILLE =
  "grid grid-cols-[minmax(0,1fr)_176px_88px_120px_128px] gap-x-2 @min-[820px]:grid-cols-[minmax(0,1fr)_176px_104px_152px_200px] @min-[820px]:gap-x-4";

const Info = ({ children }: { children: React.ReactNode }) => <span className="text-[12px] leading-4 text-ink-2">{children}</span>;
const LIEN = "relative z-10 text-[14px] leading-5 font-semibold text-ink underline underline-offset-4 hover:text-anthracite";

function Action({ r, perspective }: { r: RequestRow; perspective: Perspective }) {
  const etat = stateOf(r);
  const detail = { to: "/demande/$id" as const, params: { id: r.id } };
  if (perspective === "auteur") {
    if (etat === "a_completer") return <Link {...detail} className={LIEN}>Compléter</Link>;
    if (etat === "en_attente") {
      const ecoules = joursOuvres(r.created_at);
      if (ecoules < DELAI_RELANCE) return <Info>Relance possible dans {jo(DELAI_RELANCE - ecoules)}</Info>;
      return <Info>En attente depuis {jo(ecoules)}</Info>;
    }
  }
  return <Link {...detail} className={LIEN}>{perspective === "valideur" && etat === "en_attente" ? "Traiter" : "Consulter"}</Link>;
}

function Ligne({ r, perspective }: { r: RequestRow; perspective: Perspective }) {
  const etat = stateOf(r);
  const auteur = perspective === "auteur" ? null : r.confidential_identity && perspective === "lecteur" ? "Auteur confidentiel" : r.author_name;
  const attente = etat === "en_attente" ? joursOuvres(r.created_at) : 0;
  return (
    <div role="row" className={cn(GRILLE, "relative min-h-16 items-center border-t border-line bg-white py-2 pr-4 pl-6")}>
      <span role="cell" className="flex min-w-0 flex-col gap-0.5">
        <Link
          to="/demande/$id"
          params={{ id: r.id }}
          className="block py-0.5 text-[14px] leading-5 font-semibold break-words text-ink after:absolute after:inset-0 hover:underline"
        >
          {titleOf(r)}
        </Link>
        <span className="text-[12px] leading-4 text-ink-2">
          {refOf(r)} · {r.team}{auteur ? ` · ${auteur}` : ""}
        </span>
      </span>
      <span role="cell" className="text-[12px] leading-4 text-ink-2">{VISIBILITY_LABEL[r.visibility]}</span>
      <span role="cell" className="text-[12px] leading-4 text-ink-2">{date(r.created_at)}</span>
      <span role="cell" className="flex flex-col items-start gap-1">
        <StatutBadge state={etat} />
        {r.blocking && <BloquanteMot bloquante />}
        {perspective === "valideur" && attente >= DELAI_RELANCE && <Info>À traiter : depuis {jo(attente)}</Info>}
      </span>
      <span role="cell"><Action r={r} perspective={perspective} /></span>
    </div>
  );
}

function Tableau({ lignes, perspective, vide }: { lignes: RequestRow[]; perspective: Perspective; vide: string }) {
  return (
    <div role="table" aria-label="Demandes" className="@container flex flex-col">
      <div role="row" className={cn(GRILLE, "label min-h-11 items-center border-t border-line bg-neutral-1 pr-4 pl-6 text-ink-2")}>
        <span role="columnheader">Demande</span>
        <span role="columnheader">Visibilité</span>
        <span role="columnheader">Déposée le</span>
        <span role="columnheader">Statut et nature</span>
        <span role="columnheader">Action</span>
      </div>
      {lignes.length === 0 ? (
        <p className="flex min-h-16 items-center border-t border-line px-6 text-[14px] leading-5 text-ink-2">{vide}</p>
      ) : (
        lignes.map((r) => <Ligne key={r.id} r={r} perspective={perspective} />)
      )}
    </div>
  );
}

function DemandesPage() {
  const { email } = useOwnProfile();
  const { role } = Route.useRouteContext();
  const [onglet, setOnglet] = useState<"mes" | "validees" | "traiter">(role === "collaborateur" ? "mes" : "traiter");
  const [equipe, setEquipe] = useState("");
  const mes = useQuery({ queryKey: ["requests", "mine", email], enabled: !!email, queryFn: () => fetchMyRequests(email) });
  const atraiter = useQuery({ queryKey: ["requests", "review"], enabled: role !== "collaborateur", queryFn: fetchToReview });
  const validees = useQuery({ queryKey: ["requests", "validated"], queryFn: fetchValidatedRequests });

  const equipes = useMemo(() => [...new Set((validees.data ?? []).map((r) => r.team))].sort(), [validees.data]);
  const filtrees = (validees.data ?? []).filter((r) => !equipe || r.team === equipe);

  const tab = (id: "mes" | "validees" | "traiter", label: string, n?: number) => (
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
        title={onglet === "mes" ? "Mes demandes" : onglet === "traiter" ? "Demandes à traiter" : "Demandes validées"}
        compteur={`${onglet === "mes" ? (mes.data?.length ?? 0) : onglet === "traiter" ? (atraiter.data?.length ?? 0) : filtrees.length} demande(s)`}
        filtre={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div role="tablist" className="flex">
              {role !== "collaborateur" && tab("traiter", "À traiter", atraiter.data?.length)}
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
        {onglet === "traiter" ? (
          <Tableau lignes={atraiter.data ?? []} perspective="valideur" vide="Aucune demande en attente de décision." />
        ) : onglet === "mes" ? (
          mes.isLoading ? (
            <p className="px-6 py-6 text-ink-2">Chargement…</p>
          ) : mes.isError ? (
            <p role="alert" className="px-6 py-6">Tes demandes sont indisponibles pour le moment.</p>
          ) : (
            <Tableau lignes={mes.data ?? []} perspective="auteur" vide="Tu n'as pas encore déposé de demande." />
          )
        ) : validees.isLoading ? (
          <p className="px-6 py-6 text-ink-2">Chargement…</p>
        ) : (
          <Tableau lignes={filtrees} perspective="lecteur" vide="Aucune demande validée à afficher." />
        )}
      </Encadre>
    </HpPage>
  );
}
