import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Image as ImageIcon, Info, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { HpPage } from "@/components/hp/page";
import { TabButton, TabList } from "@/components/hp/tabs";
import { hpButtonVariants } from "@/components/hp/button";
import { NewsImage } from "@/components/news-media";
import { NewsReader } from "@/components/news-reader";
import { fetchNews, type News } from "@/lib/dashboard";
import { useRouteContext } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/actualites")({
  head: () => ({ meta: [{ title: "Happy Place — Actualités" }] }),
  component: Actualites,
});

type Onglet = "toutes" | "equipe" | "entreprise";
type Filtres = { auteur?: string; date?: "7" | "30" };
type Cle = keyof Filtres;

const LIBELLES: Record<Cle, string> = { auteur: "Auteur", date: "Date" };
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const texteBrut = (s: string | null) => (s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const extrait = (n: News) => texteBrut(n.body).split(/(?<=\.)\s/)[0];
const lecture = (n: News) => Math.max(1, Math.round(texteBrut(n.body).split(/\s+/).length / 200));
const date = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));
const joursDepuis = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const valeurAffichee = (k: Cle, v: string) => (k === "date" ? `${v} derniers jours` : v);

function Actualites() {
  return (
    <HpPage>
      <Fil />
    </HpPage>
  );
}

function Carte({ n, onLire }: { n: News; onLire: (n: News) => void }) {
  return (
    <li className="relative flex flex-col border border-line bg-white">
      {n.image_path ? (
        <NewsImage path={n.image_path} alt="" className="h-48 border-0" />
      ) : (
        <div className="flex h-48 items-center justify-center bg-neutral-1" aria-hidden>
          <ImageIcon size={40} className="text-ink-2" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <span className="label w-fit border border-line px-2 py-1 text-ink">{n.scope === "equipes" ? "MON ÉQUIPE" : "ENTREPRISE"}</span>
        <h2 className="text-[20px] leading-7">
          <button type="button" onClick={() => onLire(n)} className="block cursor-pointer py-0.5 text-left after:absolute after:inset-0">
            {n.title}
          </button>
        </h2>
        {extrait(n) && <p className="line-clamp-3 text-[14px] leading-5">{extrait(n)}</p>}
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3 text-[12px] leading-4 text-ink-2">
          <p>
            <span className="font-semibold text-ink">{n.author}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Publié le {date(n.created_at)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden />
              {lecture(n)} min de lecture
            </span>
          </p>
        </div>
      </div>
    </li>
  );
}

function Fil() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const [onglet, setOnglet] = useState<Onglet>("toutes");
  const [recherche, setRecherche] = useState("");
  const [panneau, setPanneau] = useState(false);
  const [filtres, setFiltres] = useState<Filtres>({});
  const [lecteur, setLecteur] = useState<News | null>(null);
  const redacteur = role !== "collaborateur";

  const publiees = [...(news.data ?? [])].filter((n) => n.status === "publiée").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const equipe = publiees.filter((n) => n.scope === "equipes");
  const entreprise = publiees.filter((n) => n.scope !== "equipes");
  const base = onglet === "equipe" ? equipe : onglet === "entreprise" ? entreprise : publiees;
  const q = sansAccents(recherche.trim());
  const liste = base.filter(
    (n) =>
      (!q || sansAccents(`${n.title} ${texteBrut(n.body)} ${n.author}`).includes(q)) &&
      (!filtres.auteur || n.author === filtres.auteur) &&
      (!filtres.date || joursDepuis(n.created_at) <= Number(filtres.date)),
  );
  const auteurs = [...new Set(base.map((n) => n.author))];
  const actifs = (Object.entries(filtres) as [Cle, string | undefined][]).filter(([, v]) => v);
  const changer = (k: Cle, v: string) => setFiltres((f) => ({ ...f, [k]: v || undefined }));
  const select = "min-h-11 w-full border border-field bg-white px-3 text-[14px] text-ink";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border border-line bg-white px-8 py-6">
        <h1 className="text-[36px] leading-[44px]">Actualités</h1>
        <p className="text-[16px] leading-6">La communication interne de Bigger Boat.</p>
      </header>

      {!redacteur && (
        <section aria-labelledby="droits-titre" className="flex items-start gap-3 border border-line border-l-4 border-l-anthracite bg-neutral-1 px-6 py-4">
          <Info size={18} aria-hidden className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 text-[14px] leading-5">
            <h2 id="droits-titre" className="font-body text-[14px] leading-5 font-semibold">Information droits de publication (lecture seule)</h2>
            <p>Tu consultes les actualités publiées. Pour proposer une publication, adresse-toi à ton manager ou à un admin.</p>
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
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une actualité"
                className="h-11 w-64 border border-field bg-white pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-2"
              />
            </label>
            <button
              type="button"
              aria-expanded={panneau}
              aria-controls="filtres-actualites"
              onClick={() => setPanneau((p) => !p)}
              className={hpButtonVariants({ role: "consulte" })}
            >
              <SlidersHorizontal size={16} aria-hidden />
              <span>FILTRER</span>
            </button>
          </div>
        </div>

        {panneau && (
          <div id="filtres-actualites" className="grid gap-4 bg-neutral-1 p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="label text-ink">{LIBELLES.auteur}</span>
              <select value={filtres.auteur ?? ""} onChange={(e) => changer("auteur", e.target.value)} className={select}>
                <option value="">Tous</option>
                {auteurs.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="label text-ink">{LIBELLES.date}</span>
              <select value={filtres.date ?? ""} onChange={(e) => changer("date", e.target.value)} className={select}>
                <option value="">Tous</option>
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
              </select>
            </label>
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

        <p className="text-[12px] leading-4 text-ink-2" aria-live="polite">
          {liste.length} actualité{liste.length > 1 ? "s" : ""}
        </p>
        {news.isError ? (
          <p role="alert" className="text-[14px]">Les actualités sont indisponibles.</p>
        ) : news.isLoading ? (
          <p className="text-[14px] text-ink-2">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="text-[14px] text-ink-2">Aucune actualité pour ces filtres.</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {liste.map((n) => (
              <Carte key={n.id} n={n} onLire={setLecteur} />
            ))}
          </ul>
        )}
      </section>
      <NewsReader news={lecteur} onClose={() => setLecteur(null)} />
    </div>
  );
}
