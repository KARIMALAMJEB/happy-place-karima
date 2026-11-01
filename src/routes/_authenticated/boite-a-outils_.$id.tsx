import { Link, createFileRoute, notFound, useRouteContext } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { ICONES_OUTILS, RESSOURCES, ressourceVisible } from "@/lib/outils";

export const Route = createFileRoute("/_authenticated/boite-a-outils_/$id")({ component: Fiche });

const libellePortee = (p: string) => (p === "entreprise" ? "Toute l'entreprise" : p);
const TEXT_LINK =
  "inline-flex h-11 items-center gap-2 px-1 text-[14px] leading-5 font-semibold whitespace-nowrap text-anthracite underline underline-offset-4 hover:text-ink";

function Fiche() {
  return (
    <HpPage>
      <Lecture />
    </HpPage>
  );
}

// Lecture d'un process ou d'un document de la Boîte à outils (visible selon la portée)
function Lecture() {
  const { id } = Route.useParams();
  const { role } = useRouteContext({ from: "/_authenticated" });
  const { team } = useOwnProfile();
  const r = RESSOURCES.find((x) => x.id === id && x.texte);
  if (!r) throw notFound();
  const visible = ressourceVisible(r, role, [team]);
  const Icone = ICONES_OUTILS[r.categorie];
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border border-line bg-white px-8 py-6">
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[14px] leading-5">
          <Link to="/boite-a-outils" className="inline-flex min-h-6 items-center text-ink-2 underline underline-offset-2 hover:text-ink">
            Boîte à outils
          </Link>
          <span aria-hidden className="text-ink-2">/</span>
          <span aria-current="page" className="font-semibold">{r.titre}</span>
        </nav>
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center bg-neutral-1">
            <Icone size={18} className="text-anthracite" />
          </span>
          <h1 className="text-[36px] leading-[44px]">{r.titre}</h1>
        </div>
        <p className="label text-ink-2">
          {r.type === "process" ? "PROCESS" : "DOCUMENT"} · {libellePortee(r.portee).toUpperCase()}
        </p>
      </header>

      {visible ? (
        <article className="flex max-w-[760px] flex-col gap-4 border border-line bg-white px-8 py-6 text-[14px] leading-6">
          <p className="font-semibold">{r.description}</p>
          <p>{r.texte}</p>
        </article>
      ) : (
        <p className="flex items-center gap-2 border border-line bg-white px-8 py-6 text-[14px] leading-5">
          <Lock size={16} aria-hidden />
          Ce contenu est réservé à l'équipe {r.portee}.
        </p>
      )}

      <Link to="/boite-a-outils" className={TEXT_LINK}>
        Retour à la Boîte à outils
      </Link>
    </div>
  );
}
