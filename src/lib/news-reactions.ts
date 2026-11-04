import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Avis sur les actualités (EV2) : un pouce levé ou baissé par personne et par actualité.
const sb = supabase as unknown as SupabaseClient;

export type ReactionCount = { news_id: string; likes: number; dislikes: number; mine: -1 | 0 | 1 | null };

export async function fetchReactionCounts(ids: string[]): Promise<Record<string, ReactionCount>> {
  if (!ids.length) return {};
  const { data, error } = await sb.rpc("news_reaction_counts", { _ids: ids });
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as ReactionCount[]).map((r) => [r.news_id, r]));
}

/** value = null retire l'avis. Même valeur qu'avant : le clic annule. */
export async function setReaction(newsId: string, email: string, value: -1 | 1 | null) {
  const mail = email.toLowerCase();
  if (value === null) {
    const { error } = await sb.from("news_reactions").delete().eq("news_id", newsId).eq("user_email", mail);
    if (error) throw error;
    return;
  }
  const { error } = await sb.from("news_reactions").upsert({ news_id: newsId, user_email: mail, reaction: value }, { onConflict: "news_id,user_email" });
  if (error) throw error;
}
