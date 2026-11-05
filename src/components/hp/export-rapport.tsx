import { useQuery } from "@tanstack/react-query";
import { Download, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { loadBrowserLib } from "@/lib/browser-lib";
import type { AppRole } from "@/lib/auth";
import {
  STATE_LABEL,
  VISIBILITY_LABEL,
  fetchAllRequests,
  fetchMyRequests,
  fetchToReview,
  refOf,
  stateOf,
  titleOf,
  type RequestRow,
  type RequestState,
} from "@/lib/requests";

// Export du rapport : chacun choisit la source, la période, les statuts, les colonnes et le format.
// Les données viennent des mêmes lectures que les écrans (soumises aux règles d'accès de la base) :
// personne n'exporte plus que ce qu'il peut déjà voir.

type Source = "mes" | "a-valider" | "toutes";
type Format = "csv" | "xlsx" | "pdf";
type Periode = "30" | "90" | "tout";

const jour = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso)) : "";

type Colonne = { id: string; label: string; defaut: boolean; valeur: (r: RequestRow, moi: string) => string };
const COLONNES: Colonne[] = [
  { id: "ref", label: "Référence", defaut: true, valeur: (r) => refOf(r) },
  { id: "date", label: "Date de dépôt", defaut: true, valeur: (r) => jour(r.created_at) },
  { id: "titre", label: "Titre", defaut: true, valeur: (r) => titleOf(r) },
  { id: "contenu", label: "Contenu", defaut: false, valeur: (r) => r.content },
  { id: "auteur", label: "Auteur", defaut: false, valeur: (r, moi) => (r.confidential_identity && (r.submitted_by_email ?? "").toLowerCase() !== moi ? "Auteur confidentiel" : r.author_name) },
  { id: "equipe", label: "Équipe", defaut: true, valeur: (r) => r.team },
  { id: "statut", label: "Statut", defaut: true, valeur: (r) => STATE_LABEL[stateOf(r)] },
  { id: "nature", label: "Nature", defaut: false, valeur: (r) => (r.blocking ? "Bloquante" : "Non bloquante") },
  { id: "visibilite", label: "Visibilité", defaut: false, valeur: (r) => VISIBILITY_LABEL[r.visibility] },
  { id: "theme", label: "Thème", defaut: false, valeur: (r) => r.theme ?? "" },
  { id: "decision", label: "Date de décision", defaut: false, valeur: (r) => jour(r.decided_at) },
  { id: "decideur", label: "Décidé par", defaut: false, valeur: (r) => r.decided_by_name ?? "" },
  { id: "motif", label: "Motif de refus", defaut: false, valeur: (r) => r.rejection_category ?? "" },
];

const ETATS: RequestState[] = ["en_attente", "a_completer", "validee", "refusee"];
const FORMATS: { id: Format; label: string; aide: string }[] = [
  { id: "csv", label: "CSV", aide: "s'ouvre dans Excel ou Google Sheets" },
  { id: "xlsx", label: "Excel (.xlsx)", aide: "tableau mis en forme" },
  { id: "pdf", label: "PDF", aide: "page imprimable, à enregistrer en PDF" },
];

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const echapper = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

async function produire(format: Format, cols: Colonne[], lignes: string[][], titre: string, nomFichier: string) {
  const entetes = cols.map((c) => c.label);
  if (format === "csv") {
    const cell = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const csv = [entetes, ...lignes].map((l) => l.map(cell).join(";")).join("\r\n");
    telecharger(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }), `${nomFichier}.csv`);
    return;
  }
  if (format === "xlsx") {
    const ExcelJS = await loadBrowserLib<typeof import("exceljs")>("/vendor/exceljs-4.4.0.min.js", "ExcelJS");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Rapport", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ header: c.label, width: c.id === "contenu" ? 60 : c.id === "titre" ? 40 : 20 }));
    ws.getRow(1).font = { bold: true };
    lignes.forEach((l) => ws.addRow(l));
    const buf = await wb.xlsx.writeBuffer();
    telecharger(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${nomFichier}.xlsx`);
    return;
  }
  // PDF : page imprimable dans un cadre caché, la boîte d'impression du navigateur propose « Enregistrer au format PDF »
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title>
<style>body{font-family:Arial,sans-serif;color:#2F2F35;margin:24px}h1{font-size:20px}p{font-size:12px;color:#66666E}
table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #D9D7D2;padding:6px;text-align:left;vertical-align:top}th{background:#EEEDEA}</style></head>
<body><h1>${echapper(titre)}</h1><p>Exporté le ${jour(new Date().toISOString())} · ${lignes.length} demande${lignes.length > 1 ? "s" : ""}</p>
<table><thead><tr>${entetes.map((e) => `<th>${echapper(e)}</th>`).join("")}</tr></thead><tbody>${lignes
    .map((l) => `<tr>${l.map((v) => `<td>${echapper(v)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  const cadre = document.createElement("iframe");
  cadre.setAttribute("aria-hidden", "true");
  cadre.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  cadre.srcdoc = html;
  cadre.onload = () => {
    cadre.contentWindow?.focus();
    cadre.contentWindow?.print();
    setTimeout(() => cadre.remove(), 60000);
  };
  document.body.appendChild(cadre);
}

export function ExportRapport({ role, email }: { role: AppRole; email: string }) {
  const moi = email.toLowerCase();
  const ref = useRef<HTMLDialogElement>(null);
  const idTitre = useId();
  const [ouvert, setOuvert] = useState(false);
  const [source, setSource] = useState<Source>("mes");
  const [periode, setPeriode] = useState<Periode>("30");
  const [etats, setEtats] = useState<RequestState[]>(ETATS);
  const [colonnes, setColonnes] = useState<string[]>(COLONNES.filter((c) => c.defaut).map((c) => c.id));
  const [format, setFormat] = useState<Format>("csv");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (ouvert && !dlg.open) dlg.showModal();
    if (!ouvert && dlg.open) dlg.close();
  }, [ouvert]);

  const donnees = useQuery({
    queryKey: ["requests", "export", source, moi],
    enabled: ouvert && !!moi,
    queryFn: () => (source === "mes" ? fetchMyRequests(moi) : source === "a-valider" ? fetchToReview() : fetchAllRequests()),
  });

  const lignes = useMemo(() => {
    const depuis = periode === "tout" ? 0 : Date.now() - Number(periode) * 86400000;
    return (donnees.data ?? []).filter((r) => new Date(r.created_at).getTime() >= depuis && etats.includes(stateOf(r)));
  }, [donnees.data, periode, etats]);

  const cols = COLONNES.filter((c) => colonnes.includes(c.id));
  const bascule = <T,>(l: T[], v: T) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);
  const sources: { id: Source; label: string }[] = [
    { id: "mes", label: "Mes demandes" },
    ...(role !== "collaborateur" ? [{ id: "a-valider" as const, label: role === "manager" ? "Les demandes de mon équipe" : "Les demandes à valider" }] : []),
    ...(role === "admin" ? [{ id: "toutes" as const, label: "Toutes les demandes" }] : []),
  ];

  async function exporter() {
    setEnvoi(true);
    try {
      const nom = `rapport-demandes-${new Date().toISOString().slice(0, 10)}`;
      await produire(format, cols, lignes.map((r) => cols.map((c) => c.valeur(r, moi))), "Rapport des demandes · Happy Place", nom);
      toast.success(format === "pdf" ? "Choisis « Enregistrer au format PDF » dans la fenêtre d'impression." : `${lignes.length} demande${lignes.length > 1 ? "s" : ""} exportée${lignes.length > 1 ? "s" : ""}.`);
      if (format !== "pdf") setOuvert(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'export a échoué");
    } finally {
      setEnvoi(false);
    }
  }

  const pret = !donnees.isLoading && !donnees.isError && lignes.length > 0 && cols.length > 0 && !envoi;
  const champ = "flex min-h-11 cursor-pointer items-center gap-3 text-[14px] leading-5";
  const case_ = "size-6 shrink-0 cursor-pointer accent-anthracite";

  return (
    <>
      <HpButton role="consulte" icon={Download} onClick={() => setOuvert(true)} aria-haspopup="dialog">
        EXPORTER LE RAPPORT
      </HpButton>
      <dialog
        ref={ref}
        aria-labelledby={idTitre}
        onClose={() => setOuvert(false)}
        className="m-auto max-h-[90vh] w-[680px] max-w-[calc(100vw-32px)] overflow-y-auto border border-anthracite bg-white p-0 text-ink backdrop:bg-anthracite/50"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id={idTitre} className="text-[22px] leading-7">Exporter le rapport</h2>
          <HpIconButton icon={X} label="Fermer" onClick={() => setOuvert(false)} />
        </div>
        <div className="flex flex-col gap-5 px-6 py-5">
          {sources.length > 1 && (
            <fieldset className="flex flex-col gap-1">
              <legend className="label mb-1 text-ink-2">QUOI EXPORTER</legend>
              {sources.map((s) => (
                <label key={s.id} className={champ}>
                  <input type="radio" name="source" checked={source === s.id} onChange={() => setSource(s.id)} className={case_} />
                  {s.label}
                </label>
              ))}
            </fieldset>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-1">
              <legend className="label mb-1 text-ink-2">PÉRIODE</legend>
              {([["30", "30 derniers jours"], ["90", "90 derniers jours"], ["tout", "Tout l'historique"]] as const).map(([v, l]) => (
                <label key={v} className={champ}>
                  <input type="radio" name="periode" checked={periode === v} onChange={() => setPeriode(v)} className={case_} />
                  {l}
                </label>
              ))}
            </fieldset>
            <fieldset className="flex flex-col gap-1">
              <legend className="label mb-1 text-ink-2">STATUTS</legend>
              {ETATS.map((e) => (
                <label key={e} className={champ}>
                  <input type="checkbox" checked={etats.includes(e)} onChange={() => setEtats((l) => bascule(l, e))} className={case_} />
                  {STATE_LABEL[e]}
                </label>
              ))}
            </fieldset>
          </div>
          <fieldset className="flex flex-col gap-1">
            <legend className="label mb-1 flex w-full items-center justify-between text-ink-2">
              <span>INFORMATIONS À INCLURE</span>
              <span className="flex gap-4">
                <button type="button" className="underline underline-offset-4" onClick={() => setColonnes(COLONNES.map((c) => c.id))}>Tout cocher</button>
                <button type="button" className="underline underline-offset-4" onClick={() => setColonnes([])}>Tout décocher</button>
              </span>
            </legend>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {COLONNES.map((c) => (
                <label key={c.id} className={champ}>
                  <input type="checkbox" checked={colonnes.includes(c.id)} onChange={() => setColonnes((l) => bascule(l, c.id))} className={case_} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="label mb-1 text-ink-2">FORMAT</legend>
            {FORMATS.map((f) => (
              <label key={f.id} className={champ}>
                <input type="radio" name="format" checked={format === f.id} onChange={() => setFormat(f.id)} className={case_} />
                <span><span className="font-semibold">{f.label}</span> <span className="text-ink-2">· {f.aide}</span></span>
              </label>
            ))}
          </fieldset>
          <p role="status" aria-live="polite" className="border-l-4 border-l-anthracite bg-neutral-1 px-4 py-2 text-[14px] leading-5">
            {donnees.isLoading
              ? "Chargement des demandes…"
              : donnees.isError
                ? "Les demandes sont indisponibles pour le moment."
                : cols.length === 0
                  ? "Coche au moins une information à inclure."
                  : lignes.length === 0
                    ? "Aucune demande ne correspond à ces choix. Élargis la période ou les statuts."
                    : `${lignes.length} demande${lignes.length > 1 ? "s" : ""} seront exportées.`}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
          <HpButton role="consulte" onClick={() => setOuvert(false)}>ANNULER</HpButton>
          <HpButton role="publie" icon={Download} disabled={!pret} onClick={exporter}>
            {envoi ? "EXPORT EN COURS…" : "EXPORTER"}
          </HpButton>
        </div>
      </dialog>
    </>
  );
}
