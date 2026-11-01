import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, CircleAlert, FileText, Image as ImageIcon, Info, Send, Trash2, Users, UsersRound, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { HpButton, HpIconButton, hpButtonVariants } from "@/components/hp/button";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { useRegle } from "@/lib/regle";
import { RichText, RichTextEditor } from "@/components/hp/rich-text";
import { supabase } from "@/integrations/supabase/client";
import { PERSONNES } from "@/lib/annuaire";
import { CATEGORIES_NEWS, fetchNews, publishDraftNews, requestNewsAuthorization, saveNewsDraft } from "@/lib/dashboard";
import {
  MAX_FICHIERS, MAX_PHOTOS, PDF_MAX_BYTES, PHOTO_MAX_BYTES, NEWS_IMAGE_TYPES, removeNewsFiles, signedNewsImageUrl, tailleFichier, uploadNewsFile,
  type NewsFile,
} from "@/lib/news-media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rediger")({
  head: () => ({ meta: [{ title: "Rédiger une actualité — Happy Place" }] }),
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({ id: typeof s.id === "string" ? s.id : undefined }),
  beforeLoad: ({ context }) => {
    // Seuls les managers et l'admin rédigent (règle déjà en vigueur dans la V1)
    if (context.role === "collaborateur") throw redirect({ to: "/" });
  },
  component: Rediger,
});

const MAX_TITRE = 120;
const champ = "min-h-11 w-full border border-field bg-white px-3 text-[14px] leading-5 text-ink";
const fichierChamp =
  "min-h-11 border border-field bg-white px-3 py-2.5 text-[14px] leading-5 file:mr-3 file:border-0 file:bg-neutral-1 file:px-3 file:py-1 file:font-label file:text-[12px] file:font-bold file:uppercase";
const BANDE = "flex items-center gap-4 border border-line border-l-4 border-l-anthracite bg-neutral-1 px-5 py-3 text-[14px] leading-5 text-ink";

type Perimetre = "equipe" | "plusieurs" | "entreprise";
type Erreurs = Partial<Record<"titre" | "corps" | "image" | "accord" | "pj" | "equipes", string>>;

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border border-line bg-white p-6">
      <h2 className="text-[22px] leading-7">{titre}</h2>
      {children}
    </section>
  );
}

function ErreurChamp({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-2 text-[12px] leading-4 font-semibold text-anthracite">
      <CircleAlert size={14} aria-hidden className="shrink-0" />
      {children}
    </p>
  );
}

// Photo d'une actualité (lien signé) ou bloc neutre avec icône quand elle est absente
function Couverture({ path, className }: { path?: string; className?: string }) {
  const q = useQuery({ queryKey: ["news-image", path], enabled: !!path, queryFn: () => signedNewsImageUrl(path!), staleTime: 50 * 60 * 1000, retry: false });
  return q.data ? (
    <img src={q.data} alt="" className={cn("w-full object-cover", className)} />
  ) : (
    <div aria-hidden className={cn("flex w-full items-center justify-center bg-neutral-1", className)}>
      <ImageIcon size={32} className="text-ink-2" />
    </div>
  );
}

function depuis(d: Date | null) {
  if (!d) return "Brouillon pas encore enregistré";
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  return min < 1 ? "Sauvegardé à l'instant" : `Sauvegardé il y a ${min} min`;
}

const dateJour = () => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date());

// Rédiger une actualité. Mon équipe et Plusieurs équipes : le manager publie seul.
// Toute l'entreprise : demande d'autorisation à un admin ; l'admin publie directement.
function Rediger() {
  const { id: idUrl } = Route.useSearch();
  const { role } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { email, fullName, team } = useOwnProfile();
  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const toutesEquipes = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("name").order("name");
      if (error) throw error;
      return (data ?? []).map((t) => t.name as string);
    },
  });
  const gerees = useQuery({
    queryKey: ["manager_teams", email],
    enabled: role === "manager",
    queryFn: async () => {
      const { data, error } = await supabase.from("manager_teams").select("team");
      if (error) throw error;
      return (data ?? []).map((t) => t.team as string);
    },
  });

  const [id, setId] = useState<string | undefined>(idUrl);
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState(role === "admin" ? "VIE DU CABINET" : "VIE D'ÉQUIPE");
  const [corps, setCorps] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [accord, setAccord] = useState(false);
  const [pjs, setPjs] = useState<NewsFile[]>([]);
  const [perimetre, setPerimetre] = useState<Perimetre>("equipe");
  const [equipeCible, setEquipeCible] = useState("");
  const [equipes, setEquipes] = useState<string[]>([]);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [sauvegarde, setSauvegarde] = useState<Date | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [, setTic] = useState(0);
  const charge = useRef(false);
  const enCreation = useRef<Promise<string> | null>(null);

  // Équipes pour lesquelles la personne publie : la sienne et celles qu'elle gère (l'admin : toutes)
  const mesEquipes = role === "admin" ? (toutesEquipes.data ?? []) : [...new Set([team, ...(gerees.data ?? [])].filter((t): t is string => !!t))];
  const toutes = toutesEquipes.data ?? [];

  // Équipe cible par défaut : celle de la personne
  useEffect(() => {
    if (!equipeCible && (team || mesEquipes[0])) setEquipeCible(team ?? mesEquipes[0]);
  }, [team, mesEquipes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reprise d'un brouillon existant
  useEffect(() => {
    if (!idUrl || !news.data || charge.current) return;
    const n = news.data.find((x) => x.id === idUrl);
    if (!n) return;
    charge.current = true;
    setTitre(n.title);
    setCorps(n.body ?? "");
    if (n.category) setCategorie(n.category);
    setPhotos(n.image_paths?.length ? n.image_paths : n.image_path ? [n.image_path] : []);
    setAccord(!!n.image_consent);
    setPjs(Array.isArray(n.attachments) ? (n.attachments as NewsFile[]) : []);
    const t = n.teams ?? [];
    if ((n.scope ?? "entreprise") === "entreprise") setPerimetre("entreprise");
    else {
      setPerimetre(t.length > 1 ? "plusieurs" : "equipe");
      if (t[0]) setEquipeCible(t[0]);
      setEquipes(t.slice(1));
    }
  }, [idUrl, news.data]);

  const accordRequis = role !== "admin" && perimetre === "entreprise";

  const enregistrer = async (idCourant: string | undefined, paths = photos, fichiers = pjs, accordImage = accord) =>
    saveNewsDraft({
      id: idCourant,
      title: titre.trim() || "Brouillon sans titre",
      body: corps,
      category: categorie,
      author: fullName,
      author_email: email,
      scope: perimetre === "entreprise" ? "entreprise" : "equipes",
      teams: perimetre === "plusieurs" ? [equipeCible, ...equipes.filter((e) => e !== equipeCible)] : [equipeCible],
      imagePaths: paths,
      imageConsent: accordImage,
      attachments: fichiers,
    });

  // Crée le brouillon au besoin (les fichiers ont besoin de l'identifiant de l'actualité), sans doublon
  const assurerBrouillon = async () => {
    if (id) return id;
    if (!enCreation.current) {
      enCreation.current = enregistrer(undefined).then((nouveau) => {
        setId(nouveau);
        return nouveau;
      });
    }
    return enCreation.current;
  };

  // Enregistrement automatique du brouillon, 1,5 s après la dernière frappe
  useEffect(() => {
    if (!titre.trim() || envoi) return;
    const t = setTimeout(async () => {
      try {
        const courant = await assurerBrouillon();
        await enregistrer(courant);
        setSauvegarde(new Date());
        qc.invalidateQueries({ queryKey: ["news"] });
      } catch {
        // l'enregistrement manuel affichera l'erreur
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [titre, categorie, corps, photos, accord, pjs, perimetre, equipes, equipeCible]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Ajoute des photos (3 maximum) ; chaque refus est expliqué
  const choisirImages = async (liste: FileList | null) => {
    if (!liste) return;
    const ok: string[] = [];
    const refus: string[] = [];
    const courant = await assurerBrouillon();
    for (const f of Array.from(liste)) {
      if (photos.length + ok.length >= MAX_PHOTOS) refus.push(`« ${f.name} » non ajoutée : 3 photos maximum.`);
      else if (!(NEWS_IMAGE_TYPES as readonly string[]).includes(f.type)) refus.push(`« ${f.name} » refusée : JPG, PNG ou WebP uniquement.`);
      else if (f.size > PHOTO_MAX_BYTES) refus.push(`« ${f.name} » refusée : elle dépasse 2 Mo.`);
      else {
        try {
          ok.push(await uploadNewsFile(courant, f));
        } catch (e) {
          refus.push(e instanceof Error ? e.message : `« ${f.name} » n'a pas pu être envoyée.`);
        }
      }
    }
    setErreurs((e) => ({ ...e, image: refus.join(" ") || undefined }));
    if (ok.length) {
      setPhotos((l) => [...l, ...ok]);
      setAccord(false);
    }
  };

  // Ajoute des PDF (4 maximum)
  const choisirPdfs = async (liste: FileList | null) => {
    if (!liste) return;
    const ok: NewsFile[] = [];
    const refus: string[] = [];
    const courant = await assurerBrouillon();
    for (const f of Array.from(liste)) {
      if (pjs.length + ok.length >= MAX_FICHIERS) refus.push(`« ${f.name} » non ajouté : 4 fichiers maximum.`);
      else if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) refus.push(`« ${f.name} » refusé : PDF uniquement.`);
      else if (f.size > PDF_MAX_BYTES) refus.push(`« ${f.name} » refusé : il dépasse 20 Mo.`);
      else {
        try {
          ok.push({ path: await uploadNewsFile(courant, f), name: f.name, size: f.size });
        } catch (e) {
          refus.push(e instanceof Error ? e.message : `« ${f.name} » n'a pas pu être envoyé.`);
        }
      }
    }
    setErreurs((e) => ({ ...e, pj: refus.join(" ") || undefined }));
    if (ok.length) setPjs((l) => [...l, ...ok]);
  };

  const retirerPhoto = (i: number) => {
    void removeNewsFiles([photos[i]]);
    setPhotos((l) => l.filter((_, k) => k !== i));
  };
  const retirerPdf = (i: number) => {
    void removeNewsFiles([pjs[i].path]);
    setPjs((l) => l.filter((_, k) => k !== i));
  };

  const brouillonSeul = async () => {
    if (!titre.trim()) return setErreurs((e) => ({ ...e, titre: "Indique un titre pour enregistrer le brouillon." }));
    try {
      const courant = await assurerBrouillon();
      await enregistrer(courant);
      setSauvegarde(new Date());
      qc.invalidateQueries({ queryKey: ["news"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'enregistrement a échoué");
    }
  };

  const envoyer = async () => {
    const err: Erreurs = {
      titre: titre.trim() ? undefined : "Indique un titre.",
      corps: corps.trim() ? undefined : "Rédige le contenu de l'actualité.",
      accord: photos.length && !accord ? "Confirme l'accord des personnes photographiées." : undefined,
      equipes: perimetre === "plusieurs" && equipes.length === 0 ? "Choisis au moins une autre équipe." : undefined,
    };
    setErreurs((e) => ({ ...e, ...err }));
    const premier = (["titre", "corps", "accord", "equipes"] as const).find((k) => err[k]);
    if (premier) return document.getElementById(premier === "equipes" ? "equipes-0" : premier)?.focus();
    setEnvoi(true);
    try {
      const courant = await assurerBrouillon();
      await enregistrer(courant);
      if (accordRequis) {
        await requestNewsAuthorization(courant);
        toast.success("Demande envoyée : un admin doit autoriser cette annonce");
      } else {
        await publishDraftNews(courant);
        toast.success("Actualité publiée");
      }
      qc.invalidateQueries({ queryKey: ["news"] });
      navigate({ to: "/", hash: "brouillons" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'envoi a échoué");
      setEnvoi(false);
    }
  };

  const autres = toutes.filter((e) => e !== equipeCible);
  const options: { valeur: Perimetre; label: string; aide: string; icon: LucideIcon }[] = [
    { valeur: "equipe", label: mesEquipes.length > 1 ? "Mon équipe" : `Mon équipe${equipeCible ? ` · ${equipeCible}` : ""}`, aide: "Tu publies directement.", icon: Users },
    { valeur: "plusieurs", label: "Plusieurs équipes", aide: "Tu publies directement pour ton équipe et celles que tu choisis.", icon: UsersRound },
    {
      valeur: "entreprise",
      label: "Toute l'entreprise",
      aide: role === "admin" ? "Tu publies directement pour toute l'entreprise." : "Pour toute l'entreprise, demande l'autorisation d'un admin.",
      icon: Building2,
    },
  ];
  const portee =
    perimetre === "entreprise"
      ? "Tous les salariés"
      : `${PERSONNES.filter((p) => p.equipe === equipeCible || (perimetre === "plusieurs" && equipes.includes(p.equipe))).length} personnes de l'annuaire de démo`;
  const regleBase = useRegle();
  const regle =
    role === "admin"
      ? "Tu publies directement, pour une équipe comme pour toute l'entreprise."
      : regleBase;
  const modification = !!idUrl;

  return (
    <HpPage>
      <header className="flex flex-col gap-4 border border-line bg-white px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[14px] leading-5">
            <Link to="/actualites" className="inline-flex min-h-6 items-center text-ink-2 underline underline-offset-2 hover:text-ink">Actualités</Link>
            <span aria-hidden className="text-ink-2">/</span>
            <Link to="/" hash="brouillons" className="inline-flex min-h-6 items-center text-ink-2 underline underline-offset-2 hover:text-ink">Mes publications</Link>
          </nav>
          <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">
            {modification ? "Modifier une actualité" : "Rédiger une actualité"}
          </h1>
          <p className="text-[14px] leading-5 text-ink-2" aria-live="polite">{depuis(sauvegarde)}</p>
        </div>
        <Link to="/" hash="brouillons" className={hpButtonVariants({ role: "consulte" })}>
          <span>ANNULER</span>
        </Link>
      </header>

      <section aria-label="Règle de publication" className={BANDE}>
        <Info size={18} aria-hidden className="shrink-0" />
        <p>
          <span className="font-semibold">Règle de publication : </span>
          {regle}
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Bloc titre="Contenu">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor="titre" className="label text-ink">Titre *</label>
                <span className="text-[12px] leading-4 text-ink-2">{titre.length} / {MAX_TITRE}</span>
              </div>
              <input id="titre" value={titre} maxLength={MAX_TITRE} onChange={(e) => setTitre(e.target.value)} aria-invalid={!!erreurs.titre} aria-describedby={erreurs.titre ? "titre-erreur" : undefined} className={champ} />
              <ErreurChamp id="titre-erreur">{erreurs.titre}</ErreurChamp>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="categorie" className="label text-ink">Catégorie</label>
              <select id="categorie" value={categorie} onChange={(e) => setCategorie(e.target.value)} className={cn(champ, "max-w-sm")}>
                {CATEGORIES_NEWS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="corps" className="label text-ink">Texte *</label>
              <RichTextEditor id="corps" rows={7} value={corps} onChange={setCorps} invalide={!!erreurs.corps} decritPar={erreurs.corps ? "corps-erreur" : undefined} />
              <ErreurChamp id="corps-erreur">{erreurs.corps}</ErreurChamp>
            </div>
          </Bloc>

          <Bloc titre="Photos et pièces jointes">
            <div className="flex flex-col gap-2">
              <label htmlFor="images" className="label text-ink">Photos du carrousel (facultatives, 3 maximum)</label>
              <p className="text-[12px] leading-4 text-ink-2">Format 16:9 conseillé · JPG, PNG ou WebP · 2 Mo maximum par photo. La première sert de couverture.</p>
              {photos.length > 0 && (
                <ul className="grid grid-cols-3 gap-3">
                  {photos.map((p, i) => (
                    <li key={p} className="flex flex-col gap-1">
                      <Couverture path={p} className="aspect-video" />
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[12px] leading-4 text-ink-2">{i === 0 ? "Couverture" : `Photo ${i + 1}`}</span>
                        <HpIconButton icon={Trash2} label={`Retirer la photo ${i + 1}`} className="border-0" onClick={() => retirerPhoto(i)} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {photos.length < MAX_PHOTOS ? (
                <input
                  id="images"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    void choisirImages(e.target.files);
                    e.target.value = "";
                  }}
                  className={fichierChamp}
                />
              ) : (
                <p className="text-[12px] leading-4 text-ink-2">3 photos ajoutées : retire une photo pour en choisir une autre.</p>
              )}
              <ErreurChamp id="image-erreur">{erreurs.image}</ErreurChamp>
            </div>
            {photos.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className="flex min-h-11 cursor-pointer items-start gap-3 border border-line px-4 py-3 hover:bg-neutral-1">
                  <input id="accord" type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-anthracite" />
                  <span className="flex flex-col gap-1">
                    <span className="text-[14px] leading-5 font-semibold">J'ai l'accord des personnes photographiées *</span>
                    <span className="text-[12px] leading-4 text-ink-2">Droit à l'image : obligatoire si des collègues sont reconnaissables, pour chacune des photos.</span>
                  </span>
                </label>
                <ErreurChamp id="accord-erreur">{erreurs.accord}</ErreurChamp>
              </div>
            )}
            <div className="flex flex-col gap-2 border-t border-line pt-5">
              <label htmlFor="pj" className="label text-ink">Fichiers joints (facultatifs, 4 maximum)</label>
              <p className="text-[12px] leading-4 text-ink-2">PDF uniquement · 20 Mo maximum par fichier.</p>
              {pjs.length > 0 && (
                <ul className="flex flex-col border border-line">
                  {pjs.map((f, i) => (
                    <li key={f.path} className="flex items-center gap-3 border-b border-line px-4 py-1 text-[14px] leading-5 last:border-b-0">
                      <FileText size={16} aria-hidden className="text-ink-2" />
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="text-[12px] leading-4 text-ink-2">{tailleFichier(f.size)}</span>
                      <HpIconButton icon={Trash2} label={`Retirer ${f.name}`} className="border-0" onClick={() => retirerPdf(i)} />
                    </li>
                  ))}
                </ul>
              )}
              {pjs.length < MAX_FICHIERS ? (
                <input
                  id="pj"
                  type="file"
                  multiple
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    void choisirPdfs(e.target.files);
                    e.target.value = "";
                  }}
                  className={fichierChamp}
                />
              ) : (
                <p className="text-[12px] leading-4 text-ink-2">4 fichiers joints : retire un fichier pour en ajouter un autre.</p>
              )}
              <ErreurChamp id="pj-erreur">{erreurs.pj}</ErreurChamp>
            </div>
          </Bloc>

          <Bloc titre="Périmètre">
            {mesEquipes.length > 1 && perimetre !== "entreprise" && (
              <label className="flex flex-col gap-2">
                <span className="label text-ink">Équipe pour laquelle tu publies</span>
                <select
                  id="equipe-cible"
                  value={equipeCible}
                  onChange={(e) => {
                    setEquipeCible(e.target.value);
                    setEquipes((l) => l.filter((x) => x !== e.target.value));
                  }}
                  className="h-11 max-w-sm border border-field bg-white px-3 text-[14px] text-ink"
                >
                  {mesEquipes.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
                <span className="text-[12px] leading-4 text-ink-2">Tu gères plusieurs équipes : choisis celle qui reçoit cette actualité.</span>
              </label>
            )}
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Qui voit cette actualité</legend>
              {options.map((o) => (
                <label
                  key={o.valeur}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 hover:bg-neutral-1",
                    perimetre === o.valeur ? "border-anthracite bg-neutral-1" : "border-line",
                  )}
                >
                  <input type="radio" name="perimetre" checked={perimetre === o.valeur} onChange={() => setPerimetre(o.valeur)} className="mt-0.5 size-5 shrink-0 accent-anthracite" />
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-[14px] leading-5 font-semibold">
                      <o.icon size={16} aria-hidden />
                      {o.label}
                    </span>
                    <span className="text-[12px] leading-4 text-ink-2">{o.aide}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            {perimetre === "plusieurs" && (
              <fieldset className="flex flex-col gap-2 bg-neutral-1 p-4">
                <legend className="label mb-2 text-ink">Équipes destinataires, en plus de {equipeCible}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {autres.map((e, i) => (
                    <label key={e} className="flex min-h-11 cursor-pointer items-center gap-3 border border-line bg-white px-3">
                      <input
                        id={`equipes-${i}`}
                        type="checkbox"
                        checked={equipes.includes(e)}
                        onChange={(ev) => setEquipes((l) => (ev.target.checked ? [...l, e] : l.filter((x) => x !== e)))}
                        className="size-5 shrink-0 accent-anthracite"
                      />
                      <span className="text-[14px] leading-5">{e}</span>
                    </label>
                  ))}
                </div>
                <ErreurChamp id="equipes-erreur">{erreurs.equipes}</ErreurChamp>
              </fieldset>
            )}
          </Bloc>

          <div className="flex flex-wrap items-center justify-end gap-4 border border-line bg-white p-6">
            <span className="mr-auto text-[12px] leading-4 text-ink-2" aria-live="polite">{depuis(sauvegarde)}</span>
            <Link to="/" hash="brouillons" className="inline-flex min-h-11 items-center text-[14px] leading-5 font-semibold text-ink underline underline-offset-4 hover:text-anthracite">Annuler</Link>
            <button type="button" onClick={() => void brouillonSeul()} className="inline-flex min-h-11 cursor-pointer items-center text-[14px] leading-5 font-semibold text-ink underline underline-offset-4 hover:text-anthracite">
              Enregistrer le brouillon
            </button>
            <HpButton role="publie" icon={Send} disabled={envoi} onClick={() => void envoyer()}>
              {accordRequis ? "DEMANDER L'ACCORD" : "PUBLIER"}
            </HpButton>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          {accordRequis && (
            <section className="flex flex-col gap-4 border border-line bg-white p-6" aria-labelledby="cycle-titre">
              <h2 id="cycle-titre" className="label-13 text-ink">CYCLE D'APPROBATION</h2>
              <div className="flex flex-col gap-1">
                <p className="text-[16px] leading-6 font-semibold">Un admin de Happy Place</p>
                <p className="text-[12px] leading-4 text-ink-2">Autorise les annonces pour toute l'entreprise</p>
              </div>
              <ol className="flex flex-col border border-line">
                {[
                  ["1. Brouillon", "Ton texte, enregistré automatiquement"],
                  ["2. En attente d'accord", "Un admin examine ta demande"],
                  ["3. Autorisée puis publiée", "Tu publies depuis Mes publications"],
                ].map(([t, d], i) => (
                  <li key={t} className={cn("flex flex-col gap-1 border-b-2 px-4 py-3 not-last:border-b-line", i === 0 ? "border-b-anthracite bg-neutral-2 [&_.text-ink-2]:text-ink" : "bg-white")}>
                    <span className="label flex items-center gap-2 text-anthracite">
                      {i === 0 && <Check size={14} aria-hidden />}
                      {t}
                    </span>
                    <span className="text-[12px] leading-4 text-ink-2">{d}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="flex flex-col border border-line bg-white" aria-label="Aperçu dans le carrousel">
            <h2 className="label-13 border-b border-line px-6 py-4 text-ink">APERÇU DANS LE CARROUSEL</h2>
            <Couverture path={photos[0]} className="aspect-video" />
            {photos.length > 1 && <p className="border-b border-line px-5 py-2 text-[12px] leading-4 text-ink-2">{photos.length} photos s'affichent côte à côte dans la diapositive</p>}
            <div className="flex flex-col gap-2 p-5">
              <span className="label text-ink-2">{categorie}</span>
              <p className="font-title text-[20px] leading-7 font-bold">{titre || "Titre de l'actualité"}</p>
              <p className="text-[12px] leading-4 text-ink-2">Par {fullName} · Publié le {dateJour()}</p>
              {corps && (
                <div className="line-clamp-4 flex flex-col gap-1 border-t border-line pt-3 text-[14px] leading-5">
                  <RichText texte={corps} />
                </div>
              )}
            </div>
            <p className="border-t border-line px-5 py-3 text-[12px] leading-4 text-ink-2">
              Portée estimée : <span className="font-semibold text-ink">{portee}</span>
            </p>
          </section>
        </aside>
      </div>
    </HpPage>
  );
}
