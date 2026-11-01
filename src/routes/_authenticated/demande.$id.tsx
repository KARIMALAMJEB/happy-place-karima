import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, MessageSquareMore, Plus, Send, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HpButton } from "@/components/hp/button";
import { Encadre } from "@/components/hp/encadre";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { BloquanteMot, StatutBadge } from "@/components/hp/statut";
import {
  REJECTION_CATEGORIES,
  VISIBILITY_LABEL,
  attachmentUrl,
  MAX_JUSTIFICATIFS,
  MAX_PDF_BYTES,
  completeRequest,
  type Complement,
  markSeen,
  nonLue,
  questionsOf,
  decideRequest,
  fetchRequest,
  refOf,
  stateOf,
  titleOf,
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

const SUIVI_LABEL: Record<FollowUp, string> = { ouvert: "Ouvert", en_cours: "En cours", resolu: "Résolu" };

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

  const [note, setNote] = useState("");
  const [categorie, setCategorie] = useState<(typeof REJECTION_CATEGORIES)[number]>("autre");
  const [mode, setMode] = useState<"refuser" | "preciser" | null>(null);
  const [erreur, setErreur] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [reponses, setReponses] = useState<string[]>([]);
  const [infos, setInfos] = useState("");
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
      toast.success(d.kind === "valider" ? "Demande validée" : d.kind === "preciser" ? "Précisions demandées" : "Demande refusée");
      setMode(null);
      setNote("");
      setQuestions([""]);
      refresh();
    },
    onError,
  });
  const suivre = useMutation({
    mutationFn: () => updateFollowUp(id, { follow_up: suivi || null, responsible: resp.trim() || null, target_date: cible || null, done: terminee }),
    onSuccess: () => { toast.success("Suivi enregistré"); refresh(); },
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
  const auteur = r.confidential_identity && !estAuteur && role === "collaborateur" ? "Auteur confidentiel" : r.author_name;

  function envoyerDecision() {
    if (!mode) return;
    if (mode === "preciser") {
      const qs = questions.map((q) => q.trim()).filter(Boolean);
      if (!qs.length) return setErreur("Ajoute au moins une question.");
      if (qs.some((q) => q.length < 3)) return setErreur("Chaque question fait au moins 3 caractères.");
      if (qs.map((q, i) => `${i + 1}. ${q}`).join("\n").length > 500) return setErreur("Les questions dépassent 500 caractères au total.");
      setErreur("");
      return decider.mutate({ kind: "preciser", questions: qs });
    }
    if (note.trim().length < 5) return setErreur("Écris un message d'au moins 5 caractères.");
    setErreur("");
    decider.mutate({ kind: "refuser", category: categorie, note });
  }

  return (
    <HpPage>
      <section className="flex flex-col gap-3 border border-line bg-white px-6 py-6 lg:px-8">
        <p className="text-[14px] leading-5 text-ink-2">
          <Link to="/demandes" className="underline underline-offset-4 hover:text-ink">Demandes</Link> · {refOf(r)}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">{titleOf(r)}</h1>
          <StatutBadge state={etat} />
        </div>
      </section>

      <Encadre title="Détail de la demande">
        <div className="flex flex-col gap-6 p-6">
          <p className="text-[16px] leading-6 whitespace-pre-wrap text-ink">{r.content}</p>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Auteur">{auteur}</Info>
            <Info label="Équipe">{r.team}</Info>
            <Info label="Déposée le">{fmt(r.created_at)}</Info>
            <Info label="Nature"><BloquanteMot bloquante={r.blocking} /></Info>
            <Info label="Visibilité">{VISIBILITY_LABEL[r.visibility]}</Info>
            <Info label="Thème">{r.theme ?? "Aucun"}</Info>
            <Info label="Destinataire">{r.validator_type === "admin" ? "Administration" : "Manager"}</Info>
            {r.decided_at && <Info label="Décision">{fmt(r.decided_at)}{r.decided_by_name ? ` · ${r.decided_by_name}` : ""}</Info>}
          </dl>
          {r.attachment_path && (
            <div>
              <HpButton type="button" role="consulte" icon={FileText} disabled={pj.isPending} onClick={() => pj.mutate(r.attachment_path!)}>
                {r.attachment_name ?? "OUVRIR LE PDF"}
              </HpButton>
            </div>
          )}
          {etat === "a_completer" && questionsOf(r).length > 0 && (
            <div className="border-l-4 border-line bg-neutral-1 px-4 py-3 text-[14px] leading-5">
              <p className="font-semibold">Précisions demandées</p>
              <ol className="mt-1 list-decimal pl-5">
                {questionsOf(r).map((q, i) => <li key={i} className="whitespace-pre-wrap">{q.replace(/^\d+\.\s/, "")}</li>)}
              </ol>
            </div>
          )}
          {etat === "refusee" && r.rejection_note && (
            <p className="border-l-4 border-line bg-neutral-1 px-4 py-3 text-[14px] leading-5">
              <span className="font-semibold">Motif : {r.rejection_category}</span>
              <br />
              {r.rejection_note}
            </p>
          )}
        </div>
      </Encadre>

      {complement && (complement.infos || complement.reponses?.length || complement.fichiers?.length) && (
        <Encadre title="Réponse de l'auteur">
          <div className="flex flex-col gap-4 p-6">
            {complement.date && <p className="text-[12px] leading-4 text-ink-2">Renvoyée le {fmt(complement.date)}</p>}
            {(complement.reponses ?? []).filter((x) => x.question).map((x, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="text-[12px] leading-4 text-ink-2">{i + 1}. {x.question.replace(/^\d+\.\s/, "")}</p>
                <p className="text-[16px] leading-6 whitespace-pre-wrap text-ink">{x.reponse}</p>
              </div>
            ))}
            {complement.infos && (
              <div className="flex flex-col gap-1">
                <p className="label text-ink-2">Informations complémentaires</p>
                <p className="text-[16px] leading-6 whitespace-pre-wrap text-ink">{complement.infos}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {[...(complement.fichiers ?? []), ...(complement.reponses ?? []).filter((x) => x.path).map((x) => ({ path: x.path!, name: x.name ?? "Document" }))].map((j) => (
                <HpButton key={j.path} type="button" role="consulte" icon={FileText} disabled={pj.isPending} onClick={() => pj.mutate(j.path)}>
                  {j.name}
                </HpButton>
              ))}
            </div>
          </div>
        </Encadre>
      )}

      {etat === "a_completer" && estAuteur && (
        <Encadre title="Compléter ma demande">
          <div className="flex flex-col gap-3 p-6">
            {questionsOf(r).map((q, i) => (
              <div key={i} className="flex flex-col gap-2">
                <label htmlFor={`reponse-${i}`} className="text-[14px] leading-5 font-semibold text-ink">{i + 1}. {q.replace(/^\d+\.\s/, "")}</label>
                <textarea
                  id={`reponse-${i}`}
                  className={`${champ} min-h-24 py-2`}
                  value={reponses[i] ?? ""}
                  maxLength={1000}
                  onChange={(e) => setReponses(questionsOf(r).map((_, j) => (j === i ? e.target.value : (reponses[j] ?? ""))))}
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
                <button type="button" onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))} className="underline underline-offset-4 hover:text-ink">Retirer</button>
              </p>
            ))}
            <div>
              <HpButton type="button" role="publie" icon={Send} disabled={completer.isPending || !questionsOf(r).every((_, i) => (reponses[i] ?? "").trim().length >= 2)} onClick={() => completer.mutate()}>
                RENVOYER LA DEMANDE
              </HpButton>
            </div>
          </div>
        </Encadre>
      )}

      {peutDecider && etat === "en_attente" && (
        <Encadre title="Décision">
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap gap-3">
              <HpButton type="button" role="valide" icon={Check} disabled={decider.isPending} onClick={() => decider.mutate({ kind: "valider" })}>VALIDER</HpButton>
              <HpButton type="button" role="modifie" icon={MessageSquareMore} onClick={() => { setMode("preciser"); setErreur(""); }}>DEMANDER DES PRÉCISIONS</HpButton>
              <HpButton type="button" role="refuse" icon={X} onClick={() => { setMode("refuser"); setErreur(""); }}>REFUSER</HpButton>
            </div>
            {mode && (
              <div className="flex flex-col gap-3 border border-line p-4">
                {mode === "refuser" && (
                  <>
                    <label htmlFor="cat" className="label text-ink">Motif du refus</label>
                    <select id="cat" className={champ} value={categorie} onChange={(e) => setCategorie(e.target.value as typeof categorie)}>
                      {REJECTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </>
                )}
                {mode === "preciser" ? (
                  <>
                    <span className="label text-ink">Tes questions à l'auteur</span>
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 text-[14px] leading-5 text-ink-2">{i + 1}.</span>
                        <input
                          aria-label={`Question ${i + 1}`}
                          className={champ}
                          value={q}
                          maxLength={200}
                          onChange={(e) => setQuestions(questions.map((x, j) => (j === i ? e.target.value : x)))}
                        />
                        {questions.length > 1 && (
                          <button type="button" aria-label={`Retirer la question ${i + 1}`} onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="flex size-11 shrink-0 items-center justify-center border border-line hover:bg-neutral-1">
                            <X size={16} aria-hidden />
                          </button>
                        )}
                      </div>
                    ))}
                    {questions.length < 5 && (
                      <div>
                        <HpButton type="button" role="consulte" icon={Plus} onClick={() => setQuestions([...questions, ""])}>AJOUTER UNE QUESTION</HpButton>
                      </div>
                    )}
                    <span className="text-[12px] leading-4 text-ink-2">5 questions au maximum. L'auteur est prévenu par e-mail.</span>
                  </>
                ) : (
                  <>
                    <label htmlFor="note" className="label text-ink">Explication pour l'auteur</label>
                    <textarea id="note" className={`${champ} min-h-28 py-2`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
                    <span className="text-[12px] leading-4 text-ink-2">{note.length} / 500 caractères. L'auteur est prévenu par e-mail.</span>
                  </>
                )}
                {erreur && <p role="alert" className="text-[12px] font-semibold text-[#8E1A1F]">{erreur}</p>}
                <div className="flex gap-3">
                  <HpButton type="button" role="principal" icon={Send} disabled={decider.isPending} onClick={envoyerDecision}>ENVOYER</HpButton>
                  <HpButton type="button" role="consulte" onClick={() => setMode(null)}>ANNULER</HpButton>
                </div>
              </div>
            )}
          </div>
        </Encadre>
      )}

      {etat === "validee" && (r.blocking || peutSuivre || r.follow_up) && (
        <Encadre title="Suivi">
          {peutSuivre ? (
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="suivi" className="label text-ink">État</label>
                <select id="suivi" className={champ} value={suivi} onChange={(e) => setSuivi(e.target.value as FollowUp | "")}>
                  <option value="">Non défini</option>
                  {(Object.keys(SUIVI_LABEL) as FollowUp[]).map((k) => <option key={k} value={k}>{SUIVI_LABEL[k]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="resp" className="label text-ink">Responsable</label>
                <input id="resp" className={champ} value={resp} maxLength={120} onChange={(e) => setResp(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="cible" className="label text-ink">Date cible</label>
                <input id="cible" type="date" className={champ} value={cible} onChange={(e) => setCible(e.target.value)} />
              </div>
              <label className="flex min-h-11 items-center gap-3 self-end">
                <input type="checkbox" className="size-5 accent-anthracite" checked={terminee} onChange={(e) => setTerminee(e.target.checked)} />
                <span className="text-[14px] leading-5">Demande terminée</span>
              </label>
              <div className="sm:col-span-2">
                <HpButton type="button" role="principal" disabled={suivre.isPending} onClick={() => suivre.mutate()}>ENREGISTRER LE SUIVI</HpButton>
              </div>
            </div>
          ) : (
            <dl className="grid gap-5 p-6 sm:grid-cols-2">
              <Info label="État">{r.follow_up ? SUIVI_LABEL[r.follow_up] : "Non défini"}</Info>
              <Info label="Responsable">{r.responsible ?? "Non défini"}</Info>
              <Info label="Date cible">{r.target_date ? fmt(r.target_date) : "Non définie"}</Info>
              <Info label="Terminée">{r.done ? "Oui" : "Non"}</Info>
            </dl>
          )}
        </Encadre>
      )}
    </HpPage>
  );
}
