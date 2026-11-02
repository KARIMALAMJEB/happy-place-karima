import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestState } from "@/lib/requests";

// Seul composant (avec les boutons Valider / Refuser) autorisé à porter rouge, vert et ambre
export const POINTS = {
  rouge: "#C2272D",
  vert: "#298646",
  ambre: "#B8651B",
  gris: "#68686D",
} as const;
export type Ton = keyof typeof POINTS;

export const tonOf = (state: RequestState, terminee?: boolean): Ton =>
  terminee ? "gris" : state === "validee" ? "vert" : state === "refusee" ? "rouge" : "ambre";

// Statut = carré de 10 px + libellé, sans cadre, sans fond, sans icône (reprise du prototype)
export function StatutBadge({ state, perspective = "neutre", terminee }: { state: RequestState; perspective?: "auteur" | "valideur" | "neutre"; terminee?: boolean }) {
  const libelle = terminee
    ? "TERMINÉE"
    : state === "validee"
      ? "VALIDÉE"
      : state === "refusee"
        ? "REFUSÉE"
        : state === "a_completer"
          ? "À COMPLÉTER"
          : perspective === "valideur"
            ? "À VALIDER"
            : "EN ATTENTE";
  return (
    <span className="label inline-flex items-center gap-2 whitespace-nowrap text-ink">
      <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: POINTS[tonOf(state, terminee)] }} />
      {libelle}
    </span>
  );
}

// Trait vertical de statut : 4 px sur le bord gauche d'une ligne ou d'une carte (parent en position relative)
export function TraitStatut({ ton }: { ton: Ton }) {
  return <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: POINTS[ton] }} />;
}

// Mot « BLOQUANTE » en anthracite avec pictogramme d'alerte : le rouge ne signifie que refus
export function BloquanteMot({ bloquante = true, className }: { bloquante?: boolean; className?: string }) {
  if (!bloquante) return <span className="text-[12px] leading-4 text-ink-2">Non bloquante</span>;
  return (
    <span className={cn("label inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-anthracite", className)}>
      <TriangleAlert size={14} aria-hidden className="shrink-0" />
      BLOQUANTE
    </span>
  );
}
