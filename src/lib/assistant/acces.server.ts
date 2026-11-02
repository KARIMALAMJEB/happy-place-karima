import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { repondre, type ReponseAssistant } from "./assistant.server";
import type { ActualiteLue, Profil } from "./recherche";

// Retire la mise en forme (HTML) d'une actualité avant de l'indexer
const enTexte = (html: string | null) =>
  (html ?? "")
    .replace(/<\/(p|li|h[1-6]|div|br)>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();

// Identifie la personne à partir de son jeton, puis lit ce qu'elle a le droit de lire (jamais avec la clé administrateur)
export async function repondreAuNom(question: string, jeton: string): Promise<ReponseAssistant> {
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  const cle = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !cle) throw new Error("configuration Supabase absente");
  const db = createClient<Database>(url, cle, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error } = await db.auth.getClaims(jeton);
  const email = (claims?.claims?.email as string | undefined)?.toLowerCase();
  if (error || !email) throw new Error("jeton invalide");

  const { data: utilisateur } = await db.from("allowed_users").select("id, team").eq("email", email).maybeSingle();
  if (!utilisateur) throw new Error("hors liste blanche");
  const [{ data: role }, { data: gerees }] = await Promise.all([
    db.from("allowed_user_roles").select("role").eq("allowed_user_id", utilisateur.id).maybeSingle(),
    db.from("manager_teams").select("team").eq("allowed_user_id", utilisateur.id),
  ]);
  const profil: Profil = {
    id: (role?.role as Profil["id"] | undefined) ?? "collaborateur",
    equipes: [...new Set([utilisateur.team, ...(gerees ?? []).map((g) => g.team)].filter((t): t is string => !!t))],
  };

  // Actualités publiées, lues avec les droits de la personne
  const { data: actus } = await db.from("news").select("id, title, body").eq("status", "publiée");
  const actualites: ActualiteLue[] = (actus ?? []).map((a) => ({ id: a.id, title: a.title, body: enTexte(a.body) }));
  return repondre(question, profil, actualites);
}
