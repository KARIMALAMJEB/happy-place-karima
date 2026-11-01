import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

// Texte de secours si la table est illisible : la règle d'origine
export const REGLE_PAR_DEFAUT = "Les managers publient seuls pour leurs équipes. Pour toute l'entreprise, ils demandent l'autorisation d'un admin.";
export const REGLE_MAX = 600;

export async function fetchRegle(): Promise<string> {
  const { data, error } = await sb.from("publication_rule").select("body").eq("id", 1).maybeSingle();
  if (error || !data) return REGLE_PAR_DEFAUT;
  return (data as { body: string }).body;
}

export async function saveRegle(body: string, par: string) {
  const { error } = await sb
    .from("publication_rule")
    .update({ body: body.trim(), updated_at: new Date().toISOString(), updated_by: par })
    .eq("id", 1);
  if (error) throw error;
}

export function useRegle() {
  const q = useQuery({ queryKey: ["publication_rule"], queryFn: fetchRegle, staleTime: 60_000 });
  return q.data ?? REGLE_PAR_DEFAUT;
}
