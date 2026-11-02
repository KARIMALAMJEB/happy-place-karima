import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Newspaper, Users, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hpButtonVariants } from "@/components/hp/button";
import { HpPage } from "@/components/hp/page";
import { processAttachmentDeletionQueue } from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/manage")({
  head: () => ({
    meta: [
      { title: "Gestion des données — Happy Place" },
      {
        name: "description",
        content:
          "Gérer les actualités du cabinet, les propositions internes, les alertes sur les recrutements et les indicateurs de performance.",
      },
      { property: "og:title", content: "Gestion des données — Happy Place" },
      {
        property: "og:description",
        content: "Gestion de l'activité d'un cabinet de recrutement spécialisé dans l'IT et le digital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.role !== "admin") throw redirect({ to: "/" });
  },
  component: ManageLayout,
});

const tabs: { to: "/manage/news" | "/manage/submissions" | "/manage/users"; label: string; icon: LucideIcon; table: "news" | "submissions" | "allowed_users" }[] = [
  { to: "/manage/news", label: "ACTUALITÉS", icon: Newspaper, table: "news" },
  { to: "/manage/submissions", label: "DEMANDES", icon: Inbox, table: "submissions" },
  { to: "/manage/users", label: "ÉQUIPES ET UTILISATEURS", icon: Users, table: "allowed_users" },
];

// Pastille de comptage : un chiffre simple pour savoir ce que contient chaque onglet
function Compte({ table }: { table: "news" | "submissions" | "allowed_users" }) {
  const q = useQuery({
    queryKey: ["manage-count", table],
    queryFn: async () => {
      const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    retry: false,
  });
  if (q.data === undefined) return null;
  return <span className="ml-1 inline-flex min-w-6 items-center justify-center bg-neutral-1 px-1.5 text-[12px] leading-5 font-semibold text-anthracite">{q.data}</span>;
}

function ManageLayout() {
  const qc = useQueryClient();
  // Suppression silencieuse des pièces jointes échues, une fois par chargement de /manage
  useEffect(() => {
    processAttachmentDeletionQueue()
      .then((r) => {
        if (r.remaining > 0) toast.error(`${r.remaining} document(s) n'ont pas pu être supprimés.`);
        else if (r.deleted > 0) toast.success(`${r.deleted} document(s) supprimé(s)`);
      })
      .catch(() => toast.error("La suppression des documents échus a échoué."))
      .finally(() => qc.invalidateQueries({ queryKey: ["attachment_deletion_queue"] }));
  }, [qc]);
  return (
    <HpPage>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-6 border border-line border-l-4 border-l-anthracite bg-white px-8 pt-6">
          <div className="flex w-full flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <p className="label text-ink-2">ESPACE ADMINISTRATEUR</p>
              <h1 className="text-[36px] leading-[44px]">Gestion des données</h1>
              <p className="max-w-[640px] text-[16px] leading-6 text-ink-2">
                Retrouver, corriger et organiser les actualités, les demandes et les personnes autorisées à se connecter.
              </p>
            </div>
            <Link to="/" className={hpButtonVariants({ role: "consulte" })}>
              <span>RETOUR AU TABLEAU DE BORD</span>
            </Link>
          </div>
          <nav aria-label="Sections de la gestion" className="-mx-8 flex w-[calc(100%+4rem)] flex-wrap border-t border-line px-8">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="label inline-flex h-12 items-center gap-2 border-b-2 border-b-transparent px-4 text-ink-2 hover:text-anthracite"
                activeProps={{ className: "border-b-anthracite bg-neutral-1 text-anthracite" }}
              >
                <t.icon size={16} aria-hidden />
                {t.label}
                <Compte table={t.table} />
              </Link>
            ))}
          </nav>
        </header>
        <Outlet />
      </div>
    </HpPage>
  );
}
