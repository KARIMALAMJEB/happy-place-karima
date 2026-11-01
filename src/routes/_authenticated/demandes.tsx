import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Encadre } from "@/components/hp/encadre";
import { HpButton } from "@/components/hp/button";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { ReglesArbitrage } from "@/components/hp/regles";
import { TabButton, TabList } from "@/components/hp/tabs";
import { BandeauFiltre, RecapTuiles, buildTuiles, type Onglet, type Tuile } from "@/components/hp/recap";
import { cn } from "@/lib/utils";
import { Tableau, type Perspective } from "@/components/hp/demandes-ui";
import {
  fetchMyRequests,
  fetchAllRequests,
  fetchToReview,
  fetchValidatedRequests,
  stateOf,
  STATE_LABEL,
  type RequestRow,
  type RequestState,
} from "@/lib/requests";

export const Route = createFileRoute("/_authenticated/demandes")({
  head: () => ({ meta: [{ title: "Demandes — Happy Place" }] }),
  component: DemandesPage,
});

type Statut = "tous" | RequestState;
const ETATS: RequestState[] = ["en_attente", "a_completer", "validee", "refusee"];

// Barre d'onglets de statut d'une liste (Toutes, En attente, À compléter, Validées, Refusées), avec compteurs
function BarreStatuts({ liste, statut, onChoisir }: { liste: RequestRow[]; statut: Statut; onChoisir: (s: Statut) => void }) {
  return (
    <div className="overflow-x-auto border-b border-line px-6 py-3">
      <TabList label="Filtrer par statut">
        <TabButton active={statut === "tous"} onClick={() => onChoisir("tous")}>{`Toutes (${liste.length})`}</TabButton>
        {ETATS.map((e) => (
          <TabButton key={e} active={statut === e} onClick={() => onChoisir(e)}>
            {`${STATE_LABEL[e]} (${liste.filter((r) => stateOf(r) === e).length})`}
          </TabButton>
        ))}
      </TabList>
    </div>
  );
}

// Encadré de demandes avec onglets de statut ; un filtre de tuile actif remplace la liste par la liste filtrée
function BlocStatuts({ id, titre, sousTitre, liste, perspective, vide, tuile, onRetirer }: {
  id: string; titre: string; sousTitre?: string; liste: RequestRow[]; perspective: Perspective; vide: string;
  tuile: Tuile | null; onRetirer: () => void;
}) {
  const [statut, setStatut] = useState<Statut>("tous");
  const base = tuile ? liste.filter(tuile.garde) : liste;
  const lignes = statut === "tous" ? base : base.filter((r) => stateOf(r) === statut);
  return (
    <Encadre id={id} icon={ClipboardList} title={titre} subtitle={sousTitre} compteur={`${base.length} demande${base.length > 1 ? "s" : ""}`}>
      {tuile && (
        <div className="border-b border-line px-6 py-3">
          <BandeauFiltre label={tuile.label} n={base.length} onRetirer={onRetirer} />
        </div>
      )}
      <BarreStatuts liste={base} statut={statut} onChoisir={setStatut} />
      <Tableau lignes={lignes} perspective={perspective} vide={vide} />
    </Encadre>
  );
}


const PAR_PAGE = 5;

function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-line px-6 py-2">
      <p className="text-[12px] leading-4 text-ink-2" aria-live="polite">Page {page + 1} sur {pages} · {total} demandes</p>
      <div className="flex items-center gap-1">
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-current={i === page ? "page" : undefined}
            aria-label={`Page ${i + 1}`}
            onClick={() => onPage(i)}
            className={cn("label inline-flex size-11 cursor-pointer items-center justify-center border-b-2", i === page ? "border-b-anthracite bg-neutral-1 text-anthracite" : "border-b-transparent text-ink-2 hover:text-anthracite")}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Demandes en lecture seule (visibles par tous, ou toutes pour l'admin) : filtres équipe, nature, statut ; 5 par page
function BlocLecture({ id, titre, sousTitre, liste, equipes, etats, perspective, chargement }: {
  id: string; titre: string; sousTitre: string; liste: RequestRow[]; equipes: string[]; etats: RequestState[]; perspective: Perspective; chargement?: boolean;
}) {
  const [equipe, setEquipe] = useState("");
  const [nature, setNature] = useState("");
  const [etat, setEtat] = useState("");
  const [page, setPage] = useState(0);
  const filtrees = liste.filter(
    (r) => (!equipe || r.team === equipe) && (!nature || (nature === "bloquante") === !!r.blocking) && (!etat || stateOf(r) === etat),
  );
  const pages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const p = Math.min(page, pages - 1);
  const select = "min-h-11 border border-field bg-white px-3 text-[14px] text-ink";
  const change = (f: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => { f(e.target.value); setPage(0); };
  return (
    <Encadre
      id={id}
      icon={ClipboardList}
      title={titre}
      subtitle={sousTitre}
      compteur={`${filtrees.length} sur ${liste.length}`}
      filtre={
        <>
          <select aria-label="Filtrer par équipe" value={equipe} onChange={change(setEquipe)} className={select}>
            <option value="">Toutes les équipes</option>
            {equipes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Filtrer par nature" value={nature} onChange={change(setNature)} className={select}>
            <option value="">Toutes natures</option>
            <option value="bloquante">Bloquante</option>
            <option value="non-bloquante">Non bloquante</option>
          </select>
          <select aria-label="Filtrer par statut" value={etat} onChange={change(setEtat)} className={select}>
            <option value="">Tous statuts</option>
            {etats.map((e) => <option key={e} value={e}>{STATE_LABEL[e]}</option>)}
          </select>
        </>
      }
    >
      {chargement ? (
        <p className="px-6 py-6 text-ink-2">Chargement…</p>
      ) : (
        <Tableau lignes={filtrees.slice(p * PAR_PAGE, p * PAR_PAGE + PAR_PAGE)} perspective={perspective} vide="Aucune demande ne correspond à ces filtres." />
      )}
      <Pagination page={p} pages={pages} total={filtrees.length} onPage={setPage} />
    </Encadre>
  );
}

function DemandesPage() {
  const { email } = useOwnProfile();
  const { role } = Route.useRouteContext();
  const [tuile, setTuile] = useState<string | null>(null);
  const mes = useQuery({ queryKey: ["requests", "mine", email], enabled: !!email, queryFn: () => fetchMyRequests(email) });
  const atraiter = useQuery({ queryKey: ["requests", "review"], enabled: role !== "collaborateur", queryFn: fetchToReview });
  const validees = useQuery({ queryKey: ["requests", "validated"], queryFn: fetchValidatedRequests });
  const toutes = useQuery({ queryKey: ["requests", "all"], enabled: role !== "collaborateur", queryFn: fetchAllRequests });

  const equipes = useMemo(() => [...new Set((validees.data ?? []).map((r) => r.team))].sort(), [validees.data]);
  const mesL = mes.data ?? [];
  const aTraiterL = atraiter.data ?? [];
  const decideesL = (toutes.data ?? []).filter((r) => r.status !== "en attente");

  const tuiles = buildTuiles(role, mesL, aTraiterL);
  const actif = tuiles.find((t) => t.id === tuile) ?? null;
  const pour = (o: Onglet) => (actif && actif.onglet === o ? actif : null);
  const retirer = () => setTuile(null);

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
        <RecapTuiles
          tuiles={tuiles}
          actif={tuile}
          onChoisir={(t) => {
            setTuile(t ? t.id : null);
            if (t) requestAnimationFrame(() => document.getElementById(t.onglet === "traiter" ? "a-valider" : "mes-demandes")?.scrollIntoView({ block: "start", behavior: "smooth" }));
          }}
        />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-6">
          {role !== "collaborateur" && (
            <BlocStatuts
              id="a-valider"
              titre={role === "manager" ? "Demandes à valider : mon équipe" : "Demandes à valider"}
              liste={aTraiterL}
              perspective="valideur"
              vide="Aucune demande n'attend ta décision."
              tuile={pour("traiter")}
              onRetirer={retirer}
            />
          )}
          {role === "manager" && (
            <BlocStatuts id="decidees" titre="Demandes décidées : mon équipe" liste={decideesL} perspective="valideur" vide="Aucune demande décidée pour le moment." tuile={null} onRetirer={retirer} />
          )}
          {role === "admin" && (
            <BlocLecture id="toutes" titre="Toutes les demandes" sousTitre="Lecture seule, toutes équipes" liste={toutes.data ?? []} equipes={[...new Set((toutes.data ?? []).map((r) => r.team))].sort()} etats={["en_attente", "a_completer", "validee", "refusee"]} perspective="valideur" />
          )}

          {mes.isError ? (
            <p role="alert" className="border border-line bg-white px-6 py-6">Tes demandes sont indisponibles pour le moment.</p>
          ) : (
            <BlocStatuts id="mes-demandes" titre="Mes demandes" liste={mesL} perspective="auteur" vide="Aucune demande dans ce statut." tuile={pour("mes")} onRetirer={retirer} />
          )}

          <BlocLecture id="demandes-visibles" titre="Demandes visibles par tous" sousTitre="Lecture seule ; l'auteur d'une demande confidentielle est masqué" liste={validees.data ?? []} equipes={equipes} etats={["en_attente", "validee"]} perspective="lecteur" chargement={validees.isLoading} />
        </div>
        <ReglesArbitrage />
      </div>
    </HpPage>
  );
}
