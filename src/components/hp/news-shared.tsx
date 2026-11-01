import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon } from "lucide-react";
import { POINTS, type Ton } from "@/components/hp/statut";
import type { News } from "@/lib/dashboard";
import { signedNewsImageUrl, type NewsFile } from "@/lib/news-media";
import { cn } from "@/lib/utils";

// Éléments communs aux écrans Actualités (fil, carte, carrousel, article, suivi), portés de news/shared.tsx du prototype

export const dateSansJour = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));
export const dateCourte = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso)) : "—";
export const joursDepuis = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export const estEntreprise = (n: News) => (n.scope ?? "entreprise") === "entreprise";
export const libellePerimetre = (n: News) =>
  estEntreprise(n) ? "Toute l'entreprise" : (n.teams ?? []).length > 1 ? `Plusieurs équipes (${(n.teams ?? []).join(", ")})` : ((n.teams ?? [])[0] ?? "Mon équipe");

// Photos (3 maximum, la première = couverture) et fichiers joints (4 maximum)
export const imagesDe = (n: News): string[] => (n.image_paths && n.image_paths.length ? n.image_paths : n.image_path ? [n.image_path] : []);
export const fichiersDe = (n: News): NewsFile[] => (Array.isArray(n.attachments) ? (n.attachments as NewsFile[]) : []);
export const signature = (n: News) => `Par ${n.author} · Publié le ${dateSansJour(n.created_at)}`;

const STATUTS: Record<string, { libelle: string; ton: Ton }> = {
  brouillon: { libelle: "BROUILLON", ton: "gris" },
  "en attente": { libelle: "EN ATTENTE D'ACCORD", ton: "ambre" },
  autorisée: { libelle: "AUTORISÉE", ton: "vert" },
  publiée: { libelle: "PUBLIÉE", ton: "vert" },
  refusée: { libelle: "REFUSÉE", ton: "rouge" },
};
export const tonNews = (statut: string): Ton => STATUTS[statut]?.ton ?? "gris";

// Statut d'une publication : carré de 10 px + libellé, même code que les demandes
export function StatutPublication({ statut }: { statut: string }) {
  const s = STATUTS[statut] ?? { libelle: statut.toUpperCase(), ton: "gris" as Ton };
  return (
    <span className="label inline-flex items-center gap-2 whitespace-nowrap text-ink">
      <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: POINTS[s.ton] }} />
      {s.libelle}
    </span>
  );
}

// Image (lien signé) ou bloc gris avec pictogramme
export function Couverture({ path, className }: { path?: string; className?: string }) {
  const q = useQuery({
    queryKey: ["news-image", path],
    enabled: !!path,
    queryFn: () => signedNewsImageUrl(path!),
    staleTime: 50 * 60 * 1000,
    retry: false,
  });
  return q.data ? (
    <img src={q.data} alt="" className={cn("w-full object-cover", className)} />
  ) : (
    <div aria-hidden className={cn("flex w-full items-center justify-center bg-neutral-1", className)}>
      <ImageIcon size={32} className="text-ink-2" />
    </div>
  );
}
