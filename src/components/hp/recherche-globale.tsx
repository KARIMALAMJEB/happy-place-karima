import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { texteBrut } from "@/components/hp/rich-text";
import type { AppRole } from "@/lib/auth";
import { PERSONNES } from "@/lib/annuaire";
import { fetchNews } from "@/lib/dashboard";
import { RESSOURCES, ressourceVisible } from "@/lib/outils";
import { fetchAllRequests, fetchMyRequests, fetchValidatedRequests, refOf, titleOf, type RequestRow } from "@/lib/requests";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type Resultat = { id: string; groupe: string; titre: string; detail?: string; aller: (nav: ReturnType<typeof useNavigate>) => void };

const PAGES: Resultat[] = [
  { id: "p-accueil", groupe: "Pages", titre: "Tableau de bord", detail: "Accueil", aller: (n) => void n({ to: "/" }) },
  { id: "p-actus", groupe: "Pages", titre: "Actualités", detail: "Fil de l'entreprise et de l'équipe", aller: (n) => void n({ to: "/actualites" }) },
  { id: "p-demandes", groupe: "Pages", titre: "Demandes", detail: "Suivre mes demandes et mes idées", aller: (n) => void n({ to: "/demandes" }) },
  { id: "p-deposer", groupe: "Pages", titre: "Déposer une demande ou une idée", detail: "Écrire une demande, proposer une idée", aller: (n) => void n({ to: "/deposer" }) },
  { id: "p-indic", groupe: "Pages", titre: "Indicateurs", detail: "Chiffres clés de l'entreprise", aller: (n) => void n({ to: "/indicateurs" }) },
  { id: "p-outils", groupe: "Pages", titre: "Boîte à outils", detail: "Process, outils, infos RH, assistance", aller: (n) => void n({ to: "/boite-a-outils" }) },
  { id: "p-annuaire", groupe: "Pages", titre: "Annuaire", detail: "Équipes et personnes", aller: (n) => void n({ to: "/annuaire" }) },
];

export function RechercheGlobale({ role, equipe }: { role: AppRole; equipe?: string | null }) {
  const { email } = useRouteContext({ from: "/_authenticated" });
  const mail = (email ?? "").toLowerCase();
  const navigate = useNavigate();
  const [saisie, setSaisie] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const idListe = useId();
  const q = sansAccents(saisie.trim());
  const cherche = q.length >= 2;

  const news = useQuery({ queryKey: ["news"], enabled: cherche, queryFn: fetchNews, retry: false, staleTime: 60_000 });
  const mes = useQuery({ queryKey: ["requests", "mine", mail], enabled: cherche && !!mail, queryFn: () => fetchMyRequests(mail), staleTime: 60_000 });
  const valides = useQuery({ queryKey: ["requests", "validated"], enabled: cherche, queryFn: fetchValidatedRequests, retry: false, staleTime: 60_000 });
  const toutes = useQuery({ queryKey: ["requests", "all"], enabled: cherche && role === "admin", queryFn: fetchAllRequests, retry: false, staleTime: 60_000 });

  const resultats = useMemo<Resultat[]>(() => {
    if (!cherche) return [];
    const out: Resultat[] = [];
    const ok = (...t: (string | null | undefined)[]) => sansAccents(t.filter(Boolean).join(" ")).includes(q);

    out.push(...PAGES.filter((p) => ok(p.titre, p.detail)));

    const demandes = new Map<string, RequestRow>();
    for (const r of [...(valides.data ?? []), ...(mes.data ?? []), ...(toutes.data ?? [])]) demandes.set(r.id, r);
    [...demandes.values()]
      .filter((r) => ok(titleOf(r), texteBrut(r.content ?? ""), r.team, r.confidential_identity ? "" : r.author_name))
      .slice(0, 5)
      .forEach((r) =>
        out.push({
          id: `d-${r.id}`,
          groupe: "Demandes",
          titre: titleOf(r),
          detail: `${refOf(r)} · ${r.team}${r.confidential_identity && r.submitted_by_email?.toLowerCase() !== mail && role !== "admin" ? "" : ` · ${r.author_name}`}`,
          aller: (n) => void n({ to: "/demande/$id", params: { id: r.id } }),
        }),
      );

    (news.data ?? [])
      .filter((n) => n.status === "publiée" && ok(n.title, texteBrut(n.body ?? ""), n.author))
      .slice(0, 5)
      .forEach((n) =>
        out.push({ id: `n-${n.id}`, groupe: "Actualités", titre: n.title, detail: n.author, aller: (nv) => void nv({ to: "/actualites/$id", params: { id: n.id } }) }),
      );

    PERSONNES.filter((p) => ok(p.nom, p.equipe, p.role))
      .slice(0, 5)
      .forEach((p) => out.push({ id: `a-${p.nom}`, groupe: "Personnes", titre: p.nom, detail: `${p.role} · ${p.equipe}`, aller: (n) => void n({ to: "/annuaire" }) }));

    RESSOURCES.filter((r) => ressourceVisible(r, role, [equipe]) && ok(r.titre, r.description, r.categorie))
      .slice(0, 5)
      .forEach((r) =>
        out.push(
          r.type
            ? { id: `o-${r.id}`, groupe: "Boîte à outils", titre: r.titre, detail: r.categorie, aller: (n) => void n({ to: "/boite-a-outils/$id", params: { id: r.id } }) }
            : { id: `o-${r.id}`, groupe: "Boîte à outils", titre: r.titre, detail: r.categorie, aller: (n) => void n({ to: "/boite-a-outils" }) },
        ),
      );
    return out;
  }, [cherche, q, valides.data, mes.data, toutes.data, news.data, role, equipe, mail]);

  useEffect(() => setActif(0), [q]);
  useEffect(() => {
    const dehors = (e: MouseEvent) => !racine.current?.contains(e.target as Node) && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, []);

  const choisir = (r: Resultat) => {
    r.aller(navigate);
    setOuvert(false);
    setSaisie("");
  };
  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setOuvert(false);
    if (!resultats.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setOuvert(true); setActif((a) => (a + 1) % resultats.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => (a - 1 + resultats.length) % resultats.length); }
    if (e.key === "Enter" && ouvert) { e.preventDefault(); choisir(resultats[actif]); }
  };
  const charge = cherche && (news.isLoading || valides.isLoading || mes.isLoading);

  return (
    <div ref={racine} role="search" className="relative hidden lg:block">
      <label className="relative flex items-center">
        <span className="sr-only">Rechercher une demande, une actualité, une personne ou un document</span>
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-ink-2" />
        <input
          type="search"
          role="combobox"
          aria-expanded={ouvert && cherche}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={ouvert && resultats[actif] ? `${idListe}-${resultats[actif].id}` : undefined}
          value={saisie}
          onChange={(e) => { setSaisie(e.target.value); setOuvert(true); }}
          onFocus={() => setOuvert(true)}
          onKeyDown={clavier}
          placeholder="Rechercher une demande, une actualité, une personne"
          className="h-11 w-96 border border-field bg-white pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-2"
        />
      </label>
      {ouvert && cherche && (
        <div id={idListe} role="listbox" aria-label="Résultats de recherche" className="absolute top-12 left-0 z-20 max-h-[70vh] w-[32rem] overflow-y-auto border border-line bg-white shadow-lg">
          {resultats.length === 0 ? (
            <p className="px-4 py-3 text-[14px] leading-5 text-ink-2">{charge ? "Recherche en cours…" : `Aucun résultat pour « ${saisie.trim()} ».`}</p>
          ) : (
            resultats.map((r, i) => (
              <div key={r.id}>
                {(i === 0 || resultats[i - 1].groupe !== r.groupe) && <p className="label border-b border-line bg-neutral-1 px-4 py-1.5 text-ink-2">{r.groupe}</p>}
                <div
                  id={`${idListe}-${r.id}`}
                  role="option"
                  aria-selected={i === actif}
                  tabIndex={-1}
                  onMouseEnter={() => setActif(i)}
                  onMouseDown={(e) => { e.preventDefault(); choisir(r); }}
                  className={`flex cursor-pointer flex-col gap-0.5 border-b border-line px-4 py-2 ${i === actif ? "bg-neutral-1" : "bg-white"}`}
                >
                  <span className="text-[14px] leading-5 font-semibold text-ink">{r.titre}</span>
                  {r.detail && <span className="text-[12px] leading-4 text-ink-2">{r.detail}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
