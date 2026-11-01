import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, FileCheck2, Hourglass, Paperclip, Search, Send, X, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { Encadre } from "@/components/hp/encadre";
import { BarreFiltres, correspond, dansPeriode, equipesDe, type Periode } from "@/components/hp/filtres-liste";
import { StatutPublication, dateCourte, fichiersDe, joursDepuis, libellePerimetre, tonNews } from "@/components/hp/news-shared";
import { texteBrut } from "@/components/hp/rich-text";
import { POINTS, TraitStatut } from "@/components/hp/statut";
import { TabButton, TabList } from "@/components/hp/tabs";
import { authorizeNews, publishDraftNews, refuseNews, requestNewsAuthorization, type News } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const TEXT_LINK =
  "inline-flex h-11 items-center gap-2 px-1 text-[14px] leading-5 font-semibold whitespace-nowrap text-anthracite underline underline-offset-4 hover:text-ink cursor-pointer";
const prenom = (nom?: string | null) => nom?.split(" ")[0] ?? "un admin";

// Actions du circuit d'autorisation (communes aux trois onglets)
export function useActionsActus(fullName: string) {
  const qc = useQueryClient();
  const invalider = () => qc.invalidateQueries({ queryKey: ["news"] });
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "L'action a échoué");
  return {
    publier: useMutation({ mutationFn: publishDraftNews, onSuccess: () => { toast.success("Actualité publiée"); invalider(); }, onError }),
    demander: useMutation({ mutationFn: requestNewsAuthorization, onSuccess: () => { toast.success("Demande envoyée : un admin doit autoriser cette annonce"); invalider(); }, onError }),
    autoriser: useMutation({
      mutationFn: (n: News) => authorizeNews({ id: n.id, by: fullName }),
      onSuccess: (_r, n) => { toast.success(`Annonce autorisée : ${prenom(n.author)} peut la publier`); invalider(); },
      onError,
    }),
    refuser: useMutation({
      mutationFn: refuseNews,
      onSuccess: () => { toast.success("Annonce refusée : l'auteur voit ton explication"); invalider(); },
      onError,
    }),
  };
}

const MAX_EXPLICATION = 500;

// Modale de refus : explication obligatoire, visible par l'auteur dans ses publications
function RefusAnnonce({ a, onFermer, onConfirmer, envoi }: { a?: News; onFermer: () => void; onConfirmer: (motif: string) => void; envoi?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");
  useEffect(() => {
    if (a && !ref.current?.open) {
      setMotif("");
      setErreur("");
      ref.current?.showModal();
    }
    if (!a && ref.current?.open) ref.current.close();
  }, [a]);
  return (
    <dialog ref={ref} aria-labelledby="refus-annonce-titre" onClose={onFermer} className="m-auto w-[600px] max-w-[calc(100vw-32px)] border border-anthracite bg-white p-0 text-ink backdrop:bg-anthracite/50">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <div>
          <h2 id="refus-annonce-titre" className="text-[24px] leading-8">Refuser l'annonce</h2>
          <p className="text-[12px] leading-4 text-ink-2">{a?.title}</p>
        </div>
        <HpIconButton icon={X} label="Fermer" className="border-0" onClick={onFermer} />
      </div>
      <div className="flex flex-col gap-2 px-6 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="motif-annonce" className="label text-ink">Explication *</label>
          <span className="text-[12px] leading-4 text-ink-2">{motif.length} / {MAX_EXPLICATION}</span>
        </div>
        <p id="motif-annonce-aide" className="text-[12px] leading-4 text-ink-2">L'auteur voit cette explication dans ses publications.</p>
        <textarea
          id="motif-annonce"
          rows={4}
          maxLength={MAX_EXPLICATION}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          aria-describedby="motif-annonce-aide"
          className="w-full border border-field bg-white px-3 py-2 text-[14px] leading-5"
        />
        {erreur && <p role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">{erreur}</p>}
      </div>
      <div className="flex items-center justify-end gap-4 border-t border-line px-6 py-4">
        <button type="button" onClick={onFermer} className={TEXT_LINK}>Annuler</button>
        <HpButton
          role="refuse"
          icon={X}
          disabled={envoi}
          onClick={() => {
            if (!motif.trim()) {
              setErreur("Explique ton refus à l'auteur.");
              return document.getElementById("motif-annonce")?.focus();
            }
            onConfirmer(motif.trim());
          }}
        >
          CONFIRMER LE REFUS
        </HpButton>
      </div>
    </dialog>
  );
}

// ---------- Onglet « À autoriser » (admin) ----------
export function AutoriserTab({ liste, actions }: { liste: News[]; actions: ReturnType<typeof useActionsActus> }) {
  const [refus, setRefus] = useState<News>();
  const [q, setQ] = useState("");
  const [equipe, setEquipe] = useState("");
  const [periode, setPeriode] = useState<Periode>("");
  const actifs = !!(q || equipe || periode);
  const filtrees = liste.filter(
    (a) => correspond(q, a.title, a.author, a.author_team, a.category, texteBrut(a.body ?? "").slice(0, 200)) && (!equipe || a.author_team === equipe) && dansPeriode(a.requested_at ?? a.created_at, periode),
  );
  return (
    <div className="flex flex-col gap-4">
      {liste.length > 0 && (
        <div className="border border-line bg-white px-6 py-4">
          <BarreFiltres
            recherche={q}
            onRecherche={setQ}
            placeholder="Rechercher un auteur, un titre, une catégorie"
            equipe={equipe}
            onEquipe={setEquipe}
            equipes={equipesDe(liste.map((a) => a.author_team))}
            periode={periode}
            onPeriode={setPeriode}
            actifs={actifs}
            onReinitialiser={() => { setQ(""); setEquipe(""); setPeriode(""); }}
          />
          <p role="status" className="pt-2 text-[12px] leading-4 text-ink-2">{filtrees.length} sur {liste.length} annonce{liste.length > 1 ? "s" : ""} à autoriser</p>
        </div>
      )}
      {filtrees.length === 0 ? (
        <p className="border border-line bg-white px-6 py-8 text-center text-[16px] leading-6">{liste.length === 0 ? "Rien à autoriser pour le moment." : "Aucune annonce ne correspond à ces filtres."}</p>
      ) : (
        filtrees.map((a) => (
          <article key={a.id} className="relative flex flex-col gap-3 border border-line bg-white py-5 pr-6 pl-7">
            <TraitStatut ton={tonNews(a.status)} />
            <h3 className="text-[22px] leading-7">{a.title}</h3>
            <p className="text-[12px] leading-4 text-ink-2">
              {[a.author, a.author_team, `Demandée le ${dateCourte(a.requested_at ?? a.created_at)}`, "Toute l'entreprise"].filter(Boolean).join(" · ")}
            </p>
            {a.body && <p className="line-clamp-2 max-w-[80ch] text-[14px] leading-5">{texteBrut(a.body)}</p>}
            {fichiersDe(a).length > 0 && (
              <p className="flex items-center gap-2 text-[12px] leading-4 text-ink-2">
                <Paperclip size={14} aria-hidden />
                {fichiersDe(a).map((f) => f.name).join(", ")}
              </p>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
              <Link to="/actualites/$id" params={{ id: a.id }} className={TEXT_LINK}>Voir l'aperçu complet</Link>
              <span className="flex gap-3">
                <HpButton role="refuse" icon={X} onClick={() => setRefus(a)}>REFUSER AVEC MOTIF</HpButton>
                <HpButton role="valide" icon={Check} disabled={actions.autoriser.isPending} onClick={() => actions.autoriser.mutate(a)}>AUTORISER</HpButton>
              </span>
            </div>
          </article>
        ))
      )}
      <RefusAnnonce
        a={refus}
        envoi={actions.refuser.isPending}
        onFermer={() => setRefus(undefined)}
        onConfirmer={(note) => {
          if (!refus) return;
          actions.refuser.mutate({ id: refus.id, note }, { onSuccess: () => setRefus(undefined) });
        }}
      />
    </div>
  );
}

// ---------- Onglet « Suivi des publications » (admin) ----------
type FiltreSuivi = "toutes" | "en attente" | "autorisée" | "publiée" | "refusée" | "mes";
const TUILES: { filtre: FiltreSuivi; label: string; icon: LucideIcon }[] = [
  { filtre: "en attente", label: "À autoriser", icon: Hourglass },
  { filtre: "autorisée", label: "Autorisées, à publier", icon: FileCheck2 },
  { filtre: "publiée", label: "Publiées", icon: CheckCheck },
  { filtre: "refusée", label: "Refusées", icon: X },
];

function derniereAction(a: News) {
  switch (a.status) {
    case "en attente": return `Demandée le ${dateCourte(a.requested_at ?? a.created_at)}`;
    case "autorisée": return `Autorisée le ${dateCourte(a.authorized_at)} par ${a.authorized_by ?? "un admin"}`;
    case "publiée": return `Publiée le ${dateCourte(a.created_at)}`;
    case "refusée": return "Refusée";
    default: return `Modifiée le ${dateCourte(a.created_at)}`;
  }
}

export function SuiviTab({ toutes, miennes, initial, statutInitial }: { toutes: News[]; miennes: News[]; initial?: "mes"; statutInitial?: string }) {
  const [filtre, setFiltre] = useState<FiltreSuivi>(initial ?? "toutes");
  const [motifOuvert, setMotifOuvert] = useState<string>();
  const [q, setQ] = useState("");
  const [equipe, setEquipe] = useState("");
  const [periode, setPeriode] = useState<Periode>("");
  const entreprise = toutes.filter((a) => (a.scope ?? "entreprise") === "entreprise" && a.status !== "brouillon");
  const mes = statutInitial ? miennes.filter((a) => a.status === statutInitial) : miennes;
  const n = (f: FiltreSuivi) => (f === "mes" ? mes.length : f === "toutes" ? entreprise.length : entreprise.filter((a) => a.status === f).length);
  const source = filtre === "mes" ? mes : filtre === "toutes" ? entreprise : entreprise.filter((a) => a.status === filtre);
  const actifs = !!(q || equipe || periode);
  const liste = source
    .filter((a) => correspond(q, a.title, a.author, a.author_team, a.category) && (!equipe || a.author_team === equipe) && dansPeriode(a.requested_at ?? a.created_at, periode))
    .sort((x, y) => (y.requested_at ?? y.created_at).localeCompare(x.requested_at ?? x.created_at));
  const action = (a: News) => {
    if (a.status === "en attente") return <Link to="/actualites" search={{ onglet: "autoriser" }} className={TEXT_LINK}>Examiner</Link>;
    if (a.status === "refusée")
      return (
        <button type="button" aria-expanded={motifOuvert === a.id} className={TEXT_LINK} onClick={() => setMotifOuvert((m) => (m === a.id ? undefined : a.id))}>
          {motifOuvert === a.id ? "Masquer le motif" : "Voir le motif"}
        </button>
      );
    if (a.status === "brouillon") return <Link to="/rediger" search={{ id: a.id }} className={TEXT_LINK}>Reprendre</Link>;
    return <Link to="/actualites/$id" params={{ id: a.id }} className={TEXT_LINK}>Consulter</Link>;
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {TUILES.map((t) => (
          <button
            key={t.filtre}
            type="button"
            aria-pressed={filtre === t.filtre}
            onClick={() => setFiltre((f) => (f === t.filtre ? "toutes" : t.filtre))}
            className={cn(
              "flex h-[72px] cursor-pointer items-center gap-3 border border-b-2 px-4 text-left",
              filtre === t.filtre ? "border-anthracite bg-white" : "border-line border-b-line bg-white hover:border-anthracite",
            )}
          >
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center bg-neutral-1">
              <t.icon size={18} className="text-anthracite" />
            </span>
            <span className="flex flex-col">
              <span className="font-title text-[24px] leading-8 font-bold">{n(t.filtre)}</span>
              <span className="label flex items-center gap-1.5 text-ink-2">
                <span aria-hidden className="size-2.5" style={{ backgroundColor: POINTS[tonNews(t.filtre)] }} />
                {t.label}
              </span>
            </span>
          </button>
        ))}
      </div>
      <Encadre title="Suivi des publications" compteur={`${liste.length} annonce${liste.length > 1 ? "s" : ""}`}>
        <div className="px-6 py-4">
          <TabList label="Périmètre">
            <TabButton active={filtre !== "mes"} onClick={() => setFiltre("toutes")}>{`ANNONCES ENTREPRISE (${n("toutes")})`}</TabButton>
            <TabButton active={filtre === "mes"} onClick={() => setFiltre("mes")}>{`MES PUBLICATIONS (${n("mes")})`}</TabButton>
          </TabList>
        </div>
        {source.length > 0 && (
          <div className="border-t border-line px-6 py-3">
            <BarreFiltres
              recherche={q}
              onRecherche={setQ}
              placeholder="Rechercher un auteur, un titre, une catégorie"
              equipe={equipe}
              onEquipe={setEquipe}
              equipes={equipesDe(source.map((a) => a.author_team))}
              periode={periode}
              onPeriode={setPeriode}
              actifs={actifs}
              onReinitialiser={() => { setQ(""); setEquipe(""); setPeriode(""); }}
            />
          </div>
        )}
        {liste.length === 0 ? (
          <p className="border-t border-line px-6 py-5 text-[14px] text-ink-2">Aucune annonce avec ce filtre.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-neutral-1">
                {["Annonce", "Auteur", "Statut", "Dernière action", "Action"].map((h) => (
                  <th key={h} scope="col" className="label h-11 px-3 text-ink-2 first:pl-6 last:pr-6 last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-b border-line">
                    <td className="relative max-w-[280px] py-3 pr-3 pl-6">
                      <TraitStatut ton={tonNews(a.status)} />
                      <span className="block text-[14px] leading-5 font-semibold">{a.title}</span>
                      {filtre === "mes" && <span className="text-[12px] leading-4 text-ink-2">{libellePerimetre(a)}</span>}
                    </td>
                    <td className="px-3 text-[14px] leading-5">{a.author}{a.author_team && <span className="block text-[12px] leading-4 text-ink-2">{a.author_team}</span>}</td>
                    <td className="px-3"><StatutPublication statut={a.status} /></td>
                    <td className="px-3 text-[12px] leading-4 text-ink-2">{derniereAction(a)}</td>
                    <td className="pr-6 text-right">{action(a)}</td>
                  </tr>
                  {motifOuvert === a.id && (
                    <tr className="border-b border-line bg-neutral-1">
                      <td colSpan={5} className="px-6 py-3 text-[14px] leading-5">
                        Motif transmis à {a.author} : « {a.refusal_note ?? "non renseigné"} »
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Encadre>
    </div>
  );
}

// ---------- Onglet « Mes publications » (manager et admin) ----------
const FILTRES: [string, string][] = [
  ["tous", "TOUS"],
  ["brouillon", "BROUILLON"],
  ["en attente", "EN ATTENTE D'ACCORD"],
  ["autorisée", "AUTORISÉE"],
  ["publiée", "PUBLIÉE"],
  ["refusée", "REFUSÉE"],
];
type Tri = "recentes" | "anciennes" | "titre";

function info(a: News) {
  switch (a.status) {
    case "en attente": return `En attente d'accord depuis ${joursDepuis(a.requested_at ?? a.created_at)} j`;
    case "autorisée": return `Autorisée par ${prenom(a.authorized_by)} le ${dateCourte(a.authorized_at)}`;
    case "publiée": return "Publiée";
    case "refusée": return a.refusal_note ? `Motif : « ${a.refusal_note} »` : "Refusée par un admin";
    default: return "En cours de rédaction";
  }
}

export function PublicationsTab({ miennes, admin, actions, statutInitial }: { miennes: News[]; admin: boolean; actions: ReturnType<typeof useActionsActus>; statutInitial?: string }) {
  const [filtre, setFiltre] = useState(statutInitial ?? "tous");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("recentes");
  const [rappel, setRappel] = useState(true);
  const brouillons = miennes.filter((a) => a.status === "brouillon").sort((x, y) => y.created_at.localeCompare(x.created_at));
  const compte = (f: string) => (f === "tous" ? miennes.length : miennes.filter((a) => a.status === f).length);
  const q = recherche.trim().toLowerCase();
  const liste = miennes
    .filter((a) => (filtre === "tous" || a.status === filtre) && (!q || a.title.toLowerCase().includes(q)))
    .sort((x, y) => (tri === "titre" ? x.title.localeCompare(y.title) : tri === "anciennes" ? x.created_at.localeCompare(y.created_at) : y.created_at.localeCompare(x.created_at)));

  const action = (a: News) => {
    const besoinAutorisation = (a.scope ?? "entreprise") === "entreprise" && !admin;
    switch (a.status) {
      case "brouillon":
        return (
          <span className="inline-flex items-center gap-3">
            <Link to="/rediger" search={{ id: a.id }} className={TEXT_LINK}>Reprendre</Link>
            {besoinAutorisation ? (
              <HpButton role="principal" icon={Send} disabled={actions.demander.isPending} onClick={() => actions.demander.mutate(a.id)}>DEMANDER L'ACCORD</HpButton>
            ) : (
              <HpButton role="principal" icon={Send} disabled={actions.publier.isPending} onClick={() => actions.publier.mutate(a.id)}>PUBLIER</HpButton>
            )}
          </span>
        );
      case "en attente":
        return <Link to="/actualites/$id" params={{ id: a.id }} className={TEXT_LINK}>Voir la demande</Link>;
      case "autorisée":
        return <HpButton role="publie" icon={Send} disabled={actions.publier.isPending} onClick={() => actions.publier.mutate(a.id)}>PUBLIER</HpButton>;
      case "refusée":
        return (
          <span className="inline-flex items-center gap-3">
            <Link to="/rediger" search={{ id: a.id }} className={TEXT_LINK}>Corriger</Link>
            <HpButton role="principal" icon={Send} disabled={actions.demander.isPending} onClick={() => actions.demander.mutate(a.id)}>REDEMANDER</HpButton>
          </span>
        );
      default:
        return <Link to="/actualites/$id" params={{ id: a.id }} className={TEXT_LINK}>Consulter</Link>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {rappel && brouillons.length > 0 && (
        <section aria-labelledby="rappel-titre" className="flex items-center gap-3 border border-line border-l-4 border-l-anthracite bg-neutral-1 px-6 py-4">
          <p className="flex-1 text-[14px] leading-5">
            <span id="rappel-titre" className="font-semibold">
              {brouillons.length} brouillon{brouillons.length > 1 ? "s" : ""} non publié{brouillons.length > 1 ? "s" : ""}.
            </span>{" "}
            Publie-les ou corrige ceux qui ne sont pas prêts.
          </p>
          <Link to="/rediger" search={{ id: brouillons[0].id }} className={TEXT_LINK}>Reprendre le dernier brouillon</Link>
          <HpIconButton icon={X} label="Masquer le rappel" className="border-0" onClick={() => setRappel(false)} />
        </section>
      )}
      <Encadre title="Mes publications" compteur={`${miennes.length} au total`}>
        <div className="flex flex-col gap-4 px-6 py-4">
          <TabList label="Statut">
            {FILTRES.map(([v, l]) => (
              <TabButton key={v} active={filtre === v} onClick={() => setFiltre(v)}>{`${l} (${compte(v)})`}</TabButton>
            ))}
          </TabList>
          <div className="flex items-center gap-4">
            <label className="relative flex items-center">
              <span className="sr-only">Filtrer par titre</span>
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-ink-2" />
              <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Filtrer par titre" className="h-11 w-72 border border-field bg-white pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-2" />
            </label>
            <label className="flex items-center gap-2">
              <span className="label text-ink-2">Trier</span>
              <select value={tri} onChange={(e) => setTri(e.target.value as Tri)} className="h-11 border border-field bg-white px-3 text-[14px] text-ink">
                <option value="recentes">Plus récentes</option>
                <option value="anciennes">Plus anciennes</option>
                <option value="titre">Titre (A à Z)</option>
              </select>
            </label>
          </div>
        </div>
        {liste.length === 0 ? (
          <p className="border-t border-line px-6 py-5 text-[14px] text-ink-2">Aucune publication ne correspond.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-neutral-1">
                {["Titre", "Destinataires", "Statut", "Dernière modification", "Info", "Action"].map((h) => (
                  <th key={h} scope="col" className="label h-11 px-3 text-ink-2 first:pl-6 last:pr-6 last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liste.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-b-0">
                  <td className="relative max-w-[240px] py-3 pr-3 pl-6 text-[14px] leading-5 font-semibold">
                    <TraitStatut ton={tonNews(a.status)} />
                    {a.title}
                  </td>
                  <td className="px-3 text-[12px] leading-4 text-ink-2">{libellePerimetre(a)}</td>
                  <td className="px-3"><StatutPublication statut={a.status} /></td>
                  <td className="px-3 text-[12px] leading-4 whitespace-nowrap text-ink-2">{dateCourte(a.created_at)}</td>
                  <td className="max-w-[200px] px-3 text-[12px] leading-4 text-ink-2">{info(a)}</td>
                  <td className="pr-6 text-right">{action(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Encadre>
    </div>
  );
}
