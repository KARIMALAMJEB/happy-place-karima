import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ExternalLink, Paperclip, Users } from "lucide-react";
import { HpPage } from "@/components/hp/page";
import { hpButtonVariants } from "@/components/hp/button";
import { RichText } from "@/components/hp/rich-text";
import { Couverture, fichiersDe, imagesDe, libellePerimetre, estEntreprise, signature } from "@/components/hp/news-shared";
import { fetchNews } from "@/lib/dashboard";
import { openNewsFile, tailleFichier, linkDisplay, type NewsLink } from "@/lib/news-media";

export const Route = createFileRoute("/_authenticated/actualites_/$id")({
  head: () => ({ meta: [{ title: "Happy Place — Actualité" }] }),
  component: Article,
});

function Article() {
  return (
    <HpPage>
      <Lecture />
    </HpPage>
  );
}

// Page de lecture d'une actualité (reprise de article-page.tsx du prototype)
function Lecture() {
  const { id } = Route.useParams();
  const router = useRouter();
  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const a = (news.data ?? []).find((n) => n.id === id);

  if (news.isLoading) return <p className="text-[14px] text-ink-2">Chargement…</p>;
  if (!a)
    return (
      <div className="flex flex-col gap-4 border border-line bg-white px-8 py-8">
        <h1 className="text-[28px] leading-9">Actualité introuvable</h1>
        <p className="text-[14px] leading-5">Cette actualité n'existe pas ou n'est pas visible avec tes droits.</p>
        <Link to="/actualites" className={hpButtonVariants({ role: "consulte" }) + " w-fit"}>
          <ArrowLeft size={16} aria-hidden />
          <span>RETOUR</span>
        </Link>
      </div>
    );

  const Icone = estEntreprise(a) ? Building2 : Users;
  const images = imagesDe(a);
  const fichiers = fichiersDe(a);
  const liens = Array.isArray(a.links) ? (a.links as NewsLink[]) : [];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-6">
        <Link
          to="/actualites"
          onClick={(e) => {
            if (router.history.canGoBack()) {
              e.preventDefault();
              router.history.back();
            }
          }}
          className={hpButtonVariants({ role: "consulte" })}
        >
          <ArrowLeft size={16} aria-hidden />
          <span>RETOUR</span>
        </Link>
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[14px] leading-5">
          <Link to="/actualites" className="inline-flex min-h-6 items-center text-ink-2 underline underline-offset-2 hover:text-ink">
            Actualités
          </Link>
          <span aria-hidden className="text-ink-2">/</span>
          <span aria-current="page" className="font-semibold">{a.title}</span>
        </nav>
      </div>
      <article className="flex flex-col border border-line bg-white">
        <Couverture path={images[0]} className="h-80" />
        {images.length > 1 && (
          <div className="grid grid-cols-2 gap-px border-b border-line bg-line">
            {images.slice(1).map((p) => (
              <Couverture key={p} path={p} className="aspect-video" />
            ))}
          </div>
        )}
        <div className="flex max-w-[80ch] flex-col gap-4 p-8">
          {a.category && <span className="label text-ink-2">{a.category}</span>}
          <h1 className="text-[32px] leading-10">{a.title}</h1>
          <p className="text-[14px] leading-5 text-ink-2">{signature(a)}</p>
          {a.body && (
            <div className="flex flex-col gap-3 text-[16px] leading-6">
              <RichText texte={a.body} />
            </div>
          )}
          {liens.length > 0 && (
            <ul className="flex flex-col gap-1 text-[14px] leading-5">
              {liens.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink">
                    {linkDisplay(l)}
                    <ExternalLink size={14} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {fichiers.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line px-8 py-4">
            <h2 className="label text-ink">Fichiers joints</h2>
            <ul className="flex flex-col gap-1 text-[14px] leading-5">
              {fichiers.map((f) => (
                <li key={f.path} className="flex items-center gap-2">
                  <Paperclip size={16} aria-hidden className="text-ink-2" />
                  <button type="button" onClick={() => void openNewsFile(f.path)} className="cursor-pointer text-left underline underline-offset-4 hover:text-anthracite">
                    {f.name}
                  </button>
                  <span className="text-[12px] leading-4 text-ink-2">· {tailleFichier(f.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="flex items-center gap-2 border-t border-line bg-neutral-1 px-8 py-4 text-[14px] leading-5">
          <Icone size={16} aria-hidden />
          Visible par : <span className="font-semibold">{libellePerimetre(a)}</span>
        </p>
      </article>
    </div>
  );
}
