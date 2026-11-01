import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Demandes V2 (FT1). Client non typé : les types générés de Supabase seront régénérés plus tard,
// les colonnes ajoutées par la migration ft1_demandes n'y figurent pas encore.
const sb = supabase as unknown as SupabaseClient;

export const THEMES = ["Conditions de travail", "Cantine", "CE", "Informatique", "Autre"] as const;
export type Theme = (typeof THEMES)[number];
export type Visibility = "tous" | "equipe" | "manager";
export type FollowUp = "ouvert" | "en_cours" | "resolu";

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  tous: "Visible par tous",
  equipe: "Visible par mon équipe",
  manager: "Visible par mon manager uniquement",
};

export type RequestRow = {
  id: string;
  ref_number: number;
  title: string | null;
  content: string;
  status: "en attente" | "validée" | "refusée";
  created_at: string;
  team: string;
  author_name: string;
  submitted_by_email: string | null;
  blocking: boolean;
  visibility: Visibility;
  theme: string | null;
  confidential_identity: boolean;
  validator_type: "manager" | "admin" | null;
  follow_up: FollowUp | null;
  responsible: string | null;
  target_date: string | null;
  done: boolean;
  rejection_category: string | null;
  rejection_note: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  clarifications: unknown;
  complement: unknown;
  attachment_path: string | null;
  attachment_name: string | null;
  attachments?: unknown;
  author_seen_at: string | null;
  reminded_at: string | null;
};

export type RequestState = "en_attente" | "a_completer" | "validee" | "refusee";

// « À compléter » = refus avec le motif « à clarifier » : l'auteur peut répondre et renvoyer
export function stateOf(r: Pick<RequestRow, "status" | "rejection_category">): RequestState {
  if (r.status === "en attente") return "en_attente";
  if (r.status === "validée") return "validee";
  return r.rejection_category === "à clarifier" ? "a_completer" : "refusee";
}

export const STATE_LABEL: Record<RequestState, string> = {
  en_attente: "En attente",
  a_completer: "À compléter",
  validee: "Validée",
  refusee: "Refusée",
};

export const refOf = (r: Pick<RequestRow, "created_at" | "ref_number">) =>
  `#D-${new Date(r.created_at).getFullYear()}-${String(r.ref_number).padStart(3, "0")}`;

export const titleOf = (r: Pick<RequestRow, "title" | "content">) => r.title?.trim() || r.content.slice(0, 80);

export async function fetchMyRequests(email: string): Promise<RequestRow[]> {
  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .ilike("submitted_by_email", email)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RequestRow[];
}

// La base ne renvoie que ce que la visibilité choisie permet de lire (règle RLS)
export async function fetchValidatedRequests(): Promise<RequestRow[]> {
  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .eq("status", "validée")
    .order("decided_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as RequestRow[];
}

export const ATTACHMENT_BUCKET = "submission-attachments";
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export type NewRequest = {
  author_name: string;
  team: string; // « auto » (collaborateur) ou « Admin » : la base impose la vraie équipe à l'enregistrement
  title: string;
  content: string;
  blocking: boolean;
  visibility: Visibility;
  theme: Theme | null;
  confidential_identity: boolean;
  validator_type: "manager" | "admin";
};

export const MAX_PIECES_DEPOT = 3;
export type PieceJointe = { path: string; name: string };

// Pièces jointes d'une demande : colonne attachments, ou ancienne pièce unique
export function piecesOf(r: { attachments?: unknown; attachment_path?: string | null; attachment_name?: string | null }): PieceJointe[] {
  const liste = Array.isArray(r.attachments) ? (r.attachments as PieceJointe[]).filter((x) => x && x.path) : [];
  if (liste.length) return liste;
  return r.attachment_path ? [{ path: r.attachment_path, name: r.attachment_name ?? "Document" }] : [];
}

export async function createRequest(input: NewRequest, files: File[] = []) {
  if (files.length > MAX_PIECES_DEPOT) throw new Error(`${MAX_PIECES_DEPOT} fichiers maximum.`);
  const pieces: PieceJointe[] = [];
  if (files.length) {
    const { data: u } = await sb.auth.getUser();
    if (!u.user) throw new Error("Session expirée : reconnecte-toi.");
    for (const file of files) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Seuls les fichiers PDF sont acceptés.");
      if (file.size > MAX_PDF_BYTES) throw new Error("Le fichier dépasse 20 Mo.");
      const path = `${u.user.id}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await sb.storage.from(ATTACHMENT_BUCKET).upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      pieces.push({ path, name: file.name.slice(0, 200) });
    }
  }
  const { error } = await sb.from("submissions").insert({
    ...input,
    status: "en attente",
    // le premier fichier reste aussi dans les anciennes colonnes (suppression et départs gérés par la base)
    attachment_path: pieces[0]?.path ?? null,
    attachment_name: pieces[0]?.name ?? null,
    attachments: pieces,
  });
  if (error) throw error;
}

export async function fetchRequest(id: string): Promise<RequestRow | null> {
  const { data, error } = await sb.from("submissions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as RequestRow | null;
}

// Demandes en attente que l'utilisateur peut traiter (la base ne renvoie que celles de ses équipes pour un manager)
export async function fetchToReview(): Promise<RequestRow[]> {
  const { data, error } = await sb
    .from("submissions")
    .select("*")
    .eq("status", "en attente")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RequestRow[];
}

// Libellé affiché d'un motif (la base stocke « à clarifier », « doublon »…)
export const motifLabel = (m: string | null | undefined) => (m ? m.charAt(0).toUpperCase() + m.slice(1) : "");

export type Motif = "à clarifier" | "en désaccord avec les process" | "doublon" | "autre";

export type Decision =
  | { kind: "valider" }
  | { kind: "refuser"; motif: Motif; explication: string; precisions?: string[] };

export async function decideRequest(id: string, d: Decision) {
  const patch =
    d.kind === "valider"
      ? { status: "validée", rejection_category: null, rejection_note: null }
      : {
          status: "refusée",
          rejection_category: d.motif,
          // L'explication part dans l'e-mail ; les précisions (« À clarifier ») sont listées pour la réponse de l'auteur
          rejection_note: d.explication.trim().slice(0, 500),
          ...(d.motif === "à clarifier" ? { clarifications: (d.precisions ?? []).map((q) => q.trim()) } : {}),
        };
  const { error } = await sb.from("submissions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateFollowUp(
  id: string,
  v: { follow_up: FollowUp | null; responsible: string | null; target_date: string | null; done: boolean },
) {
  const { error } = await sb.from("submissions").update(v).eq("id", id);
  if (error) throw error;
}

export const MAX_JUSTIFICATIFS = 4;
export type Justificatif = { path: string; name: string };
export type Reponse = { question: string; reponse: string };
export type Complement = { reponses?: (Reponse & Partial<Justificatif>)[]; fichiers?: Justificatif[]; infos?: string | null; date?: string };

// Précisions demandées ; pour une ancienne demande sans liste, le message du valideur sert de question unique
export const questionsOf = (r: Pick<RequestRow, "clarifications" | "rejection_note">): string[] =>
  Array.isArray(r.clarifications) && r.clarifications.length
    ? (r.clarifications as string[])
    : r.rejection_note ? [r.rejection_note] : [];

// L'auteur répond après une demande de précisions : PDF déposés dans son dossier, puis RPC contrôlée côté base
export async function completeRequest(id: string, reponses: Reponse[], infos: string, files: File[] = []) {
  if (files.length > MAX_JUSTIFICATIFS) throw new Error(`${MAX_JUSTIFICATIFS} documents au maximum.`);
  const pieces: Justificatif[] = [];
  if (files.length) {
    const { data: u } = await sb.auth.getUser();
    if (!u.user) throw new Error("Session expirée : reconnecte-toi.");
    for (const f of files) {
      if (f.type !== "application/pdf") throw new Error("Seuls les fichiers PDF sont acceptés.");
      if (f.size > MAX_PDF_BYTES) throw new Error(`${f.name} dépasse 20 Mo.`);
      const path = `${u.user.id}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await sb.storage.from(ATTACHMENT_BUCKET).upload(path, f, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      pieces.push({ path, name: f.name.slice(0, 200) });
    }
  }
  const { error } = await sb.rpc("complete_submission", { _id: id, _answers: reponses, _infos: infos.trim(), _files: pieces });
  if (error) throw error;
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await sb.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 120);
  if (error) throw error;
  return data.signedUrl;
}

// Valideurs : toutes les demandes que la base leur laisse lire (équipes du manager, ou toute l'entreprise pour l'admin)
export async function fetchAllRequests(): Promise<RequestRow[]> {
  const { data, error } = await sb.from("submissions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RequestRow[];
}

// Relance : la base vérifie le délai de 5 jours ouvrés
export async function remindRequest(id: string) {
  const { error } = await sb.rpc("remind_submission", { _id: id });
  if (error) throw error;
}

// L'auteur a lu la décision (point « Réponse non lue »)
export async function markSeen(id: string) {
  await sb.rpc("mark_submission_seen", { _id: id });
}

export const nonLue = (r: Pick<RequestRow, "decided_at" | "author_seen_at">) =>
  !!r.decided_at && (!r.author_seen_at || new Date(r.author_seen_at) < new Date(r.decided_at));
