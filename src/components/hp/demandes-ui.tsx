import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BloquanteMot, StatutBadge, TraitStatut, tonOf } from "@/components/hp/statut";
import { VISIBILITY_LABEL, nonLue, refOf, remindRequest, stateOf, titleOf, type RequestRow } from "@/lib/requests";
import { cn } from "@/lib/utils";

// Tableau de demandes (reprise du prototype), partagé par la page Demandes et le tableau de bord

export const date = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));

// Jours ouvrés (lundi à vendredi) écoulés depuis une date
export function joursOuvres(depuis: string) {
  const d = new Date(depuis);
  const fin = new Date();
  let n = 0;
  for (const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); c <= fin; c.setDate(c.getDate() + 1)) {
    if (c.getDay() !== 0 && c.getDay() !== 6) n++;
  }
  return n;
}
export const DELAI_RELANCE = 5;
export const jo = (n: number) => `${n} jour${n > 1 ? "s" : ""} ouvré${n > 1 ? "s" : ""}`;

export type Perspective = "auteur" | "valideur" | "lecteur";

// Grille du prototype : Demande | Visibilité | Déposée le | Statut et nature | Action
const GRILLE =
  "grid grid-cols-[minmax(0,1fr)_176px_88px_120px_128px] gap-x-2 @min-[820px]:grid-cols-[minmax(0,1fr)_176px_104px_152px_200px] @min-[820px]:gap-x-4";

const Info = ({ children }: { children: React.ReactNode }) => <span className="text-[12px] leading-4 text-ink-2">{children}</span>;
const LIEN = "relative z-10 text-[14px] leading-5 font-semibold text-ink underline underline-offset-4 hover:text-anthracite";

function Action({ r, perspective }: { r: RequestRow; perspective: Perspective }) {
  const etat = stateOf(r);
  const qc = useQueryClient();
  const relance = useMutation({
    mutationFn: () => remindRequest(r.id),
    onSuccess: () => { toast.success("Relance envoyée"); qc.invalidateQueries({ queryKey: ["requests"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "La relance a échoué"),
  });
  const detail = { to: "/demande/$id" as const, params: { id: r.id } };
  if (perspective === "auteur") {
    if (etat === "a_completer") return <Link {...detail} className={LIEN}>Compléter</Link>;
    if (etat === "en_attente") {
      const ecoules = joursOuvres(r.reminded_at && r.reminded_at > r.created_at ? r.reminded_at : r.created_at);
      if (ecoules < DELAI_RELANCE) return <Info>{r.reminded_at ? "Relance envoyée. " : ""}Relance possible dans {jo(DELAI_RELANCE - ecoules)}</Info>;
      return (
        <button type="button" disabled={relance.isPending} onClick={() => relance.mutate()} className={LIEN}>
          Relancer
        </button>
      );
    }
  }
  return <Link {...detail} className={LIEN}>{perspective === "valideur" && etat === "en_attente" ? "Traiter" : "Consulter"}</Link>;
}

function Ligne({ r, perspective }: { r: RequestRow; perspective: Perspective }) {
  const etat = stateOf(r);
  const auteur = perspective === "auteur" ? null : r.confidential_identity && perspective === "lecteur" ? "Auteur confidentiel" : r.author_name;
  const attente = etat === "en_attente" ? joursOuvres(r.created_at) : 0;
  const nl = perspective === "auteur" && nonLue(r);
  return (
    <div role="row" className={cn(GRILLE, "relative min-h-16 items-center border-t border-line bg-white py-2 pr-4 pl-6")}>
      <TraitStatut ton={tonOf(etat, r.done && etat === "validee")} />
      <span role="cell" className="flex min-w-0 flex-col gap-0.5">
        <Link
          to="/demande/$id"
          params={{ id: r.id }}
          className={cn("block py-0.5 text-[14px] leading-5 break-words text-ink after:absolute after:inset-0 hover:underline", nl ? "font-bold" : "font-semibold")}
        >
          {titleOf(r)}
        </Link>
        <span className="text-[12px] leading-4 text-ink-2">
          {refOf(r)} · {r.team}{auteur ? ` · ${auteur}` : ""}
        </span>
        {nl && (
          <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 font-semibold text-field">
            <span aria-hidden className="size-2 bg-anthracite" />
            Réponse non lue
          </span>
        )}
      </span>
      <span role="cell" className="text-[12px] leading-4 text-ink-2">{VISIBILITY_LABEL[r.visibility]}</span>
      <span role="cell" className="text-[12px] leading-4 text-ink-2">{date(r.created_at)}</span>
      <span role="cell" className="flex flex-col items-start gap-1">
        <StatutBadge state={etat} perspective={perspective === "valideur" ? "valideur" : "auteur"} terminee={r.done && etat === "validee"} />
        {r.blocking && <BloquanteMot />}
        {perspective === "valideur" && r.reminded_at && etat === "en_attente" && <Info>Relancée le {date(r.reminded_at)}</Info>}
        {perspective === "valideur" && attente >= DELAI_RELANCE && <Info>À traiter : depuis {jo(attente)}</Info>}
      </span>
      <span role="cell"><Action r={r} perspective={perspective} /></span>
    </div>
  );
}

export function Tableau({ lignes, perspective, vide }: { lignes: RequestRow[]; perspective: Perspective; vide: string }) {
  return (
    <div role="table" aria-label="Demandes" className="@container flex flex-col">
      <div role="row" className={cn(GRILLE, "label min-h-11 items-center border-t border-line bg-neutral-1 pr-4 pl-6 text-ink-2")}>
        <span role="columnheader">Demande</span>
        <span role="columnheader">Visibilité</span>
        <span role="columnheader">Déposée le</span>
        <span role="columnheader">Statut et nature</span>
        <span role="columnheader">Action</span>
      </div>
      {lignes.length === 0 ? (
        <p className="flex min-h-16 items-center border-t border-line px-6 text-[14px] leading-5 text-ink-2">{vide}</p>
      ) : (
        lignes.map((r) => <Ligne key={r.id} r={r} perspective={perspective} />)
      )}
    </div>
  );
}

