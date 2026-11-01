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

function DemandesPage() {
  const { email } = useOwnProfile();
  const { role } = Route.useRouteContext();
  const [equipe, setEquipe] = useState("");
  const [nature, setNature] = useState("");
  const [statutVisibles, setStatutVisibles] = useState("");
  const [tuile, setTuile] = useState<string | null>(null);
  const mes = useQuery({ queryKey: ["requests", "mine", email], enabled: !!email, queryFn: () => fetchMyRequests(email) });
  const atraiter = useQuery({ queryKey: ["requests", "review"], enabled: role !== "collaborateur", queryFn: fetchToReview });
  const validees = useQuery({ queryKey: ["requests", "validated"], queryFn: fetchValidatedRequests });
  const toutes = useQuery({ queryKey: ["requests", "all"], enabled: role !== "collaborateur", queryFn: fetchAllRequests });

  const equipes = useMemo(() => [...new Set((validees.data ?? []).map((r) => r.team))].sort(), [validees.data]);
  const mesL = mes.data ?? [];
  const aTraiterL = atraiter.data ?? [];
  const decideesL = (toutes.data ?? []).filter((r) => r.status !== "en attente");
  const visibles = (validees.data ?? []).filter(
    (r) => (!equipe || r.team === equipe) && (!nature || (nature === "bloquante") === !!r.blocking) && (!statutVisibles || r.status === statutVisibles),
  );

  const tuiles = buildTuiles(role, mesL, aTraiterL);
  const actif = tuiles.find((t) => t.id === tuile) ?? null;
  const pour = (o: Onglet) => (actif && actif.onglet === o ? actif : null);
  const retirer = () => setTuile(null);
  const select = "min-h-11 border border-field bg-white px-3 text-[14px] text-ink";

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
            <BlocStatuts id="toutes" titre="Toutes les demandes" sousTitre="Lecture seule, toutes équipes" liste={toutes.data ?? []} perspective="valideur" vide="Aucune demande." tuile={null} onRetirer={retirer} />
          )}

          {mes.isError ? (
            <p role="alert" className="border border-line bg-white px-6 py-6">Tes demandes sont indisponibles pour le moment.</p>
          ) : (
            <BlocStatuts id="mes-demandes" titre="Mes demandes" liste={mesL} perspective="auteur" vide="Aucune demande dans ce statut." tuile={pour("mes")} onRetirer={retirer} />
          )}

          <Encadre
            id="demandes-visibles"
            icon={ClipboardList}
            title="Demandes visibles par tous"
            subtitle="Lecture seule ; l'auteur d'une demande confidentielle est masqué"
            compteur={`${visibles.length} sur ${validees.data?.length ?? 0}`}
            filtre={
              <>
                <select aria-label="Filtrer par équipe" value={equipe} onChange={(e) => setEquipe(e.target.value)} className={select}>
                  <option value="">Toutes les équipes</option>
                  {equipes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select aria-label="Filtrer par nature" value={nature} onChange={(e) => setNature(e.target.value)} className={select}>
                  <option value="">Toutes natures</option>
                  <option value="bloquante">Bloquante</option>
                  <option value="non-bloquante">Non bloquante</option>
                </select>
                <select aria-label="Filtrer par statut" value={statutVisibles} onChange={(e) => setStatutVisibles(e.target.value)} className={select}>
                  <option value="">Tous statuts</option>
                  <option value="en attente">En attente</option>
                  <option value="validée">Validée</option>
                </select>
              </>
            }
          >
            {validees.isLoading ? (
              <p className="px-6 py-6 text-ink-2">Chargement…</p>
            ) : (
              <Tableau lignes={visibles} perspective="lecteur" vide="Aucune demande ne correspond à ces filtres." />
            )}
          </Encadre>
        </div>
        <ReglesArbitrage />
      </div>
    </HpPage>
  );
}
