import { Mail, Search } from "lucide-react";
import { useState } from "react";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { hpButtonVariants } from "@/components/hp/button";
import { TabButton, TabList } from "@/components/hp/tabs";
import { DIRECTION, EQUIPES, PERSONNES, emailDe, type Personne } from "@/lib/annuaire";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const initiales = (nom: string) =>
  nom
    .split(" ")
    .map((m) => m[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const role = (p: Personne) =>
  (p.equipesGerees && p.equipesGerees.length > 1 ? `Manager de ${p.equipesGerees.join(" et de ")}` : p.role) + (p.priseEnCharge ? " · prend en charge les blocages" : "");

const Avatar = ({ nom }: { nom: string }) => (
  <span aria-hidden className="label flex size-10 shrink-0 items-center justify-center bg-neutral-1 tracking-normal text-ink">
    {initiales(nom)}
  </span>
);

// Membre d'une carte d'équipe : le manager sur fond neutre, la personne connectée repérée par une barre gauche anthracite
function Membre({ p, moi }: { p: Personne; moi: boolean }) {
  const chef = p.role !== "Collaborateur";
  return (
    <li
      aria-current={moi ? "true" : undefined}
      className={cn("flex items-center gap-3 border-t border-line border-l-4 py-3 pr-4 pl-3", moi ? "border-l-anthracite" : "border-l-transparent", chef && "bg-neutral-1")}
    >
      <Avatar nom={p.nom} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] leading-5 font-semibold">{p.nom}</span>
        <span className="text-[12px] leading-4 text-ink-2">
          {role(p)}
          {moi && " · toi"}
        </span>
      </span>
    </li>
  );
}

const ancreEquipe = (e: string) => "equipe-" + e.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

function CarteEquipe({ equipe, membres, moi, className }: { equipe: string; membres: Personne[]; moi: string; className?: string }) {
  const tries = [...membres].sort((a, b) => Number(b.role !== "Collaborateur") - Number(a.role !== "Collaborateur"));
  return (
    <section id={ancreEquipe(equipe)} aria-label={equipe} className={cn("flex scroll-mt-24 flex-col border border-line bg-white", className)}>
      {/* Même hauteur pour toutes les cartes : nom sur 2 lignes au plus, nombre de personnes dessous */}
      <div className="flex min-h-[92px] flex-col justify-start gap-1 bg-neutral-1 px-4 py-3">
        <h2 data-titre-equipe className="text-[18px] leading-6 break-words text-anthracite">
          {equipe}
        </h2>
        <p className="text-[12px] leading-4 text-ink-2">{membres.length} pers.</p>
      </div>
      {/* Manager qui a sa fiche dans une autre équipe : rappelé sans dupliquer sa fiche */}
      {PERSONNES.filter((p) => p.equipe !== equipe && p.equipesGerees?.includes(equipe)).map((p) => (
        <p key={p.nom} className="border-t border-line bg-neutral-1 px-4 py-2 text-[12px] leading-4">
          Manager : <span className="font-semibold">{p.nom}</span> (fiche dans {p.equipe})
        </p>
      ))}
      <ul>
        {tries.map((p) => (
          <Membre key={p.nom} p={p} moi={p.nom === moi} />
        ))}
      </ul>
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/annuaire")({ component: Annuaire });

function Annuaire() {
  return (
    <HpPage>
      <DirectoryPage />
    </HpPage>
  );
}

function DirectoryPage() {
  const { fullName } = useOwnProfile();
  const profil = { nom: fullName };
  const [vue, setVue] = useState<"organigramme" | "liste">("organigramme");
  const [recherche, setRecherche] = useState("");
  const q = sansAccents(recherche.trim());
  const personnes = PERSONNES.filter((p) => !q || sansAccents(`${p.nom} ${p.equipe} ${p.role}`).includes(q));
  const direction = personnes.filter((p) => p.equipe === DIRECTION);
  const equipes = EQUIPES.filter((e) => e !== DIRECTION)
    .map((e) => ({ equipe: e, membres: personnes.filter((p) => p.equipe === e) }))
    .filter((g) => g.membres.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-6 border border-line bg-white px-8 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] leading-[44px]">Annuaire</h1>
          <p className="text-[16px] leading-6">Trouve la bonne personne et son équipe.</p>
        </div>
        <label className="relative flex items-center">
          <span className="sr-only">Rechercher une personne ou une équipe</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 text-ink-2" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, équipe ou rôle"
            className="h-11 w-72 border border-field bg-white pr-3 pl-9 text-[14px] text-ink placeholder:text-ink-2"
          />
        </label>
      </header>

      <TabList label="Affichage">
        <TabButton active={vue === "organigramme"} onClick={() => setVue("organigramme")}>ORGANIGRAMME</TabButton>
        <TabButton active={vue === "liste"} onClick={() => setVue("liste")}>LISTE</TabButton>
      </TabList>

      {personnes.length === 0 && <p className="text-[14px] text-ink-2">Aucun résultat pour « {recherche} ».</p>}

      {vue === "organigramme" && personnes.length > 0 && (
        <div className="flex flex-col items-center border border-line bg-white p-6" aria-label="Organigramme">
          {direction.length > 0 && (
            <>
              <CarteEquipe equipe={DIRECTION} membres={direction} moi={profil.nom} className="w-72" />
              {equipes.length > 0 && <span aria-hidden className="h-6 w-px bg-anthracite" />}
            </>
          )}
          {equipes.length > 0 && (
            <ul className="grid w-full gap-6" style={{ gridTemplateColumns: `repeat(${equipes.length}, minmax(0, 1fr))` }}>
              {equipes.map((g, i) => (
                <li key={g.equipe} className="flex flex-col">
                  {/* Connecteurs : ligne horizontale reliant les colonnes, puis trait vertical vers la carte */}
                  {direction.length > 0 && (
                    <span aria-hidden className="relative h-6">
                      {equipes.length > 1 && (
                        <span
                          className={cn(
                            "absolute top-0 h-px bg-anthracite",
                            i === 0 ? "right-[-12px] left-1/2" : i === equipes.length - 1 ? "right-1/2 left-[-12px]" : "right-[-12px] left-[-12px]",
                          )}
                        />
                      )}
                      <span className="absolute top-0 left-1/2 h-6 w-px bg-anthracite" />
                    </span>
                  )}
                  <CarteEquipe equipe={g.equipe} membres={g.membres} moi={profil.nom} className="flex-1" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {vue === "liste" && personnes.length > 0 && (
        <table className="w-full border border-line bg-white text-left">
          <thead>
            <tr className="border-b border-line bg-neutral-1">
              {["Nom", "Rôle", "Équipe", "Contact"].map((h) => (
                <th key={h} scope="col" className="label h-11 px-5 text-ink-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personnes.map((p) => (
              <tr key={p.nom} aria-current={p.nom === profil.nom ? "true" : undefined} className={cn("h-16 border-b border-line last:border-b-0", p.nom === profil.nom && "border-l-4 border-l-anthracite")}>
                <td className="px-5">
                  <span className="flex items-center gap-3 text-[14px] leading-5 font-semibold">
                    <Avatar nom={p.nom} />
                    {p.nom}
                  </span>
                </td>
                <td className="px-5 text-[14px] leading-5">{role(p)}</td>
                <td className="px-5 text-[14px] leading-5">{p.equipe}</td>
                <td className="px-5">
                  {/* Adresse fictive (démo) */}
                  <a href={`mailto:${emailDe(p.nom)}`} className={hpButtonVariants({ role: "consulte" })} aria-label={`Envoyer un e-mail à ${p.nom} (adresse fictive)`}>
                    <Mail size={16} aria-hidden />
                    <span>ENVOYER UN E-MAIL</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
