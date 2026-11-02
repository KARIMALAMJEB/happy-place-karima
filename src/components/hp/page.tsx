import { useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AppShell } from "@/components/hp/app-shell";
import { supabase } from "@/integrations/supabase/client";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

// Profil de l'utilisateur connecté (prénom, nom, équipe) : lecture de sa propre ligne de la liste blanche
export function useOwnProfile() {
  const { email } = useRouteContext({ from: "/_authenticated" });
  const mail = (email ?? "").toLowerCase();
  const q = useQuery({
    queryKey: ["own_profile", mail],
    enabled: !!mail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("first_name, last_name, team")
        .eq("email", mail)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const first = cap(q.data?.first_name?.trim() ?? "");
  const last = (q.data?.last_name ?? "").trim().toUpperCase();
  const fullName = [first, last].filter(Boolean).join(" ") || mail;
  return { email: mail, firstName: first || mail.split("@")[0], fullName, team: q.data?.team ?? null };
}

// Page V2 : coque (menu, en-tête, pied de page) + contenu
export function HpPage({ children }: { children: ReactNode }) {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const { fullName, team } = useOwnProfile();
  return <AppShell name={fullName} role={role} equipe={team}>{children}</AppShell>;
}
