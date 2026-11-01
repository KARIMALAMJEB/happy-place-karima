import { Link, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Contact, Database, LayoutDashboard, LogOut, Menu, Newspaper, Repeat, Search, TrendingUp, Wrench, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { signOut, type AppRole } from "@/lib/auth";
import { fetchMyRequests, fetchToReview, nonLue, stateOf } from "@/lib/requests";
import { cn } from "@/lib/utils";

// Coque V2 (portée du prototype) : menu latéral, en-tête, pied de page.
// Le menu ne propose que les pages qui existent dans cette application ; les autres rubriques
// (Actualités, Demandes, Indicateurs, Boîte à outils, Annuaire) s'ajouteront avec les lots suivants.

const ROLE_LABEL: Record<AppRole, string> = { admin: "Admin", manager: "Manager", collaborateur: "Collaborateur" };

function initiales(name: string) {
  const mots = name.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  const lettres = (mots.length > 1 ? mots[0][0] + mots[mots.length - 1][0] : (mots[0] ?? "?").slice(0, 2)).toUpperCase();
  return lettres;
}

function SkipLink() {
  return (
    <a
      href="#contenu"
      className="label-13 sr-only z-50 bg-anthracite px-4 py-3 text-on-anthracite focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Aller au contenu
    </a>
  );
}

// Compteur carré du menu : anthracite, avec nom accessible complet
function Count({ children, label }: { children: number; label: string }) {
  return (
    <span role="status" aria-label={label} className="label inline-flex h-5 min-w-5 items-center justify-center bg-anthracite px-1 tracking-normal text-on-anthracite">
      {children}
    </span>
  );
}

// Même définition que les tuiles « À traiter » / « À valider » de l'accueil
function useCompteurDemandes(role: AppRole) {
  const { email } = useRouteContext({ from: "/_authenticated" });
  const mail = (email ?? "").toLowerCase();
  const mes = useQuery({ queryKey: ["requests", "mine", mail], enabled: !!mail && role === "collaborateur", queryFn: () => fetchMyRequests(mail) });
  const aValider = useQuery({ queryKey: ["requests", "review"], enabled: role !== "collaborateur", queryFn: fetchToReview });
  if (role === "collaborateur") {
    const n = (mes.data ?? []).filter((r) => stateOf(r) === "a_completer" || nonLue(r)).length;
    return { n, label: `${n} demande${n > 1 ? "s" : ""} à traiter : réponses non lues et demandes à compléter` };
  }
  const n = aValider.data?.length ?? 0;
  return { n, label: `${n} demande${n > 1 ? "s" : ""} à valider` };
}

function Sidebar({ role, ouvert, onFermer }: { role: AppRole; ouvert: boolean; onFermer: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const actifTableau = pathname === "/";
  const compteur = useCompteurDemandes(role);
  const actifGestion = pathname.startsWith("/manage");
  const actifActus = pathname.startsWith("/actualites");
  const actifIndic = pathname.startsWith("/indicateurs");
  const actifOutils = pathname.startsWith("/boite-a-outils");
  const actifAnnuaire = pathname.startsWith("/annuaire");
  const actifDemandes = pathname.startsWith("/demande") || pathname.startsWith("/deposer");
  const lien = (actif: boolean) =>
    cn(
      "label-13 flex h-12 items-center gap-3 border-l-4 px-5",
      actif ? "border-l-anthracite bg-neutral-1 text-anthracite" : "border-l-transparent text-ink hover:bg-neutral-1",
    );
  return (
    <aside
      id="menu-lateral"
      aria-label="Menu"
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-white lg:z-20 lg:flex lg:w-64",
        ouvert ? "flex" : "hidden",
      )}
    >
      <div className="flex justify-end border-b border-line p-2 lg:hidden">
        <HpIconButton icon={X} label="Fermer le menu" onClick={onFermer} />
      </div>
      <Link to="/" className="flex h-16 flex-col justify-center border-b border-line px-5">
        <span className="label text-ink-2">BIGGER BOAT</span>
        <span className="font-title text-[18px] leading-6 font-bold text-ink">HAPPY PLACE</span>
      </Link>
      <nav aria-label="Menu principal" className="flex flex-col py-2">
        <Link to="/" aria-current={actifTableau ? "page" : undefined} className={lien(actifTableau)}>
          <LayoutDashboard size={18} aria-hidden />
          <span className="flex-1">Tableau de bord</span>
        </Link>
        <Link to="/actualites" aria-current={actifActus ? "page" : undefined} className={lien(actifActus)}>
          <Newspaper size={18} aria-hidden />
          <span className="flex-1">Actualités</span>
        </Link>
        <Link to="/demandes" aria-current={actifDemandes ? "page" : undefined} className={lien(actifDemandes)}>
          <ClipboardList size={18} aria-hidden />
          <span className="flex-1">Demandes</span>
          {compteur.n > 0 && <Count label={compteur.label}>{compteur.n}</Count>}
        </Link>
        <Link to="/indicateurs" aria-current={actifIndic ? "page" : undefined} className={lien(actifIndic)}>
          <TrendingUp size={18} aria-hidden />
          <span className="flex-1">Indicateurs</span>
        </Link>
        <Link to="/boite-a-outils" aria-current={actifOutils ? "page" : undefined} className={lien(actifOutils)}>
          <Wrench size={18} aria-hidden />
          <span className="flex-1">Boîte à outils</span>
        </Link>
        <Link to="/annuaire" aria-current={actifAnnuaire ? "page" : undefined} className={lien(actifAnnuaire)}>
          <Contact size={18} aria-hidden />
          <span className="flex-1">Annuaire</span>
        </Link>
        {role === "admin" && (
          <Link to="/manage/news" aria-current={actifGestion ? "page" : undefined} className={lien(actifGestion)}>
            <Database size={18} aria-hidden />
            <span className="flex-1">Gestion des données</span>
          </Link>
        )}
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-line p-5">
        <Link to="/choisir-role" className="label inline-flex items-center gap-2 text-ink-2 underline underline-offset-4 hover:text-ink">
          <Repeat size={14} aria-hidden /> Changer de rôle (démo)
        </Link>
        <HpButton role="consulte" icon={LogOut} className="w-full lg:hidden" onClick={() => signOut()}>
          SE DÉCONNECTER
        </HpButton>
      </div>
    </aside>
  );
}

function Header({ name, role, sousTitre, menuOuvert, onMenu }: { name: string; role: AppRole; sousTitre?: string | null; menuOuvert: boolean; onMenu: () => void }) {
  return (
    <header className="fixed top-0 right-0 left-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-line bg-white px-4 lg:left-64 lg:gap-6 lg:px-8">
      <div className="flex items-center gap-3 lg:gap-6">
        <HpButton
          role="consulte"
          icon={Menu}
          className="lg:hidden"
          aria-expanded={menuOuvert}
          aria-controls="menu-lateral"
          onClick={onMenu}
        >
          MENU
        </HpButton>
        <span className="label-13 text-ink">HAPPY PLACE V2</span>
        <label className="relative hidden items-center lg:flex">
          <span className="sr-only">Rechercher</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-ink-2" />
          <input
            type="search"
            placeholder="Rechercher une demande, un document, une personne"
            className="h-11 w-96 border border-field bg-white pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-2"
          />
        </label>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="label flex size-10 items-center justify-center border border-line bg-neutral-1 text-ink">
            {initiales(name)}
          </span>
          <span className="hidden flex-col lg:flex">
            <span className="text-[14px] leading-5 font-semibold text-ink">{name}</span>
            <span className="text-[12px] leading-4 text-ink-2">{sousTitre ?? ROLE_LABEL[role]}</span>
          </span>
          <span className="sr-only lg:hidden">{name}</span>
        </div>
        <HpButton role="consulte" icon={LogOut} className="hidden lg:inline-flex" onClick={() => signOut()}>
          SE DÉCONNECTER
        </HpButton>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="flex items-center gap-2 border-t border-line px-8 py-4 text-[12px] leading-4 text-ink-2">
      <Link to="/confidentialite" className="inline-flex min-h-6 items-center underline underline-offset-2 hover:text-ink">
        Confidentialité
      </Link>
      <span aria-hidden>·</span>
      <Link to="/confidentialite" hash="mentions-legales" className="inline-flex min-h-6 items-center underline underline-offset-2 hover:text-ink">
        Mentions légales
      </Link>
      <span aria-hidden>·</span>
      <span>Happy Place V2 (démo)</span>
    </footer>
  );
}

export function AppShell({ name, role, equipe, children }: { name: string; role: AppRole; equipe?: string | null; children: ReactNode }) {
  // Mobile : menu latéral en tiroir, refermé à chaque changement de page et avec Échap
  const [menu, setMenu] = useState(false);
  const chemin = useRouterState({ select: (s) => s.location.href });
  useEffect(() => setMenu(false), [chemin]);
  useEffect(() => {
    if (!menu) return;
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [menu]);

  return (
    <div className="hp-shell min-h-screen bg-ecru">
      <SkipLink />
      <Sidebar role={role} ouvert={menu} onFermer={() => setMenu(false)} />
      {menu && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-40 bg-anthracite/50 lg:hidden"
        />
      )}
      <Header name={name} role={role} sousTitre={equipe} menuOuvert={menu} onMenu={() => setMenu(true)} />
      <div className="flex min-h-screen flex-col pt-16 lg:pl-64">
        <main id="contenu" tabIndex={-1} className="flex-1 focus:outline-none">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-4 lg:px-8 lg:py-8">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
