import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { HpButton } from "@/components/hp/button";
import { Picto } from "@/components/hp/encadre";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { TabButton, TabList } from "@/components/hp/tabs";
import { BOITE_A_OUTILS, ICONES_OUTILS, RESSOURCES, ressourceVisible, type CategorieOutil, type Ressource } from "@/lib/outils";

export const Route = createFileRoute("/_authenticated/boite-a-outils")({ component: BoiteAOutils });

const TITRES: Record<CategorieOutil, string> = { PROCESS: "Process", OUTILS: "Outils", "INFOS RH": "Infos RH", "ASSISTANCE ET SUPPORT": "Assistance et support" };
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const libellePortee = (p: string) => (p === "entreprise" ? "Toute l'entreprise" : p);
const TEXT_LINK =
  "inline-flex h-11 items-center gap-2 px-1 text-[14px] leading-5 font-semibold whitespace-nowrap text-anthracite underline underline-offset-4 hover:text-ink";

const typeDe = (r: Ressource) =>
  r.type === "process" ? "Process" : r.type === "document" ? "Document" : r.pdf ? "PDF" : r.url ? "Lien" : r.page ? "Page Happy Place" : "Information";

// Titre de carte : lien étiré sur toute la carte quand une destination existe
function TitreCarte({ r }: { r: Ressource }) {
  const classe = "block py-0.5 text-[14px] leading-5 font-semibold text-ink after:absolute after:inset-0";
  if (r.texte)
    return (
      <Link to="/boite-a-outils/$id" params={{ id: r.id }} className={classe}>
        {r.titre}
      </Link>
    );
  if (r.page === "annuaire")
    return (
      <Link to="/annuaire" className={classe}>
        {r.titre}
      </Link>
    );
  if (r.page === "demandes")
    return (
      <Link to="/demandes" className={classe}>
        {r.titre}
      </Link>
    );
  if (r.page === "actualites")
    return (
      <Link to="/" className={classe}>
        {r.titre}
      </Link>
    );
  if (r.url || r.pdf)
    return (
      <a href={r.pdf?.url ?? r.url} target="_blank" rel="noreferrer" className={classe}>
        {r.titre}
        <span className="sr-only"> ({r.pdf ? "PDF" : "lien"}, nouvel onglet)</span>
      </a>
    );
  return <span className="block py-0.5 text-[14px] leading-5 font-semibold">{r.titre}</span>;
}

function BoiteAOutils() {
  return (
    <HpPage>
      <Page />
    </HpPage>
  );
}

function Page() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const { team } = useOwnProfile();
  const admin = role === "admin";
  const [filtre, setFiltre] = useState<CategorieOutil | "tous">("tous");
  const [recherche, setRecherche] = useState("");
  const q = sansAccents(recherche.trim());
  const categories = BOITE_A_OUTILS.filter((c) => filtre === "tous" || c === filtre);
  const visibles = RESSOURCES.filter(
    (r) => ressourceVisible(r, role, [team]) && (!q || sansAccents(`${r.titre} ${r.description} ${r.texte ?? ""}`).includes(q)),
  );

  const carte = (r: Ressource) => (
    <li key={r.id} className="relative flex flex-col gap-2 border border-line bg-white px-5 py-4 hover:bg-neutral-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <TitreCarte r={r} />
          <p className="text-[14px] leading-5 text-ink">{r.description}</p>
          <p className="text-[12px] leading-4 text-ink-2">
            {typeDe(r)}
            {admin && ` · Portée : ${libellePortee(r.portee)}`}
          </p>
        </div>
        {(r.texte || r.page || r.url || r.pdf) && <ArrowRight size={18} aria-hidden className="mt-1 shrink-0 text-anthracite" />}
      </div>
    </li>
  );
  const assistance = visibles.filter((r) => r.categorie === "ASSISTANCE ET SUPPORT");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-6 border border-line bg-white px-8 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] leading-[44px]">Boîte à outils</h1>
          <p className="text-[16px] leading-6">Les process, outils et informations utiles au quotidien chez Bigger Boat.</p>
        </div>
        <label className="relative flex items-center">
          <span className="sr-only">Rechercher dans la boîte à outils</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-ink-2" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un outil, un process…"
            className="h-11 w-72 border border-field bg-white pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-2"
          />
        </label>
      </header>

      {filtre === "tous" && (
        <section aria-labelledby="assistance-titre" className="flex flex-col gap-4 border border-line border-l-4 border-l-anthracite bg-neutral-1 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Picto icon={ICONES_OUTILS["ASSISTANCE ET SUPPORT"]} className="bg-white" />
              <div>
                <h2 id="assistance-titre" className="text-[22px] leading-7">
                  Assistance et support
                </h2>
                <p className="text-[14px] leading-5">
                  Un accès bloqué, un matériel en panne : commence ici. {assistance.length} document{assistance.length > 1 ? "s" : ""}.
                </p>
              </div>
            </div>
            <Link to="/annuaire" hash="equipe-support-et-moyens-generaux" className={TEXT_LINK}>
              Voir l'équipe Support et moyens généraux dans l'Annuaire
            </Link>
          </div>
          {assistance.length > 0 && <ul className="grid gap-4 md:grid-cols-2">{assistance.map(carte)}</ul>}
        </section>
      )}

      <TabList label="Catégorie">
        <TabButton active={filtre === "tous"} onClick={() => setFiltre("tous")}>TOUS</TabButton>
        {BOITE_A_OUTILS.map((c) => (
          <TabButton key={c} active={filtre === c} onClick={() => setFiltre(c)}>
            {c}
          </TabButton>
        ))}
      </TabList>

      {categories
        .filter((c) => filtre !== "tous" || c !== "ASSISTANCE ET SUPPORT")
        .map((c) => {
          const Icon = ICONES_OUTILS[c];
          const items = visibles.filter((r) => r.categorie === c);
          if (items.length === 0 && q) return null;
          return (
            <section key={c} id={c} className="flex scroll-mt-24 flex-col border border-line border-l-4 border-l-anthracite bg-white">
              <div className="flex items-center gap-4 border-b border-line bg-neutral-1 px-6 py-4">
                <Picto icon={Icon} className="bg-white" />
                <h2 className="flex-1 text-[22px] leading-7 text-anthracite">{TITRES[c]}</h2>
                <span className="text-[14px] leading-5 text-ink">
                  {items.length} document{items.length > 1 ? "s" : ""}
                </span>
                {filtre === "tous" && (
                  <HpButton role="consulte" aria-label={`Ouvrir la catégorie ${TITRES[c]}`} onClick={() => setFiltre(c)}>
                    OUVRIR
                  </HpButton>
                )}
              </div>
              {items.length === 0 && <p className="px-6 py-4 text-[14px] text-ink-2">Aucun élément dans cette catégorie.</p>}
              <ul className="grid gap-4 p-6 md:grid-cols-2">{items.map(carte)}</ul>
            </section>
          );
        })}
      {q && visibles.length === 0 && <p className="text-[14px] text-ink-2">Aucun résultat pour « {recherche} ».</p>}
    </div>
  );
}
