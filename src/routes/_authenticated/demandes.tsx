import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { BlocLecture, BlocStatuts } from "@/components/hp/demandes-blocs";
import { HpButton } from "@/components/hp/button";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { ReglesArbitrage } from "@/components/hp/regles";
import { RecapTuiles, buildTuiles, type Onglet } from "@/components/hp/recap";
import { fetchMyRequests, fetchAllRequests, fetchToReview, fetchValidatedRequests } from "@/lib/requests";

export const Route = createFileRoute("/_authenticated/demandes")({
  head: () => ({ meta: [{ title: "Demandes — Happy Place" }] }),
  component: DemandesPage,
});

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
