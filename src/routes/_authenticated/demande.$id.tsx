import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bell, Building2, Check, Lock, Paperclip, Send, Upload, Users, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HpButton, hpButtonVariants } from "@/components/hp/button";
import { DELAI_RELANCE, date, jo, joursOuvres } from "@/components/hp/demandes-ui";
import { RichText } from "@/components/hp/rich-text";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { RefusDialog } from "@/components/hp/refus-dialog";
import { BloquanteMot, StatutBadge } from "@/components/hp/statut";
import {
  VISIBILITY_LABEL,
  attachmentUrl,
  MAX_JUSTIFICATIFS,
  MAX_PDF_BYTES,
  completeRequest,
  type Complement,
  markSeen,
  motifLabel,
  nonLue,
  questionsOf,
  decideRequest,
  fetchRequest,
  refOf,
  stateOf,
  titleOf,
  remindRequest,
  updateFollowUp,
  type Decision,
  type FollowUp,
} from "@/lib/requests";

export const Route = createFileRoute("/_authenticated/demande/$id")({
  head: () => ({ meta: [{ title: "Demande — Happy Place" }] }),
  component: DemandeDetail,
});

const champ = "min-h-11 w-full border border-field bg-white px-3 text-[14px] leading-5 text-ink";
const fmt = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

const ETAPES: { id: FollowUp; label: string }[] = [
  { id: "ouvert", label: "OUVERT" },
  { id: "en_cours", label: "EN COURS" },
  { id: "resolu", label: "RÉSOLU" },
];
const DIFFUSION: Record<string, LucideIcon> = { tous: Building2, equipe: Users, manager: Lock };
const LIEN_FIL = "inline-flex min-h-6 items-center text-ink-2 underline underline-offset-2 hover:text-ink";
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dateLongue = (iso: string) =>
  majuscule(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso)));
const dateHeure = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month} à ${Number(p.hour)} h`;
};

function Bloc({ titre, children, className = "bg-white" }: { titre: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 border border-line p-6 ${className}`}>
      <h2 className="label-13 font-label text-ink">{titre}</h2>
      {children}
    </section>
  );
}

const Citation = ({ children, pied }: { children: React.ReactNode; pied?: string }) => (
  <blockquote className="border-l-[3px] border-anthracite bg-neutral-1 px-5 py-4 text-[14px] leading-6">
    « {children} »
    {pied && <span className="mt-2 block text-[12px] leading-4 text-ink-2">{pied}</span>}
  </blockquote>
);

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="label text-ink-2">{label}</dt>
      <dd className="text-[14px] leading-5 text-ink">{children}</dd>
    </div>
  );
}

function DemandeDetail() {
  const { id } = Route.useParams();
  const { role } = Route.useRouteContext();
  const { email } = useOwnProfile();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["requests", "one", id], queryFn: () => fetchRequest(id) });
  const r = q.data;

  const [refusOuvert, setRefusOuvert] = useState(false);
  const [reponses, setReponses] = useState<string[]>([]);
  const [infos, setInfos] = useState("");
  const router = useRouter();
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [erreurFichier, setErreurFichier] = useState("");
  const [suivi, setSuivi] = useState<FollowUp | "">("");
  const [resp, setResp] = useState("");
  const [cible, setCible] = useState("");
  const [terminee, setTerminee] = useState(false);

  useEffect(() => {
    if (!r) return;
    setSuivi(r.follow_up ?? "");
    setResp(r.responsible ?? "");
    setCible(r.target_date ?? "");
    setTerminee(r.done);
  }, [r]);

  // L'auteur ouvre sa demande : la décision est marquée comme lue
  useEffect(() => {
    if (r && (r.submitted_by_email ?? "").toLowerCase() === email && nonLue(r)) {
      markSeen(r.id).then(() => qc.invalidateQueries({ queryKey: ["requests"] }));
    }
  }, [r, email, qc]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["requests"] });
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "L'action a échoué");

  const decider = useMutation({
    mutationFn: (d: Decision) => decideRequest(id, d),
    onSuccess: (_v, d) => {
      toast.success(d.kind === "valider" ? "Demande validée" : d.motif === "à clarifier" ? "Précisions demandées" : "Demande refusée");
      setRefusOuvert(false);
      refresh();
    },
    onError,
  });
  const suivre = useMutation({
    mutationFn: (prochain?: FollowUp) => {
      const s = prochain ?? (suivi || null);
      return updateFollowUp(id, { follow_up: s, responsible: resp.trim() || null, target_date: cible || null, done: s === "resolu" ? true : terminee });
    },
    onSuccess: () => { toast.success("Suivi enregistré"); refresh(); },
    onError,
  });
  const relancer = useMutation({
    mutationFn: () => remindRequest(id),
    onSuccess: () => { toast.success("Relance envoyée"); refresh(); },
    onError,
  });
  const completer = useMutation({
    mutationFn: () => completeRequest(id, questionsOf(r!).map((q, i) => ({ question: q, reponse: (reponses[i] ?? "").trim() })), infos, fichiers),
    onSuccess: () => { toast.success("Réponse envoyée"); setReponses([]); setInfos(""); setFichiers([]); refresh(); },
    onError,
  });
  const pj = useMutation({
    mutationFn: (path: string) => attachmentUrl(path),
    onSuccess: (url) => window.open(url, "_blank", "noopener"),
    onError,
  });

  if (q.isLoading) return <HpPage><p className="text-ink-2">Chargement…</p></HpPage>;
  if (!r)
    return (
      <HpPage>
        <p role="alert">Cette demande n'existe pas ou tu n'as pas le droit de la lire.</p>
        <Link to="/demandes" className="underline underline-offset-4">Retour aux demandes</Link>
      </HpPage>
    );

  const etat = stateOf(r);
  const complement = (r.complement ?? null) as Complement | null;
  const estAuteur = (r.submitted_by_email ?? "").toLowerCase() === email;
  // Démo : un même compte change de rôle, il peut donc décider sa propre demande. À réactiver avec la vraie connexion (lot sécurité).
  const peutDecider = role !== "collaborateur";
  const peutSuivre = role !== "collaborateur" && etat === "validee";
  const mode: "decide" | "auteur" | "lecture" = peutDecider ? "decide" : estAuteur ? "auteur" : "lecture";
  const perspective = mode === "decide" ? "valideur" : mode === "auteur" ? "auteur" : "neutre";
  const auteur = r.confidential_identity && !estAuteur && role === "collaborateur" ? "Auteur confidentiel" : r.author_name;
  const IconeDiffusion = DIFFUSION[r.visibility] ?? Users;
  const questions = questionsOf(r).map((x) => x.replace(/^\d+\.\s/, ""));
  const decideur = r.decided_by_name ?? (r.validator_type === "admin" ? "Administration" : "Manager de l'équipe");
  const filNom = mode === "auteur" ? "Mes demandes" : role === "manager" ? "Demandes de mon équipe" : "Demandes";

  // Relance : 5 jours ouvrés après le dépôt ou la dernière relance (la base revérifie)
  const dernierContact = r.reminded_at && r.reminded_at > r.created_at ? r.reminded_at : r.created_at;
  const ecoules = joursOuvres(dernierContact);
  const reste = Math.max(0, DELAI_RELANCE - ecoules);
  const relancePossible = reste === 0;
  const suiviActuel = r.follow_up ?? "ouvert";
  const idx = ETAPES.findIndex((e) => e.id === suiviActuel);
  const suivante = ETAPES[idx + 1];
  const decisionTexte = etat === "validee" ? "Demande validée" : etat === "a_completer" ? "Précisions demandées à l'auteur" : "Demande refusée";

  return (
    <HpPage>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <Link
            to="/demandes"
            onClick={(e) => {
              if (router.history.canGoBack()) {
                e.preventDefault();
                router.history.back();
              }
            }}
            className={hpButtonVariants({ role: "consulte" })}
          >
            <ArrowLeft size={16} aria-hidden />
            <span>RETOUR</span>
          </Link>
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[14px] leading-5">
            <Link to="/demandes" className={LIEN_FIL}>{filNom}</Link>
            <span aria-hidden className="text-ink-2">/</span>
            <span aria-current="page" className="font-semibold">{titleOf(r)}</span>
          </nav>
        </div>

        <header className="flex flex-col gap-5 border border-line bg-white p-6">
          <h1 className="text-[32px] leading-10">{titleOf(r)}</h1>
          <div className="flex flex-wrap items-center gap-6">
            <StatutBadge state={etat} perspective={perspective} terminee={r.done} />
            <BloquanteMot bloquante={r.blocking} />
            <span className="text-[12px] leading-4 text-ink-2">{refOf(r)}</span>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-line pt-5">
            <Info label="Auteur">
              <span className="font-semibold">{auteur}</span>
              {auteur === r.author_name && r.team && <span className="block text-[12px] leading-4 text-ink-2">{r.team}</span>}
            </Info>
            <Info label="Date de dépôt">{dateLongue(r.created_at)}</Info>
            <Info label="Décide"><span className="font-semibold">{decideur}</span></Info>
          </dl>
        </header>

        <Bloc titre="CONTENU DE LA DEMANDE">
          <div className="flex max-w-[72ch] flex-col gap-2 text-[14px] leading-6">
            <RichText texte={r.content} />
          </div>
          {(r.theme || r.attachment_path) && (
            <dl className="flex flex-col gap-3 pt-2">
              {r.theme && (
                <div className="flex gap-2 text-[14px] leading-5">
                  <dt className="label text-ink-2">Thème</dt>
                  <dd>{r.theme}</dd>
                </div>
              )}
              {r.attachment_path && (
                <div className="flex flex-col gap-2">
                  <dt className="label text-ink-2">Pièces jointes</dt>
                  <dd>
                    <button type="button" disabled={pj.isPending} onClick={() => pj.mutate(r.attachment_path!)} className="flex cursor-pointer items-center gap-2 text-[14px] leading-5 underline underline-offset-4 hover:text-anthracite">
                      <Paperclip size={16} aria-hidden className="text-ink-2" />
                      {r.attachment_name ?? "Ouvrir le PDF"}
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </Bloc>

        <Bloc titre="DIFFUSION" className="bg-neutral-1">
          <div className="flex items-start gap-3">
            <IconeDiffusion size={20} aria-hidden className="mt-0.5 shrink-0 text-ink" />
            <div className="flex flex-col gap-1 text-[14px] leading-5">
              <p>Visible par : <span className="font-semibold">{VISIBILITY_LABEL[r.visibility].replace("Visible par ", "").replace(/^./, (c) => c.toUpperCase())}</span></p>
              <p className="text-ink-2">{r.decided_at ? `Communiquée le ${dateHeure(r.decided_at)}` : "Pas encore communiquée"}</p>
            </div>
          </div>
        </Bloc>

        {etat === "a_completer" && (
          <Bloc titre={mode === "auteur" || estAuteur ? `CE QUE ${(r.decided_by_name ?? "LA PERSONNE QUI DÉCIDE").toUpperCase()} TE DEMANDE DE PRÉCISER` : "PRÉCISIONS DEMANDÉES À L'AUTEUR"}>
            <p className="text-[14px] leading-5 font-semibold">Motif : « À clarifier »</p>
            <ol className="flex list-decimal flex-col gap-1 pl-6 text-[14px] leading-5">
              {questions.map((x, i) => <li key={i} className="whitespace-pre-wrap">{x}</li>)}
            </ol>
            {r.rejection_note && Array.isArray(r.clarifications) && r.clarifications.length > 0 && (
              <Citation pied={r.decided_at ? `Émis le ${date(r.decided_at)}` : undefined}>{r.rejection_note}</Citation>
            )}
            {estAuteur && (
              <div className="flex flex-col gap-3 border-t border-line pt-4">
                {questions.map((x, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <label htmlFor={`reponse-${i}`} className="text-[14px] leading-5 font-semibold text-ink">{i + 1}. {x}</label>
                    <textarea
                      id={`reponse-${i}`}
                      className={`${champ} min-h-24 py-2`}
                      value={reponses[i] ?? ""}
                      maxLength={1000}
                      onChange={(e) => setReponses(questions.map((_, j) => (j === i ? e.target.value : (reponses[j] ?? ""))))}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-2">
                  <label htmlFor="infos" className="label text-ink">Informations complémentaires (facultatif)</label>
                  <textarea id="infos" className={`${champ} min-h-20 py-2`} value={infos} maxLength={1000} onChange={(e) => setInfos(e.target.value)} />
                </div>
                <span className="label text-ink">Documents justificatifs (facultatif)</span>
                <label className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-field bg-neutral-1 px-6 py-6 text-center hover:bg-neutral-2">
                  <Upload size={20} aria-hidden />
                  <span className="text-[14px] leading-5"><span className="font-semibold underline underline-offset-4">Parcourir tes dossiers</span> pour joindre des PDF</span>
                  <span className="text-[12px] leading-4 text-ink-2">PDF uniquement · 20 Mo maximum par fichier · {MAX_JUSTIFICATIFS} fichiers maximum</span>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const choisis = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      const valides = choisis.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
                      if (valides.length < choisis.length) setErreurFichier("Seuls les fichiers PDF sont acceptés.");
                      else if (valides.some((f) => f.size > MAX_PDF_BYTES)) setErreurFichier("Un fichier dépasse 20 Mo.");
                      else if (fichiers.length + valides.length > MAX_JUSTIFICATIFS) setErreurFichier(`${MAX_JUSTIFICATIFS} documents au maximum.`);
                      else { setErreurFichier(""); setFichiers([...fichiers, ...valides]); }
                    }}
                  />
                </label>
                {erreurFichier && <p role="alert" className="text-[12px] font-semibold text-[#8E1A1F]">{erreurFichier}</p>}
                {fichiers.map((f, i) => (
                  <p key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 border border-line px-4 py-2 text-[14px] leading-5">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))} className="cursor-pointer underline underline-offset-4 hover:text-ink">Retirer</button>
                  </p>
                ))}
                <div>
                  <HpButton type="button" role="modifie" icon={Send} disabled={completer.isPending || !questions.every((_, i) => (reponses[i] ?? "").trim().length >= 2)} onClick={() => completer.mutate()}>
                    RENVOYER MA DEMANDE
                  </HpButton>
                </div>
              </div>
            )}
          </Bloc>
        )}

        {complement && (complement.infos || complement.reponses?.length || complement.fichiers?.length) && (
          <Bloc titre="PRÉCISIONS APPORTÉES PAR L'AUTEUR">
            {(complement.reponses ?? []).filter((x) => x.question).length > 0 && (
              <ol className="flex list-decimal flex-col gap-3 pl-6 text-[14px] leading-5">
                {(complement.reponses ?? []).filter((x) => x.question).map((x, i) => (
                  <li key={i}>
                    <span className="font-semibold">{x.question.replace(/^\d+\.\s/, "")}</span>
                    <span className="block whitespace-pre-wrap">{x.reponse || "Pas de réponse"}</span>
                  </li>
                ))}
              </ol>
            )}
            {complement.infos && <p className="text-[14px] leading-5 whitespace-pre-wrap text-ink-2">{complement.infos}</p>}
            {[...(complement.fichiers ?? []), ...(complement.reponses ?? []).filter((x) => x.path).map((x) => ({ path: x.path!, name: x.name ?? "Document" }))].length > 0 && (
              <ul className="flex flex-col gap-1">
                {[...(complement.fichiers ?? []), ...(complement.reponses ?? []).filter((x) => x.path).map((x) => ({ path: x.path!, name: x.name ?? "Document" }))].map((j) => (
                  <li key={j.path}>
                    <button type="button" disabled={pj.isPending} onClick={() => pj.mutate(j.path)} className="flex cursor-pointer items-center gap-2 text-[14px] leading-5 underline underline-offset-4 hover:text-anthracite">
                      <Paperclip size={16} aria-hidden className="text-ink-2" />
                      {j.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {complement.date && <p className="text-[12px] leading-4 text-ink-2">Renvoyée le {date(complement.date)}</p>}
          </Bloc>
        )}

        {etat === "refusee" && r.rejection_note && (
          <Bloc titre="MOTIF DU REFUS">
            <p className="text-[14px] leading-5 font-semibold">Motif : « {motifLabel(r.rejection_category)} »</p>
            <Citation pied={[r.decided_by_name, r.decided_at && date(r.decided_at)].filter(Boolean).join(" · ") || undefined}>{r.rejection_note}</Citation>
          </Bloc>
        )}

        {/* Le suivi du blocage n'existe qu'une fois la demande validée */}
        {r.blocking && etat === "validee" && (
          <section className="flex flex-col gap-5 border border-line bg-white p-6" aria-labelledby="suivi-titre">
            <div className="flex items-center justify-between gap-4">
              <h2 id="suivi-titre" className="label-13 font-label text-ink">SUIVI DU BLOCAGE</h2>
              {peutSuivre && (
                <div className="flex items-center gap-3">
                  {!suivante && <span className="text-[12px] leading-4 text-ink-2">Blocage résolu, plus de statut suivant</span>}
                  <HpButton role="modifie" icon={ArrowRight} disabled={!suivante || suivre.isPending} onClick={() => suivante && suivre.mutate(suivante.id)}>
                    CHANGER LE STATUT
                  </HpButton>
                </div>
              )}
            </div>
            <ol className="grid grid-cols-3 border border-line">
              {ETAPES.map((e, i) => {
                const st = i < idx ? "franchi" : i === idx ? "actuel" : "avenir";
                return (
                  <li
                    key={e.id}
                    aria-current={st === "actuel" ? "step" : undefined}
                    className={cn(
                      "label flex h-14 items-center gap-2 border-b-2 px-4 not-last:border-r not-last:border-r-line",
                      st === "franchi" && "border-b-transparent bg-neutral-1 text-anthracite",
                      st === "actuel" && "border-b-anthracite bg-neutral-2 text-anthracite",
                      st === "avenir" && "border-b-transparent bg-white text-ink-2",
                    )}
                  >
                    {st === "franchi" && <Check size={16} aria-hidden />}
                    <span>{`${i + 1}. ${e.label}`}</span>
                    {st === "franchi" && <span className="sr-only">(franchi)</span>}
                    {st === "actuel" && <span className="sr-only">(statut actuel)</span>}
                  </li>
                );
              })}
            </ol>
            <dl className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <dt className="label text-ink-2">Prend en charge</dt>
                <dd className="text-[14px] leading-5 font-semibold">
                  {peutSuivre ? (
                    <input aria-label="Prend en charge" className={champ} value={resp} maxLength={120} onChange={(e) => setResp(e.target.value)} onBlur={() => (resp.trim() || null) !== r.responsible && suivre.mutate(undefined)} />
                  ) : (r.responsible ?? "Non désigné")}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="label text-ink-2">Date cible</dt>
                <dd className="text-[14px] leading-5 font-semibold">
                  {peutSuivre ? (
                    <input aria-label="Date cible" type="date" className={champ} value={cible} onChange={(e) => setCible(e.target.value)} onBlur={() => (cible || null) !== r.target_date && suivre.mutate(undefined)} />
                  ) : (r.target_date ? fmt(r.target_date) : "Non fixée")}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {mode === "decide" && (
          <footer className="flex flex-col gap-4 border border-line bg-white p-6">
            {etat === "en_attente" ? (
              <div className="flex justify-end gap-3">
                <HpButton type="button" role="refuse" icon={X} disabled={decider.isPending} onClick={() => setRefusOuvert(true)}>REFUSER AVEC MOTIF</HpButton>
                <HpButton type="button" role="valide" icon={Check} disabled={decider.isPending} onClick={() => decider.mutate({ kind: "valider" })}>VALIDER LA DEMANDE</HpButton>
              </div>
            ) : (
              <p role="status" className="text-[14px] leading-5">{decisionTexte}{r.decided_at && ` le ${date(r.decided_at)}`}.</p>
            )}
            <RefusDialog
              demande={r}
              ouvert={refusOuvert}
              envoi={decider.isPending}
              onFermer={() => setRefusOuvert(false)}
              onConfirmer={(x) => decider.mutate({ kind: "refuser", motif: x.motif, explication: x.explication, precisions: x.precisions })}
            />
          </footer>
        )}

        {mode === "auteur" && etat === "en_attente" && (
          <footer className="flex items-center justify-between gap-6 border border-line bg-white p-6">
            <p className="text-[14px] leading-5" aria-live="polite">
              {relancePossible ? `Aucune réponse depuis ${jo(ecoules)} · dernier contact : ${date(dernierContact)}` : `${r.reminded_at ? "Relance envoyée. " : ""}Relance possible dans ${jo(reste)}`}
            </p>
            <HpButton type="button" role="consulte" icon={Bell} disabled={!relancePossible || relancer.isPending} onClick={() => relancer.mutate()}>
              RELANCER LA PERSONNE QUI DÉCIDE
            </HpButton>
          </footer>
        )}
      </div>
    </HpPage>
  );
}
