import { Check, Filter, X } from "lucide-react";
import { DELAI_RELANCE, joursOuvres } from "@/components/hp/demandes-ui";
import { nonLue, stateOf, type RequestRow } from "@/lib/requests";
import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type Onglet = "mes" | "validees" | "traiter" | "decidees" | "toutes";
export type Tuile = { id: string; label: string; ton: "ambre" | "vert" | "rouge"; onglet: Onglet; n: number; garde: (r: RequestRow) => boolean };
const TRAIT = { ambre: "bg-[#B8651B]", vert: "bg-[#298646]", rouge: "bg-[#C2272D]" } as const;

// Un chiffre = une liste : chaque tuile filtre la liste qu'elle compte (même définition à l'accueil et sur Demandes)
export function buildTuiles(role: AppRole, mesL: RequestRow[], aTraiterL: RequestRow[]): Tuile[] {
  const urgent = (r: RequestRow) => joursOuvres(r.created_at) >= DELAI_RELANCE;
  const compte = (l: RequestRow[], g: (r: RequestRow) => boolean) => l.filter(g).length;
  const attente = (r: RequestRow) => stateOf(r) === "en_attente";
  if (role === "collaborateur") {
    const aTraiter = (r: RequestRow) => stateOf(r) === "a_completer" || nonLue(r);
    const validee = (r: RequestRow) => stateOf(r) === "validee";
    const refusee = (r: RequestRow) => stateOf(r) === "refusee";
    return [
      { id: "a-completer", label: "À traiter : réponses non lues et demandes à compléter", ton: "ambre", onglet: "mes", garde: aTraiter, n: compte(mesL, aTraiter) },
      { id: "attente", label: "En attente de décision", ton: "ambre", onglet: "mes", garde: attente, n: compte(mesL, attente) },
      { id: "validees", label: "Validées", ton: "vert", onglet: "mes", garde: validee, n: compte(mesL, validee) },
      { id: "refusees", label: "Refusées", ton: "rouge", onglet: "mes", garde: refusee, n: compte(mesL, refusee) },
    ];
  }
  return [
    { id: "a-valider", label: role === "manager" ? "Demandes à valider : mon équipe" : "Demandes à valider", ton: "ambre", onglet: "traiter", garde: () => true, n: aTraiterL.length },
    { id: "urgent", label: "À traiter : depuis 5 jours ouvrés ou plus", ton: "ambre", onglet: "traiter", garde: urgent, n: compte(aTraiterL, urgent) },
    { id: "mes-attente", label: "Mes demandes en attente de décision", ton: "ambre", onglet: "mes", garde: attente, n: compte(mesL, attente) },
  ];
}

export function RecapTuiles({ tuiles, actif, onChoisir }: { tuiles: Tuile[]; actif: string | null; onChoisir: (t: Tuile | null) => void }) {
  return (
    <div role="group" aria-label="Récapitulatif" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tuiles.map((t) => {
        const pris = actif === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={pris}
            aria-label={`${t.n} : ${t.label}${pris ? " (filtre actif)" : ""}`}
            onClick={() => onChoisir(pris ? null : t)}
            className={cn(
              "relative flex min-h-14 cursor-pointer items-center gap-3 border border-line py-2 pr-3 pl-5 text-left",
              pris ? "border-2 border-anthracite bg-anthracite text-white" : "bg-white hover:border-anthracite",
            )}
          >
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", TRAIT[t.ton])} />
            <span className={cn("font-title text-[20px] leading-7 font-bold", pris ? "text-white" : "text-ink")}>{t.n}</span>
            <span className={cn("flex-1 text-[12px] leading-4", pris ? "font-semibold text-white" : "text-ink-2")}>{t.label}</span>
            {pris && (
              <span aria-hidden className="flex shrink-0 items-center gap-1 text-[11px] leading-4 font-bold tracking-wide text-white uppercase">
                <Check size={14} /> Filtre actif
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Bandeau du filtre actif, placé au-dessus de la liste filtrée (accueil et page Demandes)
export function BandeauFiltre({ label, n, onRetirer }: { label: string; n?: number; onRetirer: () => void }) {
  return (
    <div role="status" className="flex w-full flex-wrap items-center justify-between gap-3 border-l-4 border-l-anthracite bg-neutral-1 px-4 py-2">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] leading-5">
        <span className="inline-flex items-center gap-1.5 bg-anthracite px-2 py-0.5 text-[11px] leading-4 font-bold tracking-wide text-white uppercase">
          <Filter size={12} aria-hidden /> Filtre actif
        </span>
        <span className="font-semibold">{label}</span>
        {n !== undefined && <span className="text-ink-2">· {n} demande{n > 1 ? "s" : ""}</span>}
      </p>
      <button
        type="button"
        onClick={onRetirer}
        className="label-13 inline-flex h-11 cursor-pointer items-center gap-1.5 border-[1.5px] border-field bg-white px-3 text-anthracite hover:bg-neutral-1"
      >
        <X size={14} aria-hidden /> RETIRER LE FILTRE
      </button>
    </div>
  );
}
