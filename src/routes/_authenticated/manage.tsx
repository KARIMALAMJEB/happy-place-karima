import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

const tabs = [
  { to: "/manage/news", label: "ACTUALITÉS" },
  { to: "/manage/submissions", label: "SOUMISSIONS" },
  { to: "/manage/users", label: "UTILISATEURS AUTORISÉS" },
] as const;

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
        <header className="flex flex-wrap items-end justify-between gap-6 border border-line bg-white px-8 pt-6">
          <div className="flex w-full flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-[36px] leading-[44px]">Gestion des données</h1>
              <p className="text-[16px] leading-6">Actualités, soumissions et comptes autorisés (réservé à l'admin).</p>
            </div>
            <Link to="/" className={hpButtonVariants({ role: "consulte" })}>
              <span>RETOUR AU TABLEAU DE BORD</span>
            </Link>
          </div>
          <nav aria-label="Sections de la gestion" className="flex w-full">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="label inline-flex h-11 items-center border-b-2 border-b-transparent px-4 text-ink-2 hover:text-anthracite"
                activeProps={{ className: "border-b-anthracite bg-neutral-1 text-anthracite" }}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </header>
        <Outlet />
      </div>
    </HpPage>
  );
}
