import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, BookOpen, ChevronLeft, ChevronRight, ClipboardList, Download, FileText, Image as ImageIcon,
  ArrowRight, Newspaper, Pause, PenLine, Play, Plus, Send, TrendingUp, Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DepartureNotices } from "@/components/departure-notices";
import { BlockerArchive } from "@/components/dashboard-extras";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { Tableau } from "@/components/hp/demandes-ui";
import { Encadre, Picto } from "@/components/hp/encadre";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { BandeauFiltre, RecapTuiles, buildTuiles } from "@/components/hp/recap";
import { Couverture, estEntreprise, imagesDe, signature } from "@/components/hp/news-shared";
import { TabButton, TabList } from "@/components/hp/tabs";
import {
  deleteDraftNews, deltaText, exportMyRecentSubmissions, fetchBlockers, fetchMetrics, fetchNews, formatMetricValue,
  publishDraftNews, requestNewsAuthorization, authorizeNews, refuseNews, timeAgo, updateBlockerStatus, TREND_LABELS, type News,
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

const LABEL_METRIC: Record<string, string> = { training_kpi: "Taux de placement", active_users: "Missions actives" };
const DELAI = 6000;
const LIGNES = 5;

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
  const blockers = useQuery({ queryKey: ["blockers"], queryFn: fetchBlockers, retry: false });

  const mesL = mes.data ?? [];
  const aTraiterL = atraiter.data ?? [];
  const tuiles = buildTuiles(role, mesL, aTraiterL);
  const [tuile, setTuile] = useState<string | null>(null);
  const actif = tuiles.find((t) => t.id === tuile) ?? null;
  const filtre = (l: typeof mesL, onglet: "mes" | "traiter") => (actif && actif.onglet === onglet ? l.filter(actif.garde) : l);

  const exportReport = useMutation({
    mutationFn: () => exportMyRecentSubmissions(myEmail),
    onSuccess: (n) => (n === 0 ? toast.info("Aucune demande en attente ou validée sur les 30 derniers jours.") : toast.success(`${n} demande${n > 1 ? "s" : ""} exportée${n > 1 ? "s" : ""} au format CSV.`)),
    onError,
  });

  const [archive, setArchive] = useState(false);
  const setBlocker = useMutation({
    mutationFn: updateBlockerStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blockers"] }),
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
  const autoriser = useMutation({
    mutationFn: (n: News) => authorizeNews({ id: n.id, by: fullName }),
    onSuccess: (_r, n) => { toast.success(`Annonce autorisée : ${n.author.split(" ")[0]} peut la publier`); invalider(); },
    onError,
  });
  const refuser = useMutation({
    mutationFn: refuseNews,
    onSuccess: () => { toast.success("Annonce refusée : l'auteur voit ton explication"); setRefusId(null); setMotif(""); invalider(); },
    onError,
  });
  const [refusId, setRefusId] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const supprimer = useMutation({
    mutationFn: (n: News) => deleteDraftNews(n.id, n.image_path),
    onSuccess: () => { toast.success("Brouillon supprimé"); qc.invalidateQueries({ queryKey: ["news"] }); },
    onError,
  });

  const publiees = (news.data ?? []).filter((n) => n.status === "publiée");
  const suiviStatuts = ["brouillon", "en attente", "autorisée", "refusée"];
  const brouillons = (news.data ?? []).filter(
    (n) => suiviStatuts.includes(n.status) && ((n.author_email ?? "").toLowerCase() === myEmail || (role === "admin" && n.status === "brouillon")),
  );
  const aAutoriser = (news.data ?? []).filter((n) => n.status === "en attente");
  const LIBELLE_PUB: Record<string, string> = { brouillon: "Brouillon", "en attente": "En attente d'autorisation", autorisée: "Autorisée", refusée: "Refusée" };

  return (
    <HpPage>
      <div className="flex flex-col gap-6 font-body text-ink">
        {email && <DepartureNotices email={email} />}

        <section className="flex flex-col gap-5 border border-line bg-white px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-[14px] leading-5 text-ink-2"><span className="label">{roleLabel}</span> · <time>{today}</time></p>
              <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">Bonjour {firstName}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {peutRediger && (
                <Link to="/rediger" className="label-13 inline-flex h-11 items-center gap-2 px-1 text-anthracite underline underline-offset-4 hover:text-ink">
                  <PenLine size={16} aria-hidden /> Rédiger une actualité
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

        <Encadre id="mes-demandes" icon={ClipboardList} title="Mes demandes" compteur={`${filtre(mesL, "mes").length} demande(s)`}
          filtre={actif && actif.onglet === "mes" ? <BandeauFiltre label={actif.label} n={filtre(mesL, "mes").length} onRetirer={() => setTuile(null)} /> : undefined}>
          <Tableau lignes={filtre(mesL, "mes").slice(0, LIGNES)} perspective="auteur" vide="Tu n'as pas encore déposé de demande." />
          <VoirTout n={filtre(mesL, "mes").length} />
        </Encadre>

        {peutRediger && (
          <Encadre id="a-valider" icon={ClipboardList} title={role === "manager" ? "Demandes à valider : mon équipe" : "Demandes à valider"} compteur={`${filtre(aTraiterL, "traiter").length} demande(s)`}
            filtre={actif && actif.onglet === "traiter" ? <BandeauFiltre label={actif.label} n={filtre(aTraiterL, "traiter").length} onRetirer={() => setTuile(null)} /> : undefined}>
            <Tableau lignes={filtre(aTraiterL, "traiter").slice(0, LIGNES)} perspective="valideur" vide="Aucune demande n'attend ta décision." />
            <VoirTout n={filtre(aTraiterL, "traiter").length} />
          </Encadre>
        )}

        <Encadre id="entreprise" icon={ClipboardList} title={role === "admin" ? "Toutes les demandes" : "Demandes visibles par tous"}
          subtitle={role === "admin" ? "Lecture seule, toutes équipes" : "Lecture seule ; l'auteur d'une demande confidentielle est masqué"}
          compteur={`${(role === "admin" ? toutes.data : validees.data)?.length ?? 0} demande(s)`}>
          <Tableau lignes={((role === "admin" ? toutes.data : validees.data) ?? []).slice(0, LIGNES)} perspective={role === "admin" ? "valideur" : "lecteur"} vide="Aucune demande à afficher." />
          <VoirTout n={(role === "admin" ? toutes.data : validees.data)?.length ?? 0} />
        </Encadre>

        <Encadre id="bloquants" icon={AlertTriangle} title="Points bloquants" subtitle="Alertes opérationnelles en cours" compteur={`${blockers.data?.length ?? 0} point(s)`}
          filtre={<button type="button" onClick={() => setArchive(true)} className="label underline underline-offset-4 hover:text-anthracite">Voir l'archive</button>}>
          {blockers.isError ? (
            <p role="alert" className="px-6 py-6">Les points bloquants sont indisponibles.</p>
          ) : (blockers.data ?? []).length === 0 ? (
            <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Aucun point bloquant en cours.</p>
          ) : (
            <ul>
              {(blockers.data ?? []).map((b) => {
                const critique = b.severity === "critical";
                return (
                  <li key={b.id} className="relative flex flex-wrap items-start justify-between gap-3 border-t border-line py-4 pr-6 pl-6">
                    <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", critique ? "bg-[#C2272D]" : "bg-[#B8651B]")} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-[16px] leading-6 font-semibold">{b.title}</p>
                      {b.description && <p className="text-[14px] leading-5 text-ink-2">{b.description}</p>}
                      <p className="text-[12px] leading-4 text-ink-2">{b.department} · {critique ? "Critique · " : ""}Mis à jour {timeAgo(b.updated_at)}</p>
                    </div>
                    <select
                      aria-label={`Statut de ${b.title}`}
                      value={b.status}
                      disabled={role !== "admin"}
                      onChange={(e) => setBlocker.mutate({ id: b.id, status: e.target.value })}
                      className="min-h-11 border border-field bg-white px-3 text-[14px] disabled:bg-neutral-1 disabled:text-ink-2"
                    >
                      <option>OUVERT</option>
                      <option>EN COURS</option>
                      <option>SURVEILLANCE</option>
                      <option disabled={b.status === "OUVERT"}>RÉSOLU</option>
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
        </Encadre>

        {role === "admin" && (
          <Encadre id="a-autoriser" icon={FileText} title="Annonces à autoriser" subtitle="Annonces « Toute l'entreprise » demandées par les managers" compteur={`${aAutoriser.length} annonce${aAutoriser.length > 1 ? "s" : ""}`}>
            {aAutoriser.length === 0 ? (
              <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Rien à autoriser pour le moment.</p>
            ) : (
              <ul className="flex flex-col gap-4 p-6">
                {aAutoriser.map((n) => (
                  <li key={n.id} className="relative flex flex-col gap-3 border border-line bg-white py-4 pr-5 pl-6">
                    <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[#B8651B]" />
                    <h3 className="text-[18px] leading-6">{n.title}</h3>
                    <p className="text-[12px] leading-4 text-ink-2">{n.author} · Demandée le {date(n.requested_at ?? n.created_at)} · Toute l'entreprise</p>
                    {n.body && <p className="line-clamp-2 max-w-[80ch] text-[14px] leading-5">{n.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}</p>}
                    {refusId === n.id ? (
                      <div className="flex flex-col gap-2 border-t border-line pt-3">
                        <label htmlFor={`motif-${n.id}`} className="label text-ink">Explication * <span className="text-ink-2 normal-case">({motif.length} / 500)</span></label>
                        <textarea id={`motif-${n.id}`} rows={3} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full border border-field bg-white px-3 py-2 text-[14px] leading-5" />
                        <div className="flex flex-wrap justify-end gap-3">
                          <HpButton role="consulte" onClick={() => { setRefusId(null); setMotif(""); }}>ANNULER</HpButton>
                          <HpButton role="refuse" disabled={!motif.trim() || refuser.isPending} onClick={() => refuser.mutate({ id: n.id, note: motif.trim() })}>CONFIRMER LE REFUS</HpButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-3">
                        <HpButton role="refuse" onClick={() => { setRefusId(n.id); setMotif(""); }}>REFUSER AVEC MOTIF</HpButton>
                        <HpButton role="valide" disabled={autoriser.isPending} onClick={() => autoriser.mutate(n)}>AUTORISER</HpButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Encadre>
        )}

        {peutRediger && (
          <Encadre id="brouillons" icon={FileText} title="Mes publications" compteur={`${brouillons.length} actualité${brouillons.length > 1 ? "s" : ""}`}>
            {brouillons.length === 0 ? (
              <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Aucun brouillon en cours.</p>
            ) : (
              <ul className="grid gap-4 p-6 sm:grid-cols-2">
                {brouillons.map((n) => {
                  const entreprise = (n.scope ?? "entreprise") === "entreprise";
                  const besoinAutorisation = entreprise && role !== "admin";
                  return (
                    <li key={n.id} className="relative flex flex-col gap-3 border border-line bg-white py-4 pr-5 pl-6">
                      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${n.status === "refusée" ? "bg-[#C2272D]" : n.status === "autorisée" ? "bg-[#298646]" : n.status === "en attente" ? "bg-[#B8651B]" : "bg-line"}`} />
                      <span className="label w-fit border border-line px-2 py-0.5 text-ink">{LIBELLE_PUB[n.status] ?? n.status}</span>
                      <h3 className="font-body text-[16px] leading-6 font-semibold">{n.title}</h3>
                      <p className="text-[12px] leading-4 text-ink-2">
                        {entreprise ? "Toute l'entreprise" : (n.teams ?? []).join(", ")} · Créé le {date(n.created_at)} · Par {n.author}
                      </p>
                      {n.status === "en attente" && <p className="text-[14px] leading-5">Demande envoyée{n.requested_at ? ` le ${date(n.requested_at)}` : ""} : un admin doit l'autoriser avant publication.</p>}
                      {n.status === "autorisée" && <p className="text-[14px] leading-5">Autorisée{n.authorized_by ? ` par ${n.authorized_by}` : ""}{n.authorized_at ? ` le ${date(n.authorized_at)}` : ""} : tu peux la publier.</p>}
                      {n.status === "refusée" && <p className="text-[14px] leading-5"><span className="font-semibold">Explication de l'admin : </span>{n.refusal_note}</p>}
                      <div className="flex flex-wrap items-center gap-3">
                        {n.status === "autorisée" && <HpButton role="principal" icon={Send} disabled={publier.isPending} onClick={() => publier.mutate(n.id)}>PUBLIER</HpButton>}
                        {n.status === "brouillon" && !besoinAutorisation && <HpButton role="principal" icon={Send} disabled={publier.isPending} onClick={() => publier.mutate(n.id)}>PUBLIER</HpButton>}
                        {n.status === "brouillon" && besoinAutorisation && <HpButton role="principal" icon={Send} disabled={demander.isPending} onClick={() => demander.mutate(n.id)}>DEMANDER L'AUTORISATION</HpButton>}
                        {n.status === "refusée" && <HpButton role="principal" icon={Send} disabled={demander.isPending} onClick={() => demander.mutate(n.id)}>REDEMANDER L'AUTORISATION</HpButton>}
                        {(n.status === "brouillon" || n.status === "refusée") && (
                          <Link to="/rediger" search={{ id: n.id }} className="label-13 text-anthracite underline underline-offset-4 hover:text-ink">{n.status === "refusée" ? "Corriger" : "Modifier"}</Link>
                        )}
                        {n.status === "brouillon" && (
                          <button type="button" disabled={supprimer.isPending} onClick={() => { if (window.confirm(`Supprimer le brouillon « ${n.title} » ?`)) supprimer.mutate(n); }} className="label-13 text-[#8E1A1F] underline underline-offset-4">
                            Supprimer
                          </button>
                        )}
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
      <BlockerArchive open={archive} onClose={() => setArchive(false)} />
    </HpPage>
  );
}

function VoirTout({ n }: { n: number }) {
  if (n <= LIGNES) return null;
  return (
    <p className="border-t border-line px-6 py-3 text-[14px] leading-5">
      <Link to="/demandes" className="font-semibold text-anthracite underline underline-offset-4 hover:text-ink">Voir les {n} demandes</Link>
    </p>
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
  return (
    <Encadre id="indicateurs" icon={TrendingUp} title="Indicateurs clés" subtitle="Performance de l'entreprise">
      {error ? (
        <p role="alert" className="px-6 py-6">Les indicateurs sont indisponibles.</p>
      ) : liste.length === 0 ? (
        <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Aucun indicateur.</p>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-6">
          {liste.map((m) => (
            <div key={m.key} className="flex flex-1 items-center justify-between gap-4 border border-line bg-white px-5 py-4">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="label text-ink-2">{LABEL_METRIC[m.key] ?? m.label}</span>
                <span className="font-title text-[28px] leading-9 font-bold whitespace-nowrap text-ink">{formatMetricValue(m.value, m.unit)}</span>
                <span className="text-[12px] leading-4 text-ink-2">{TREND_LABELS[m.trend]}{deltaText(m) ? ` · ${deltaText(m)}` : ""}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Encadre>
  );
}
