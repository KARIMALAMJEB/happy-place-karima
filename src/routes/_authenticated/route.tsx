import { createFileRoute, isRedirect, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchOwnRole } from "@/lib/auth";

// Liste blanche (kick-off) : un compte connecté qui n'est pas autorisé est déconnecté tout de suite,
// avec un message explicite sur /auth. Seule exception transitoire : une session anonyme de démonstration
// (adresse interne @happyplace.test) reste envoyée vers /choisir-role, jusqu'au retrait de ce mode.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });
      const email = data.user.email ?? "";
      const role = email ? await fetchOwnRole(email) : null;
      if (!role) {
        if (data.user.is_anonymous) throw redirect({ to: "/choisir-role" });
        await supabase.auth.signOut();
        throw redirect({ to: "/auth", search: { refus: true } });
      }
      return { user: data.user, email, role };
    } catch (e) {
      if (isRedirect(e)) throw e;
      // Session périmée ou compte changé dans un autre onglet : retour propre à la connexion.
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
