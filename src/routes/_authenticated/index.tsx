import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, Image as ImageIcon,
  ArrowRight, Newspaper, Pause, PenLine, Play, Plus, Send, TrendingUp, Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DepartureNotices } from "@/components/departure-notices";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { BlocLecture, BlocStatuts } from "@/components/hp/demandes-blocs";
import { Encadre, Picto } from "@/components/hp/encadre";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { RecapTuiles, buildTuiles } from "@/components/hp/recap";
import { MetricTile, dateMaj, derniereMaj } from "@/components/hp/indicateurs";
import { Couverture, dateCourte, estEntreprise, imagesDe, libellePerimetre, signature } from "@/components/hp/news-shared";
import { TraitStatut } from "@/components/hp/statut";
import { TabButton, TabList } from "@/components/hp/tabs";
import {
  deleteDraftNews, exportMyRecentSubmissions, fetchMetrics, fetchNews,
  publishDraftNews, requestNewsAuthorization, type News,
} from "@/lib/dashboard";
import { fetchAllRequests, fetchMyRequests, fetchToReview, fetchValidatedRequests } from "@/lib/requests";
import { BOITE_A_OUTILS, ICONES_OUTILS } from "@/lib/outils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Happy Place — Tableau de bord" },
      { name: "description", content: "Actualités du cabinet, demandes du terrain, points bloquants et indicateurs clés, en un seul tableau de bord." },
    ],
  }),
  component: Accueil,
});

const DELAI = 6000;

const date = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

function Accueil() {
  const qc = useQueryClient();
  const { role, email } = Route.useRouteContext();
  const { firstName, fullName, team } = useOwnProfile();
  const myEmail = (email ?? "").toLowerCase();
  const peutRediger = role !== "collaborateur";
  const roleLabel = role === "admin" ? "ADMIN" : role === "manager" ? "MANAGER" : "COLLABORATEUR";
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date());
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "L'action a échoué");

  const mes = useQuery({ queryKey: ["requests", "mine", myEmail], enabled: !!myEmail, queryFn: () => fetchMyRequests(myEmail) });
  const atraiter = useQuery({ queryKey: ["requests", "review"], enabled: peutRediger, queryFn: fetchToReview });
  const toutes = useQuery({ queryKey: ["requests", "all"], enabled: role === "admin", queryFn: fetchAllRequests });
  const validees = useQuery({ queryKey: ["requests", "validated"], queryFn: fetchValidatedRequests });
  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics, retry: false });

  const mesL = mes.data ?? [];
  const aTraiterL = atraiter.data ?? [];
  const tuiles = buildTuiles(role, mesL, aTraiterL);
  const [tuile, setTuile] = useState<string | null>(null);
  const actif = tuiles.find((t) => t.id === tuile) ?? null;

  const exportReport = useMutation({
    mutationFn: () => exportMyRecentSubmissions(myEmail),
    onSuccess: (n) => (n === 0 ? toast.info("Aucune demande en attente ou validée sur les 30 derniers jours.") : toast.success(`${n} demande${n > 1 ? "s" : ""} exportée${n > 1 ? "s" : ""} au format CSV.`)),
    onError,
  });

  const publier = useMutation({
    mutationFn: publishDraftNews,
    onSuccess: () => { toast.success("Actualité publiée"); qc.invalidateQueries({ queryKey: ["news"] }); },
    onError,
  });
  const invalider = () => qc.invalidateQueries({ queryKey: ["news"] });
  const demander = useMutation({
    mutationFn: requestNewsAuthorization,
    onSuccess: () => { toast.success("Demande envoyée : un admin doit autoriser cette annonce"); invalider(); },
    onError,
  });
  const supprimer = useMutation({
    mutationFn: (n: News) => deleteDraftNews(n.id, n.image_path),
    onSuccess: () => { toast.success("Brouillon supprimé"); qc.invalidateQueries({ queryKey: ["news"] }); },
    onError,
  });

  const publiees = (news.data ?? []).filter((n) => n.status === "publiée");
  const brouillons = (news.data ?? []).filter((n) => n.status === "brouillon" && (n.author_email ?? "").toLowerCase() === myEmail);

  return (
    <HpPage>
      <div className="flex flex-col gap-6 font-body text-ink">
        {email && <DepartureNotices email={email} />}

        <section className="flex flex-col gap-5 border border-line bg-white px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-[14px] leading-5 text-ink-2"><span className="label">{team ?? roleLabel}</span> · <time>{today}</time></p>
              <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">Bonjour {firstName}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {peutRediger && (
                <Link to="/rediger" className="label-13 inline-flex h-11 items-center gap-2 px-1 text-anthracite underline underline-offset-4 hover:text-ink">
                  <PenLine size={16} aria-hidden /> {role === "admin" ? "Publier une annonce entreprise" : "Rédiger une actualité"}
                </Link>
              )}
              <Link to="/deposer" className="contents">
                <HpButton role="publie" icon={Plus}>DÉPOSER UNE DEMANDE</HpButton>
              </Link>
              <HpButton role="consulte" icon={Download} disabled={exportReport.isPending} onClick={() => exportReport.mutate()}>
                {exportReport.isPending ? "EXPORT EN COURS…" : "EXPORTER LE RAPPORT"}
              </HpButton>
            </div>
          </div>
          <RecapTuiles tuiles={tuiles} actif={tuile} onChoisir={(t) => {
            setTuile(t ? t.id : null);
            // Comme au prototype : la tuile filtre sa liste et y amène
            if (t) requestAnimationFrame(() => document.getElementById(t.onglet === "mes" ? "mes-demandes" : "a-valider")?.scrollIntoView({ block: "start", behavior: "smooth" }));
          }} />
        </section>

        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          <Carrousel className="lg:col-span-2" news={publiees} loading={news.isLoading} error={news.isError} equipe={team} />
          <Indicateurs metrics={metrics.data} error={metrics.isError} />
        </div>

        <BlocStatuts id="mes-demandes" titre="Mes demandes" liste={mesL} perspective="auteur" vide="Tu n'as pas encore déposé de demande." tuile={actif && actif.onglet === "mes" ? actif : null} onRetirer={() => setTuile(null)} />

        {peutRediger && (
          <BlocStatuts
            id="a-valider"
            titre={role === "manager" ? "Demandes à valider : mon équipe" : "Demandes entreprise à valider"}
            liste={aTraiterL}
            perspective="valideur"
            vide="Aucune demande n'attend ta décision."
            tuile={actif && actif.onglet === "traiter" ? actif : null}
            onRetirer={() => setTuile(null)}
          />
        )}

        {role === "admin" ? (
          <BlocLecture id="entreprise" titre="Toutes les demandes" sousTitre="Lecture seule, toutes équipes" liste={toutes.data ?? []} equipes={[...new Set((toutes.data ?? []).map((r) => r.team))].sort()} etats={["en_attente", "a_completer", "validee", "refusee"]} perspective="valideur" />
        ) : (
          <BlocLecture
            id="entreprise"
            titre={role === "manager" ? "Demandes de l'entreprise" : "Demandes visibles par tous"}
            sousTitre={role === "manager" ? "Lecture seule, à titre d'information" : "Lecture seule ; l'auteur d'une demande confidentielle est masqué"}
            liste={validees.data ?? []}
            equipes={[...new Set((validees.data ?? []).map((r) => r.team))].sort()}
            etats={["en_attente", "validee"]}
            perspective="lecteur"
            chargement={validees.isLoading}
          />
        )}

        {peutRediger && (
          <Encadre id="brouillons" icon={FileText} title="Mes brouillons" compteur={`${brouillons.length} brouillon${brouillons.length > 1 ? "s" : ""}`}>
            {brouillons.length === 0 ? (
              <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Aucun brouillon en cours.</p>
            ) : (
              <ul className="grid gap-4 p-6 sm:grid-cols-2">
                {brouillons.map((n) => {
                  const accord = (n.scope ?? "entreprise") === "entreprise" && role !== "admin";
                  return (
                    <li key={n.id} className="relative flex flex-col gap-3 border border-line bg-white py-4 pr-5 pl-6">
                      <TraitStatut ton="gris" />
                      <h3 className="font-body text-[16px] leading-6 font-semibold">
                        <Link to="/rediger" search={{ id: n.id }} className="block py-0.5 after:absolute after:inset-0">{n.title}</Link>
                      </h3>
                      <p className="text-[12px] leading-4 text-ink-2">Modifié le {dateCourte(n.created_at)} · {libellePerimetre(n)}</p>
                      <div className="relative z-10 flex flex-wrap items-center gap-3">
                        {accord ? (
                          <HpButton role="principal" icon={Send} disabled={demander.isPending} onClick={() => demander.mutate(n.id)}>DEMANDER L'ACCORD</HpButton>
                        ) : (
                          <HpButton role="principal" icon={Send} disabled={publier.isPending} onClick={() => publier.mutate(n.id)}>PUBLIER</HpButton>
                        )}
                        <button type="button" disabled={supprimer.isPending} onClick={() => { if (window.confirm(`Supprimer le brouillon « ${n.title} » ?`)) supprimer.mutate(n); }} className="label-13 cursor-pointer text-[#8E1A1F] underline underline-offset-4">
                          Supprimer
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Encadre>
        )}
      </div>

      <Encadre id="boite-a-outils" icon={Wrench} title="Boîte à outils">
        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {BOITE_A_OUTILS.map((t) => {
            const Icon = ICONES_OUTILS[t];
            return (
              <Link
                key={t}
                to="/boite-a-outils"
                search={{ categorie: t }}
                className="flex h-20 items-center gap-3 border border-line bg-white px-5 hover:bg-neutral-1"
              >
                <Picto icon={Icon} />
                <span className="label-13 flex-1 text-ink">{t}</span>
                <ArrowRight size={16} aria-hidden className="text-ink" />
              </Link>
            );
          })}
        </div>
      </Encadre>
    </HpPage>
  );
}

// Actualités : carrousel (6 s, pause, mouvement réduit respecté), onglets Entreprise / Mon équipe comme au prototype
function Carrousel({ news, loading, error, equipe, className }: { news: News[]; loading: boolean; error: boolean; equipe: string | null; className?: string }) {
  const [onglet, setOnglet] = useState<"entreprise" | "equipe">("entreprise");
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const parOnglet = { entreprise: news.filter(estEntreprise), equipe: news.filter((n) => !estEntreprise(n)) };
  const slides = parOnglet[onglet];
  const slide = slides[i] ?? slides[0];
  const aller = (pas: number) => setI((x) => (x + pas + slides.length) % slides.length);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPause(true);
  }, []);
  useEffect(() => {
    if (pause || slides.length < 2) return;
    const t = setTimeout(() => aller(1), DELAI);
    return () => clearTimeout(t);
  }, [pause, i, onglet, slides.length]);
  const changer = (o: "entreprise" | "equipe") => { setOnglet(o); setI(0); };
  const images = slide ? imagesDe(slide) : [];

  return (
    <Encadre
      id="actualites"
      icon={Newspaper}
      title="Actualités"
      className={className}
      filtre={
        <TabList label="Actualités">
          <TabButton grand controle="carrousel-actus" active={onglet === "entreprise"} onClick={() => changer("entreprise")}>{`ENTREPRISE (${parOnglet.entreprise.length})`}</TabButton>
          <TabButton grand controle="carrousel-actus" active={onglet === "equipe"} onClick={() => changer("equipe")}>{`MON ÉQUIPE${equipe ? ` · ${equipe.toUpperCase()}` : ""} (${parOnglet.equipe.length})`}</TabButton>
        </TabList>
      }
    >
      {error ? (
        <p role="alert" className="px-6 py-6">Les actualités sont indisponibles.</p>
      ) : loading ? (
        <p className="px-6 py-6 text-ink-2">Chargement…</p>
      ) : (
        <div id="carrousel-actus" role="tabpanel" className="flex flex-1 flex-col" aria-roledescription="carrousel">
          {images.length > 0 ? (
            <div className="grid h-60 gap-px bg-line" style={{ gridTemplateColumns: `repeat(${images.length}, minmax(0, 1fr))` }}>
              {images.map((p) => <Couverture key={p} path={p} className="h-60" />)}
            </div>
          ) : (
            <div className="flex h-60 items-center justify-center bg-neutral-1" aria-hidden><ImageIcon size={40} className="text-ink-2" /></div>
          )}
          {slide ? (
            <div className="flex flex-1 items-end justify-between gap-6 px-6 py-5" aria-roledescription="diapositive" aria-label={`${i + 1} sur ${slides.length}`} aria-live={pause ? "polite" : "off"}>
              <div className="flex flex-col gap-2">
                {slide.category && <span className="label text-ink-2">{slide.category}</span>}
                <h3 className="text-[24px] leading-8">{slide.title}</h3>
                <p className="text-[12px] leading-4 text-ink-2">{signature(slide)}</p>
              </div>
              <Link to="/actualites/$id" params={{ id: slide.id }} className="inline-flex h-11 shrink-0 items-center gap-2 px-1 text-[14px] leading-5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink">
                <BookOpen size={16} aria-hidden /> Lire l'article
              </Link>
            </div>
          ) : (
            <p className="flex-1 px-6 py-5 text-[14px] leading-5 text-ink-2">Aucune actualité publiée dans cet onglet.</p>
          )}
          <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-3">
            <HpButton role="consulte" icon={pause ? Play : Pause} onClick={() => setPause((p) => !p)} className="w-[230px]">{pause ? "REPRENDRE" : "METTRE EN PAUSE (6S)"}</HpButton>
            <span className="text-[12px] leading-4 text-ink-2">Communication interne Bigger Boat</span>
            <div className="flex items-center gap-1">
              {slides.map((s, k) => (
                <button key={s.id} type="button" aria-label={`Diapositive ${k + 1} sur ${slides.length}`} aria-current={k === i} onClick={() => setI(k)} className="group flex size-11 cursor-pointer items-center justify-center">
                  <span className={cn("size-3 border group-hover:border-anthracite", k === i ? "border-anthracite bg-anthracite" : "border-ink-2 bg-white")} />
                </button>
              ))}
              <HpIconButton icon={ChevronLeft} label="Diapositive précédente" className="ml-2" onClick={() => aller(-1)} />
              <HpIconButton icon={ChevronRight} label="Diapositive suivante" onClick={() => aller(1)} />
            </div>
          </div>
        </div>
      )}
    </Encadre>
  );
}

function Indicateurs({ metrics, error }: { metrics?: Awaited<ReturnType<typeof fetchMetrics>>; error: boolean }) {
  const liste = useMemo(() => (metrics ?? []).slice(0, 4), [metrics]);
  const maj = derniereMaj(metrics ?? []);
  return (
    <Encadre id="indicateurs" icon={TrendingUp} title="Indicateurs clés" subtitle={<>Performance de l'entreprise{maj && <span className="block">Mis à jour le {dateMaj(maj)}</span>}</>}>
      {error ? (
        <p role="alert" className="px-6 py-6">Les indicateurs sont indisponibles.</p>
      ) : liste.length === 0 ? (
        <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Aucun indicateur.</p>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-6">
          {liste.map((m) => <MetricTile key={m.key} m={m} lien />)}
        </div>
      )}
    </Encadre>
  );
}
