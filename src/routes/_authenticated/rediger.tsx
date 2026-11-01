import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HpButton } from "@/components/hp/button";
import { Encadre } from "@/components/hp/encadre";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { NewsMediaEditor } from "@/components/news-media";
import { supabase } from "@/integrations/supabase/client";
import { fetchNews, saveDraftNews } from "@/lib/dashboard";
import { emptyMedia, linkErrors, mediaFromNews, toNewsLinks, type MediaDraft } from "@/lib/news-media";

export const Route = createFileRoute("/_authenticated/rediger")({
  head: () => ({ meta: [{ title: "Rédiger une actualité — Happy Place" }] }),
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({ id: typeof s.id === "string" ? s.id : undefined }),
  beforeLoad: ({ context }) => {
    // Seuls les managers et l'admin rédigent (règle déjà en vigueur dans la V1)
    if (context.role === "collaborateur") throw redirect({ to: "/" });
  },
  component: Rediger,
});

const champ = "min-h-11 w-full border border-field bg-white px-3 text-[14px] leading-5 text-ink";

function Rediger() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { email, fullName } = useOwnProfile();
  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");
  const [media, setMedia] = useState<MediaDraft>(emptyMedia);
  const [erreurLiens, setErreurLiens] = useState(false);
  const [erreur, setErreur] = useState("");
  const [scope, setScope] = useState<"entreprise" | "equipes">("entreprise");
  const [equipes, setEquipes] = useState<string[]>([]);
  const toutesEquipes = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((t) => t.name as string);
    },
  });

  // Reprise d'un brouillon existant
  useEffect(() => {
    if (!id || !news.data) return;
    const n = news.data.find((x) => x.id === id);
    if (!n) return;
    setTitre(n.title);
    setCorps(n.body ?? "");
    setMedia(mediaFromNews(n));
    setScope(n.scope ?? "entreprise");
    setEquipes(n.teams ?? []);
  }, [id, news.data]);

  const enregistrer = useMutation({
    mutationFn: saveDraftNews,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["news"] });
      toast.success("Brouillon enregistré");
      navigate({ to: "/" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "L'enregistrement a échoué"),
  });

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (titre.trim().length < 3) return setErreur("Le titre doit faire au moins 3 caractères.");
    if (scope === "equipes" && equipes.length === 0) return setErreur("Choisis au moins une équipe, ou « Toute l'entreprise ».");
    setErreur("");
    setErreurLiens(true);
    if (Object.keys(linkErrors(media.links)).length) return setErreur("Corrige les liens invalides avant d'enregistrer.");
    enregistrer.mutate({
      id,
      title: titre.trim(),
      body: corps,
      author: fullName,
      author_email: email,
      links: toNewsLinks(media.links),
      media,
      scope,
      teams: equipes,
    });
  }

  return (
    <HpPage>
      <section className="flex flex-col gap-2 border border-line bg-white px-6 py-6 lg:px-8">
        <p className="text-[14px] leading-5 text-ink-2">
          <Link to="/" className="underline underline-offset-4 hover:text-ink">Tableau de bord</Link> · Actualité
        </p>
        <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">
          {id ? "Modifier le brouillon" : "Rédiger une actualité"}
        </h1>
      </section>
      <form onSubmit={envoyer} noValidate>
        <Encadre title="Contenu">
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="titre" className="label text-ink">Titre</label>
              <input id="titre" className={champ} value={titre} maxLength={160} onChange={(e) => setTitre(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="corps" className="label text-ink">Contenu</label>
              <textarea id="corps" className={`${champ} min-h-40 py-2`} value={corps} onChange={(e) => setCorps(e.target.value)} />
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="label mb-2 text-ink">Pour qui ?</legend>
              <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                {([
                  ["entreprise", "Toute l'entreprise", "Visible par tous les salariés."],
                  ["equipes", "Mon équipe ou mes équipes", "Visible par les équipes choisies."],
                ] as const).map(([v, l, aide]) => (
                  <label key={v} className={`flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 hover:bg-neutral-1 ${scope === v ? "border-anthracite bg-neutral-1" : "border-line"}`}>
                    <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} className="mt-0.5 size-5 shrink-0 accent-anthracite" />
                    <span className="flex flex-col gap-1">
                      <span className="text-[14px] leading-5 font-semibold">{l}</span>
                      <span className="text-[12px] leading-4 text-ink-2">{aide}</span>
                    </span>
                  </label>
                ))}
              </div>
              {scope === "equipes" && (
                <div className="flex flex-wrap gap-3" role="group" aria-label="Équipes concernées">
                  {(toutesEquipes.data ?? []).map((t) => (
                    <label key={t} className={`flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-[14px] ${equipes.includes(t) ? "border-anthracite bg-neutral-1" : "border-line"}`}>
                      <input
                        type="checkbox"
                        checked={equipes.includes(t)}
                        onChange={(e) => setEquipes((l) => (e.target.checked ? [...l, t] : l.filter((x) => x !== t)))}
                        className="size-5 accent-anthracite"
                      />
                      {t}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <NewsMediaEditor
              value={media}
              onChange={setMedia}
              linkErrs={erreurLiens ? linkErrors(media.links) : {}}
              disabled={enregistrer.isPending}
              title={titre}
            />
            {erreur && <p role="alert" className="text-[12px] font-semibold text-[#8E1A1F]">{erreur}</p>}
            <div className="flex flex-wrap gap-3">
              <HpButton type="submit" role="principal" icon={Save} disabled={enregistrer.isPending}>
                {enregistrer.isPending ? "ENREGISTREMENT…" : "ENREGISTRER LE BROUILLON"}
              </HpButton>
              <Link to="/" className="label-13 inline-flex h-11 items-center border-[1.5px] border-field bg-white px-4 text-anthracite hover:bg-neutral-1">
                ANNULER
              </Link>
            </div>
            <p className="text-[12px] leading-4 text-ink-2">Le brouillon se publie depuis « Mes brouillons », sur le tableau de bord.</p>
          </div>
        </Encadre>
      </form>
    </HpPage>
  );
}
