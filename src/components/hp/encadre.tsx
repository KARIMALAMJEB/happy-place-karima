import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Pictogramme : une seule famille (Lucide), trait fin, 20 px, anthracite, dans un carré #EEEDEA
export function Picto({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center bg-neutral-1", className)}>
      <Icon size={20} className="text-anthracite" />
    </span>
  );
}

// Encadré : gabarit unique des blocs de l'accueil (en-tête #EEEDEA, titre Bodoni, barre gauche anthracite 4 px).
// Utilisé à partir du lot 2 pour remplacer les blocs V1.
export function Encadre({
  id,
  icon,
  title,
  subtitle,
  compteur,
  filtre,
  children,
  className,
}: {
  id?: string;
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  compteur?: string;
  filtre?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn("flex scroll-mt-24 flex-col border border-line border-l-4 border-l-anthracite bg-white", className)}
    >
      <div className="flex flex-col gap-3 border-b border-line bg-neutral-1 px-6 py-3">
        <div className="flex min-h-10 items-center justify-between gap-4">
          <div className="flex min-w-[240px] items-center gap-3">
            {icon && <Picto icon={icon} className="bg-white" />}
            <div className="min-w-[240px]">
              <h2 className="text-[22px] leading-7 text-ink">{title}</h2>
              {subtitle && <p className="text-[12px] leading-4 text-ink-2">{subtitle}</p>}
            </div>
          </div>
          {compteur && <span className="shrink-0 text-[14px] leading-5 text-ink-2">{compteur}</span>}
        </div>
        {filtre && <div className="flex flex-wrap items-center justify-start gap-3">{filtre}</div>}
      </div>
      {children}
    </section>
  );
}
