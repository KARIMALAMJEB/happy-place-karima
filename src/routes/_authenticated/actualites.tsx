import { createFileRoute, Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Info, Paperclip, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { TabButton, TabList } from "@/components/hp/tabs";
import { hpButtonVariants } from "@/components/hp/button";
import { Couverture, dateSansJour, fichiersDe, imagesDe, joursDepuis, estEntreprise, tonNews } from "@/components/hp/news-shared";
import { AutoriserTab, PublicationsTab, SuiviTab, useActionsActus } from "@/components/hp/news-tabs";
import { texteBrut } from "@/components/hp/rich-text";
import { TraitStatut, type Ton } from "@/components/hp/statut";
import { fetchNews, type News } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type OngletActus = "fil" | "autoriser" | "suivi" | "mes";

export const Route = createFileRoute("/_authenticated/actualites")({
  head: () => ({ meta: [{ title: "Happy Place — Actualités" }] }),
  validateSearch: (s: Record<string, unknown>): { onglet?: Exclude<OngletActus, "fil"> } => ({
    onglet: (["autoriser", "suivi", "mes"] as const).find((o) => o === s.onglet),
  }),
  component: Actualites,
});

const REGLE = "Les managers publient seuls pour leurs équipes. Pour toute l'entreprise, ils demandent l'autorisation d'un admin.";

function Actualites() {
  return (
    <HpPage>
      <Page />
    </HpPage>
  );
}

type Etape = { id: string; label: string; n: number; ton: Ton; statut?: string; onglet: OngletActus };

// Pipeline « Suivi de mes actualités » : chaque étape filtre Mes publications (ou ouvre la file À autoriser de l'admin)
function Pipeline({ etapes, actif, onChoisir }: { etapes: Etape[]; actif?: string; onChoisir: (e: Etape) => void }) {
  return (
    <section aria-labelledby="pipeline-titre" className="flex flex-col gap-3">
      <h2 id="pipeline-titre" className="label text-ink-2">Suivi de mes actualités</h2>
      <ol className="grid gap-3" style={{ gridTemplateColumns: `repeat(${etapes.length}, minmax(0, 1fr))` }}>
        {etapes.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              aria-pressed={actif === e.id}
              aria-label={`${e.label} : ${e.n}`}
              onClick={() => onChoisir(e)}
              className={cn(
                "relative flex min-h-[72px] w-full cursor-pointer flex-col items-start justify-center gap-1 border border-line py-3 pr-4 pl-6 text-left",
                actif === e.id ? "border-2 border-anthracite bg-white" : "bg-white hover:border-anthracite",
              )}
            >
              <TraitStatut ton={e.ton} />
              <span className="font-title text-[24px] leading-8 font-bold text-ink">{e.n}</span>
              <span className="label text-ink-2">{e.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Page Actualités : une seule page à onglets (admin : fil, à autoriser, suivi ; manager : fil, mes publications)
function Page() {
  const { role, email } = useRouteContext({ from: "/_authenticated" });
  const { fullName } = useOwnProfile();
  const { onglet = "fil" } = Route.useSearch();
  const navigate = useNavigate({ from: "/actualites" });
  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const actions = useActionsActus(fullName);
  const [etape, setEtape] = useState<Etape>();
  const admin = role === "admin";
  const manager = role === "manager";
  const monMail = (email ?? "").toLowerCase();
  const toutes = news.data ?? [];
  const miennes = toutes.filter((n) => (n.author_email ?? "").toLowerCase() === monMail);
  const enAttente = toutes.filter((n) => n.status === "en attente");
  const n = (s: string) => miennes.filter((a) => a.status === s).length;

  const etapes: Etape[] = manager
    ? [
        { id: "brouillon", label: "Brouillons", n: n("brouillon"), ton: tonNews("brouillon"), statut: "brouillon", onglet: "mes" },
        { id: "attente", label: "En attente d'accord", n: n("en attente"), ton: tonNews("en attente"), statut: "en attente", onglet: "mes" },
        { id: "autorisee", label: "Autorisées à publier", n: n("autorisée"), ton: tonNews("autorisée"), statut: "autorisée", onglet: "mes" },
        { id: "publiee", label: "Publiées", n: n("publiée"), ton: tonNews("publiée"), statut: "publiée", onglet: "mes" },
      ]
    : admin
      ? [
          { id: "brouillon", label: "Mes brouillons", n: n("brouillon"), ton: tonNews("brouillon"), statut: "brouillon", onglet: "suivi" },
          { id: "autoriser", label: "À autoriser", n: enAttente.length, ton: tonNews("en attente"), onglet: "autoriser" },
          { id: "publiee", label: "Mes publications publiées", n: n("publiée"), ton: tonNews("publiée"), statut: "publiée", onglet: "suivi" },
        ]
      : [];
  const onglets: [OngletActus, string][] = admin
    ? [["fil", "FIL D'ACTUALITÉS"], ["autoriser", `À AUTORISER (${enAttente.length})`], ["suivi", "SUIVI DES PUBLICATIONS"]]
    : manager
      ? [["fil", "FIL D'ACTUALITÉS"], ["mes", "MES PUBLICATIONS"]]
      : [];
  const actif: OngletActus = onglets.some(([o]) => o === onglet) ? onglet : "fil";
  const aller = (o: OngletActus, e?: Etape) => {
    setEtape(e);
    void navigate({ search: o === "fil" ? {} : { onglet: o } });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 border border-line bg-white px-8 pt-6">
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[36px] leading-[44px]">Actualités</h1>
            <p className="text-[16px] leading-6">Communication interne Bigger Boat</p>
            {(admin || manager) && <p className="max-w-[80ch] text-[12px] leading-4 text-ink-2">Règle de publication : {REGLE}</p>}
          </div>
          {(admin || manager) && (
            <Link to="/rediger" className={hpButtonVariants({ role: "principal" })}>
              <Plus size={16} aria-hidden />
              <span>RÉDIGER UNE ACTUALITÉ</span>
            </Link>
          )}
        </div>
        {onglets.length > 0 ? (
          <TabList label="Sections des actualités">
            {onglets.map(([o, l]) => (
              <TabButton key={o} active={actif === o} controle="actus-panneau" onClick={() => aller(o)}>{l}</TabButton>
            ))}
          </TabList>
        ) : (
          <span className="pb-1" />
        )}
      </header>

      {etapes.length > 0 && <Pipeline etapes={etapes} actif={etape?.id} onChoisir={(e) => (etape?.id === e.id ? aller(actif) : aller(e.onglet, e))} />}

      <div id="actus-panneau" role={onglets.length > 0 ? "tabpanel" : undefined} className="flex flex-col gap-6">
        {actif === "fil" && <Fil news={news.data ?? []} loading={news.isLoading} error={news.isError} redacteur={admin || manager} />}
        {actif === "autoriser" && <AutoriserTab liste={enAttente} actions={actions} />}
        {actif === "suivi" && <SuiviTab key={etape?.id ?? "tous"} toutes={toutes} miennes={miennes} initial={etape?.statut ? "mes" : undefined} statutInitial={etape?.statut} />}
        {actif === "mes" && <PublicationsTab key={etape?.id ?? "tous"} miennes={miennes} admin={admin} actions={actions} statutInitial={etape?.statut} />}
      </div>
    </div>
  );
}

type Onglet = "toutes" | "equipe" | "entreprise";
type Filtres = { auteur?: string; date?: "7" | "30"; equipe?: string; theme?: string };
type Cle = keyof Filtres;

const LIBELLES: Record<Cle, string> = { auteur: "Auteur", date: "Date", equipe: "Équipe", theme: "Thème" };
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const extrait = (n: News) => texteBrut(n.body ?? "").split(/(?<=\.)\s/)[0];
const lecture = (n: News) => Math.max(1, Math.round(texteBrut(n.body ?? "").split(/\s+/).length / 200));
const libelleEquipe = (v: string) => (v === "entreprise" ? "Entreprise" : v);
const valeurAffichee = (k: Cle, v: string) => (k === "date" ? `${v} derniers jours` : k === "equipe" ? libelleEquipe(v) : v);
const equipesDe = (n: News) => (estEntreprise(n) ? ["entreprise"] : (n.teams ?? []));

function Carte({ n }: { n: News }) {
  const fichiers = fichiersDe(n);
  return (
    <li className="relative flex flex-col border border-line bg-white">
      <TraitStatut ton={tonNews(n.status)} />
      <Couverture path={imagesDe(n)[0]} className="h-48" />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label border border-line px-2 py-1 text-ink">{estEntreprise(n) ? "ENTREPRISE" : "MON ÉQUIPE"}</span>
          {n.category && <span className="label text-ink-2">{n.category}</span>}
        </div>
        <h2 className="text-[20px] leading-7">
          <Link to="/actualites/$id" params={{ id: n.id }} className="block py-0.5 after:absolute after:inset-0">{n.title}</Link>
        </h2>
        {extrait(n) && <p className="line-clamp-3 text-[14px] leading-5">{extrait(n)}</p>}
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3 text-[12px] leading-4 text-ink-2">
          <p><span className="font-semibold text-ink">{n.author}</span></p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Publié le {dateSansJour(n.created_at)}</span>
            {n.body && (
              <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden />{lecture(n)} min de lecture</span>
            )}
          </p>
          {fichiers.length > 0 && (
            <p className="inline-flex items-center gap-1.5">
              <Paperclip size={12} aria-hidden />
              {fichiers[0].name}
              {fichiers.length > 1 && ` + ${fichiers.length - 1} fichier${fichiers.length > 2 ? "s" : ""}`}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

// Fil d'actualités : onglets avec compteurs, recherche, filtres en pastilles supprimables
function Fil({ news, loading, error, redacteur }: { news: News[]; loading: boolean; error: boolean; redacteur: boolean }) {
  const [onglet, setOnglet] = useState<Onglet>("toutes");
  const [recherche, setRecherche] = useState("");
  const [panneau, setPanneau] = useState(false);
  const [filtres, setFiltres] = useState<Filtres>({});

  const publiees = [...news].filter((n) => n.status === "publiée").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const equipe = publiees.filter((n) => !estEntreprise(n));
  const entreprise = publiees.filter(estEntreprise);
  const base = onglet === "equipe" ? equipe : onglet === "entreprise" ? entreprise : publiees;
  const q = sansAccents(recherche.trim());
  const liste = base.filter(
    (n) =>
      (!q || sansAccents(`${n.title} ${texteBrut(n.body ?? "")} ${n.author}`).includes(q)) &&
      (!filtres.auteur || n.author === filtres.auteur) &&
      (!filtres.equipe || equipesDe(n).includes(filtres.equipe)) &&
      (!filtres.theme || n.category === filtres.theme) &&
      (!filtres.date || joursDepuis(n.created_at) <= Number(filtres.date)),
  );
  const options = {
    auteur: [...new Set(base.map((n) => n.author))],
    equipe: [...new Set(base.flatMap(equipesDe))],
    theme: [...new Set(base.map((n) => n.category).filter((c): c is string => !!c))],
  };
  const actifs = (Object.entries(filtres) as [Cle, string | undefined][]).filter(([, v]) => v);
  const changer = (k: Cle, v: string) => setFiltres((f) => ({ ...f, [k]: v || undefined }));
  const select = "min-h-11 w-full border border-field bg-white px-3 text-[14px] text-ink";

  return (
    <div className="flex flex-col gap-6">
      {!redacteur && (
        <section aria-labelledby="droits-titre" className="flex items-start gap-3 border border-line border-l-4 border-l-anthracite bg-neutral-1 px-6 py-4">
          <Info size={18} aria-hidden className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 text-[14px] leading-5">
            <h2 id="droits-titre" className="font-body text-[14px] leading-5 font-semibold">Information droits de publication (lecture seule)</h2>
            <p>Tu consultes les actualités de ton équipe et de l'entreprise. Pour proposer une publication, adresse-toi à ton manager ou à un admin.</p>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 border border-line bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabList label="Actualités">
            <TabButton active={onglet === "toutes"} onClick={() => setOnglet("toutes")}>{`TOUTES (${publiees.length})`}</TabButton>
            <TabButton active={onglet === "equipe"} onClick={() => setOnglet("equipe")}>{`MON ÉQUIPE (${equipe.length})`}</TabButton>
            <TabButton active={onglet === "entreprise"} onClick={() => setOnglet("entreprise")}>{`ENTREPRISE (${entreprise.length})`}</TabButton>
          </TabList>
          <div className="flex items-center gap-3">
            <label className="relative flex items-center">
              <span className="sr-only">Rechercher une actualité</span>
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-ink-2" />
              <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une actualité" className="h-11 w-64 border border-field bg-white pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-2" />
            </label>
            <button type="button" aria-expanded={panneau} aria-controls="filtres-actualites" onClick={() => setPanneau((p) => !p)} className={hpButtonVariants({ role: "consulte" })}>
              <SlidersHorizontal size={16} aria-hidden />
              <span>FILTRER</span>
            </button>
          </div>
        </div>

        {panneau && (
          <div id="filtres-actualites" className="grid grid-cols-4 gap-4 bg-neutral-1 p-4">
            {(["auteur", "date", "equipe", "theme"] as Cle[]).map((k) => (
              <label key={k} className="flex flex-col gap-2">
                <span className="label text-ink">{LIBELLES[k]}</span>
                <select value={filtres[k] ?? ""} onChange={(e) => changer(k, e.target.value)} className={select}>
                  <option value="">Tous</option>
                  {k === "date" ? (
                    <>
                      <option value="7">7 derniers jours</option>
                      <option value="30">30 derniers jours</option>
                    </>
                  ) : (
                    options[k].map((v) => <option key={v} value={v}>{valeurAffichee(k, v)}</option>)
                  )}
                </select>
              </label>
            ))}
          </div>
        )}

        {actifs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
            {actifs.map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => changer(k, "")}
                aria-label={`Retirer le filtre ${LIBELLES[k]} : ${valeurAffichee(k, v!)}`}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-anthracite bg-neutral-1 px-3 text-[14px] leading-5 hover:bg-neutral-2"
              >
                {LIBELLES[k]} : {valeurAffichee(k, v!)}
                <X size={14} aria-hidden />
              </button>
            ))}
            <button type="button" onClick={() => setFiltres({})} className="inline-flex h-11 cursor-pointer items-center px-1 text-[14px] leading-5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink">
              Tout effacer
            </button>
          </div>
        )}

        <p className="text-[12px] leading-4 text-ink-2" aria-live="polite">{liste.length} actualité{liste.length > 1 ? "s" : ""}</p>
        {error ? (
          <p role="alert" className="text-[14px]">Les actualités sont indisponibles.</p>
        ) : loading ? (
          <p className="text-[14px] text-ink-2">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="text-[14px] text-ink-2">Aucune actualité pour ces filtres.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">{liste.map((n) => <Carte key={n.id} n={n} />)}</ul>
        )}
      </section>
    </div>
  );
}
