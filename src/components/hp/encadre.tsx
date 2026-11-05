import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
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
  repliable = true,
  ouvertParDefaut = true,
}: {
  id?: string;
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  compteur?: string;
  filtre?: ReactNode;
  children: ReactNode;
  className?: string;
  // Le bloc peut se replier (titre et compteur restent visibles) ; l'état est gardé le temps de la session
  repliable?: boolean;
  ouvertParDefaut?: boolean;
}) {
  const corpsId = useId();
  const cle = `hp-encadre:${id ?? title}`;
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(cle);
      if (v === "1") setOuvert(true);
      if (v === "0") setOuvert(false);
    } catch {
      /* stockage indisponible : on garde la valeur par défaut */
    }
  }, [cle]);
  const basculer = () => {
    const suite = !ouvert;
    setOuvert(suite);
    try {
      sessionStorage.setItem(cle, suite ? "1" : "0");
    } catch {
      /* ignoré */
    }
  };
  const replie = repliable && !ouvert;
  return (
    <section
      id={id}
      aria-label={title}
      className={cn("flex min-w-0 scroll-mt-24 flex-col border border-line border-l-4 border-l-anthracite bg-white", className)}
    >
      <div className={cn("flex flex-col gap-3 bg-neutral-1 px-6 py-3", !replie && "border-b border-line")}>
        <div className="flex min-h-10 items-center justify-between gap-4">
          <div className="flex min-w-0 sm:min-w-[240px] items-center gap-3">
            {icon && <Picto icon={icon} className="bg-white" />}
            <div className="min-w-0 sm:min-w-[240px]">
              <h2 className="text-[22px] leading-7 text-ink">{title}</h2>
              {subtitle && <p className="text-[12px] leading-4 text-ink-2">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {compteur && <span className="text-[14px] leading-5 text-ink-2">{compteur}</span>}
            {repliable && (
              <button
                type="button"
                onClick={basculer}
                aria-expanded={ouvert}
                aria-controls={corpsId}
                aria-label={`${ouvert ? "Replier" : "Déplier"} : ${title}`}
                className="inline-flex size-11 cursor-pointer items-center justify-center border border-field bg-white text-anthracite hover:bg-neutral-1"
              >
                <ChevronDown size={18} aria-hidden className={cn("transition-transform", ouvert && "rotate-180")} />
              </button>
            )}
          </div>
        </div>
        {filtre && !replie && <div className="flex flex-wrap items-center justify-start gap-3">{filtre}</div>}
      </div>
      <div id={corpsId} hidden={replie} className="min-w-0">
        {children}
      </div>
    </section>
  );
}
