import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, FileText, Lock, Send, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { HpButton, HpIconButton, hpButtonVariants } from "@/components/hp/button";
import { date } from "@/components/hp/demandes-ui";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { RichText } from "@/components/hp/rich-text";
import { MAX_JUSTIFICATIFS, MAX_PDF_BYTES, completeRequest, fetchRequest, questionsOf, refOf, stateOf, titleOf, type Complement } from "@/lib/requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/completer/$id")({
  head: () => ({ meta: [{ title: "Compléter ma demande — Happy Place" }] }),
  component: Completer,
});

const MAX_REPONSE = 500;
const MAX_INFOS = 2000;
const champ = "w-full border border-field bg-white px-3 py-2 text-[14px] leading-5 text-ink";
const LIEN = "inline-flex h-11 items-center px-1 text-[14px] leading-5 font-semibold whitespace-nowrap text-anthracite underline underline-offset-4 hover:text-ink cursor-pointer";
const taille = (o: number) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`);

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border border-line bg-white p-6">
      <h2 className="text-[22px] leading-7">{titre}</h2>
      {children}
    </section>
  );
}

function Completer() {
  return (
    <HpPage>
      <Page />
    </HpPage>
  );
}

function Page() {
  const { id } = Route.useParams();
  const { email } = useOwnProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["requests", "one", id], queryFn: () => fetchRequest(id) });
  const r = q.data;
  const cle = `hp-brouillon-complement:${id}`;
  const questions = r ? questionsOf(r).map((x) => x.replace(/^\d+\.\s/, "")) : [];
  const [reponses, setReponses] = useState<string[]>([]);
  const [infos, setInfos] = useState("");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [rejet, setRejet] = useState("");
  const [survol, setSurvol] = useState(false);
  const [message, setMessage] = useState("");
  const charge = useRef(false);

  useEffect(() => {
    if (!r || charge.current) return;
    charge.current = true;
    try {
      const b = JSON.parse(localStorage.getItem(cle) ?? "null");
      if (b) { setReponses(b.reponses ?? []); setInfos(b.infos ?? ""); setMessage("Brouillon repris."); }
    } catch { /* stockage indisponible */ }
  }, [r, cle]);

  const renvoyer = useMutation({
    mutationFn: () => completeRequest(id, questions.map((x, i) => ({ question: x, reponse: (reponses[i] ?? "").trim() })), infos.trim(), fichiers),
    onSuccess: () => {
      try { localStorage.removeItem(cle); } catch { /* ignoré */ }
      toast.success("Demande renvoyée");
      qc.invalidateQueries({ queryKey: ["requests"] });
      void navigate({ to: "/demandes", hash: "mes-demandes" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "L'envoi a échoué"),
  });

  if (q.isLoading) return <p className="text-ink-2">Chargement…</p>;
  if (!r) return <p role="alert">Cette demande n'existe pas ou tu n'as pas le droit de la lire.</p>;

  const etat = stateOf(r);
  const complement = (r.complement ?? null) as Complement | null;
  const estAuteur = (r.submitted_by_email ?? "").toLowerCase() === email;
  const ouverte = etat === "a_completer" && estAuteur;
  const valideur = r.decided_by_name ?? "la personne qui décide";
  const complet = questions.every((_, i) => (reponses[i] ?? "").trim().length >= 2);

  const etapes = [
    { label: "1. Déposée", info: date(r.created_at), fait: true },
    { label: "2. Refusée, à clarifier", info: [r.decided_at && date(r.decided_at), r.decided_by_name].filter(Boolean).join(" · "), fait: true },
    { label: "3. Complétée", info: complement?.date ? `Renvoyée le ${date(complement.date)}` : "En attente de ta réponse", fait: !!complement?.date && etat !== "a_completer" },
  ];

  const ajouter = (liste: FileList | null) => {
    if (!liste) return;
    const ok: File[] = [];
    const refus: string[] = [];
    for (const f of Array.from(liste)) {
      if (fichiers.length + ok.length >= MAX_JUSTIFICATIFS) refus.push(`« ${f.name} » non ajouté : ${MAX_JUSTIFICATIFS} fichiers maximum.`);
      else if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) refus.push(`« ${f.name} » refusé : seuls les fichiers PDF sont acceptés.`);
      else if (f.size > MAX_PDF_BYTES) refus.push(`« ${f.name} » refusé : il dépasse 20 Mo.`);
      else ok.push(f);
    }
    setRejet(refus.join(" "));
    if (ok.length) setFichiers([...fichiers, ...ok]);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border border-line bg-white px-8 py-6">
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[14px] leading-5">
          <Link to="/demandes" hash="mes-demandes" className="inline-flex min-h-6 items-center text-ink-2 underline underline-offset-2 hover:text-ink">Mes demandes</Link>
          <span aria-hidden className="text-ink-2">/</span>
          <span aria-current="page" className="font-semibold">Demande {refOf(r)}</span>
        </nav>
        <h1 className="text-[36px] leading-[44px]">{titleOf(r)}</h1>
        <p className="text-[14px] leading-5 text-ink-2">
          {r.decided_at && `Refusée le ${date(r.decided_at)}, motif : À clarifier`} · Déposée par {r.author_name} ({r.team})
        </p>
        <ol aria-label="Cycle de traitement" className="grid grid-cols-3 border border-line">
          {etapes.map((e, i) => {
            const actuelle = !e.fait && etapes[i - 1]?.fait;
            return (
              <li
                key={e.label}
                aria-current={actuelle ? "step" : undefined}
                className={cn(
                  "flex flex-col gap-1 border-b-2 px-4 py-3 not-last:border-r not-last:border-r-line",
                  e.fait ? "border-b-transparent bg-neutral-1" : actuelle ? "border-b-anthracite bg-neutral-2" : "border-b-transparent bg-white",
                )}
              >
                <span className="label flex items-center gap-2 text-anthracite">{e.fait && <Check size={14} aria-hidden />}{e.label}</span>
                <span className="text-[12px] leading-4 text-ink-2">{e.info}</span>
              </li>
            );
          })}
        </ol>
      </header>

      {!ouverte ? (
        <section className="flex items-center justify-between gap-6 border border-line bg-white p-6">
          <p className="text-[14px] leading-5 font-semibold">Cette demande a déjà reçu une décision ou a déjà été complétée.</p>
          <Link to="/demande/$id" params={{ id: r.id }} className={hpButtonVariants({ role: "consulte" })}><span>VOIR LA DEMANDE</span></Link>
        </section>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Bloc titre={`Ce que ${valideur} te demande de préciser`}>
              <ol className="flex list-decimal flex-col gap-1 pl-6 text-[14px] leading-5 font-semibold">
                {questions.map((x, i) => <li key={i}>{x}</li>)}
              </ol>
              {r.rejection_note && Array.isArray(r.clarifications) && r.clarifications.length > 0 && (
                <blockquote className="border-l-[3px] border-anthracite bg-neutral-1 px-5 py-4 text-[14px] leading-6">
                  « {r.rejection_note} »
                  {r.decided_at && <span className="mt-2 block text-[12px] leading-4 text-ink-2">Émis le {date(r.decided_at)}</span>}
                </blockquote>
              )}
            </Bloc>

            <details className="group border border-line bg-white">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-6 [&::-webkit-details-marker]:hidden">
                <span className="font-title text-[22px] leading-7 font-bold">Ta demande initiale (lecture seule)</span>
                <ChevronDown size={18} aria-hidden className="group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-4 border-t border-line px-6 py-5">
                <dl className="grid grid-cols-3 gap-4 text-[14px] leading-5">
                  <div><dt className="label text-ink-2">Auteur</dt><dd>{r.author_name}</dd></div>
                  <div><dt className="label text-ink-2">Équipe</dt><dd>{r.team}</dd></div>
                  <div><dt className="label text-ink-2">Thème</dt><dd>{r.theme ?? "Aucun"}</dd></div>
                </dl>
                <div className="flex flex-col gap-2 text-[14px] leading-6"><RichText texte={r.content} /></div>
                {r.attachment_name && <p className="text-[14px] leading-5">Pièce jointe : {r.attachment_name}</p>}
                <p className="flex items-center gap-2 bg-neutral-1 px-4 py-3 text-[12px] leading-4">
                  <Lock size={14} aria-hidden />
                  La visibilité, l'équipe et la personne qui décide ({valideur}) ne changent pas.
                </p>
              </div>
            </details>

            <Bloc titre="Compléter ma demande">
              {questions.map((x, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <label htmlFor={`reponse-${i}`} className="text-[14px] leading-5 font-semibold text-ink">{i + 1}. {x} *</label>
                    <span className="shrink-0 text-[12px] leading-4 text-ink-2">{(reponses[i] ?? "").length} / {MAX_REPONSE} caractères</span>
                  </div>
                  <textarea
                    id={`reponse-${i}`}
                    rows={3}
                    maxLength={MAX_REPONSE}
                    value={reponses[i] ?? ""}
                    onChange={(e) => setReponses(questions.map((_, j) => (j === i ? e.target.value : (reponses[j] ?? ""))))}
                    className={champ}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor="infos" className="label text-ink">Informations complémentaires (facultatif)</label>
                  <span className="text-[12px] leading-4 text-ink-2">{infos.length} / {MAX_INFOS} caractères</span>
                </div>
                <textarea id="infos" rows={3} maxLength={MAX_INFOS} value={infos} onChange={(e) => setInfos(e.target.value)} className={champ} />
              </div>
              <div className="flex flex-col gap-2">
                <span className="label text-ink">Documents justificatifs (facultatif)</span>
                <div className="flex flex-col gap-3">
                  {fichiers.length >= MAX_JUSTIFICATIFS ? (
                    <p className="bg-neutral-1 px-4 py-3 text-[14px] leading-5">{MAX_JUSTIFICATIFS} fichiers rattachés : retire un fichier pour en ajouter un autre.</p>
                  ) : (
                    <label
                      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
                      onDragLeave={() => setSurvol(false)}
                      onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouter(e.dataTransfer.files); }}
                      className={cn("flex cursor-pointer flex-col items-center gap-2 border border-dashed border-field px-6 py-6 text-center", survol ? "bg-neutral-2" : "bg-neutral-1 hover:bg-neutral-2")}
                    >
                      <Upload size={20} aria-hidden />
                      <span className="text-[14px] leading-5">Glisse tes fichiers ici ou <span className="font-semibold underline underline-offset-4">parcours tes dossiers</span></span>
                      <span className="text-[12px] leading-4 text-ink-2">PDF uniquement · 20 Mo maximum par document · {MAX_JUSTIFICATIFS} fichiers maximum</span>
                      <input type="file" multiple accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { ajouter(e.target.files); e.target.value = ""; }} />
                    </label>
                  )}
                  {rejet && <p role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">{rejet}</p>}
                  {fichiers.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="label text-ink">Documents rattachés</h3>
                      <ul className="flex flex-col border border-line">
                        {fichiers.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="flex items-center gap-3 border-b border-line px-4 py-1 last:border-b-0">
                            <FileText size={16} aria-hidden className="text-ink-2" />
                            <span className="min-w-0 flex-1 truncate text-[14px] leading-5">{f.name}</span>
                            <span className="text-[12px] leading-4 text-ink-2">{taille(f.size)}</span>
                            <HpIconButton icon={Trash2} label={`Retirer ${f.name}`} className="border-0" onClick={() => setFichiers(fichiers.filter((_, k) => k !== i))} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Bloc>

            <div className="flex items-center justify-end gap-4 border border-line bg-white p-6">
              <span role="status" className="mr-auto text-[12px] leading-4 text-ink-2">{message}</span>
              <Link to="/demandes" hash="mes-demandes" className={LIEN}>Annuler</Link>
              <button
                type="button"
                className={LIEN}
                onClick={() => {
                  try { localStorage.setItem(cle, JSON.stringify({ reponses, infos })); } catch { /* ignoré */ }
                  setMessage(`Brouillon enregistré à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`);
                }}
              >
                Enregistrer le brouillon
              </button>
              {!complet && <p id="renvoi-aide" role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">Réponds à chaque précision pour renvoyer.</p>}
              <HpButton role="principal" icon={Send} disabled={!complet || renvoyer.isPending} onClick={() => renvoyer.mutate()} aria-describedby={!complet ? "renvoi-aide" : undefined}>
                RENVOYER MA DEMANDE
              </HpButton>
            </div>
          </div>

          <aside className="flex flex-col gap-4 border border-line bg-white p-6">
            <h2 className="label-13 font-label text-ink">DÉCIDE</h2>
            <p className="text-[16px] leading-6 font-semibold">{valideur}</p>
            <dl className="flex flex-col gap-3 border-t border-line pt-4 text-[14px] leading-5">
              <div>
                <dt className="label text-ink-2">Dernière action</dt>
                <dd>{r.decided_at ? `À clarifier, le ${date(r.decided_at)}` : "À clarifier"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
