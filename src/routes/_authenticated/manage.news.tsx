import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ConfirmDelete,
  ErrorSummary,
  Field,
  FormActions,
  Modal,
  RowActions,
  Select,
  TextArea,
  TextInput,
} from "@/components/manage/crud-ui";
import { Encadre } from "@/components/hp/encadre";
import { RegleEditeur } from "@/components/hp/regle-editeur";
import { HpButton } from "@/components/hp/button";
import { POINTS, TraitStatut, type Ton } from "@/components/hp/statut";
import { BarreFiltres, correspond, dansPeriode, equipesDe, type Periode } from "@/components/hp/filtres-liste";
import { Newspaper, Plus } from "lucide-react";
import { newsSchema, validate, type FieldErrors } from "@/lib/manage-schemas";
import {
  createNews,
  deleteNews,
  fetchAllNews,
  timeAgo,
  updateNews,
  type News,
  type NewsInput,
} from "@/lib/dashboard";
import { NewsImage, NewsLinks, NewsMediaEditor } from "@/components/news-media";
import { emptyMedia, linkErrors, mediaFromNews, toNewsLinks, type MediaDraft } from "@/lib/news-media";

export const Route = createFileRoute("/_authenticated/manage/news")({
  head: () => ({
    meta: [
      { title: "Gestion des actualités — Happy Place" },
      { name: "description", content: "Créez, modifiez et supprimez les actualités de Happy Place." },
      { property: "og:title", content: "Gestion des actualités — Happy Place" },
      { property: "og:description", content: "Gérez les actualités du cabinet de recrutement dans Happy Place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageNews,
});

const newsStatusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  publiée: "Publiée",
};

const tonDeStatut = (s: string): Ton => (s === "publiée" ? "vert" : "gris");

const empty: NewsInput = { title: "", body: "", author: "Direction Recrutement", status: "brouillon" };

function ManageNews() {
  const qc = useQueryClient();
  const [form, setForm] = useState<NewsInput | null>(null);
  const [editing, setEditing] = useState<News | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<News | null>(null);
  const [media, setMedia] = useState<MediaDraft>(emptyMedia);
  const [showLinkErrs, setShowLinkErrs] = useState(false);

  const list = useQuery({ queryKey: ["news", "all"], queryFn: fetchAllNews, retry: false });
  const [fQ, setFQ] = useState("");
  const [fEquipe, setFEquipe] = useState("");
  const [fPeriode, setFPeriode] = useState<Periode>("");
  const [fStatut, setFStatut] = useState("");
  const visibles = (list.data ?? []).filter(
    (n) =>
      correspond(fQ, n.title, n.body, n.author, n.author_email, n.category) &&
      (!fEquipe || n.author_team === fEquipe || (n.teams ?? []).includes(fEquipe)) &&
      (!fStatut || n.status === fStatut) &&
      dansPeriode(n.created_at, fPeriode),
  );
  const invalidate = () => qc.invalidateQueries({ queryKey: ["news"] });
  const onError = (e: unknown) => toast.error((e as Error).message);

  const save = useMutation({
    mutationFn: (input: NewsInput) =>
      editing ? updateNews(editing.id, input, media) : createNews(input, media),
    onSuccess: () => {
      toast.success(editing ? "Actualité modifiée" : "Actualité créée");
      close();
      invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (n: News) => deleteNews(n.id, n.image_path),
    onSuccess: () => {
      toast.success("Actualité supprimée");
      setToDelete(null);
      invalidate();
    },
    onError,
  });

  function close() {
    setForm(null);
    setEditing(null);
    setErrors({});
    setMedia(emptyMedia());
    setShowLinkErrs(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const res = validate(newsSchema, form);
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    setShowLinkErrs(true);
    if (Object.keys(linkErrors(media.links)).length) return;
    save.mutate({ ...res.data, links: toNewsLinks(media.links) });
  }

  return (
    <section className="space-y-6">
      <RegleEditeur />
      <Encadre
        icon={Newspaper}
        title="Actualités"
        subtitle="Toutes les actualités, brouillons compris"
        compteur={`${visibles.length} sur ${list.data?.length ?? 0}`}
        filtre={
          <div className="flex w-full flex-col gap-3">
            <BarreFiltres
              recherche={fQ}
              onRecherche={setFQ}
              placeholder="Rechercher un titre, un auteur ou un mot"
              equipe={fEquipe}
              onEquipe={setFEquipe}
              equipes={equipesDe((list.data ?? []).flatMap((n) => [n.author_team, ...(n.teams ?? [])]))}
              periode={fPeriode}
              onPeriode={setFPeriode}
              actifs={!!(fQ || fEquipe || fPeriode || fStatut)}
              onReinitialiser={() => { setFQ(""); setFEquipe(""); setFPeriode(""); setFStatut(""); }}
            >
              <select aria-label="Filtrer par statut" value={fStatut} onChange={(e) => setFStatut(e.target.value)} className="min-h-11 border border-field bg-white px-3 text-[14px] leading-5 text-ink">
                <option value="">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="publiée">Publiée</option>
              </select>
            </BarreFiltres>
          </div>
        }
      >
        <div className="flex justify-end border-b border-line px-6 py-3">
          <HpButton
            role="principal"
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setErrors({});
              setMedia(emptyMedia());
              setShowLinkErrs(false);
              setForm({ ...empty });
            }}
          >
            NOUVELLE ACTUALITÉ
          </HpButton>
        </div>

        {list.isLoading && <p className="px-6 py-4 text-[14px] leading-5 text-ink-2">Chargement…</p>}
        {list.isError && (
          <p className="px-6 py-4 text-[14px] leading-5 text-[#8E1A1F]">Impossible de charger les actualités.</p>
        )}

        <div className="divide-y divide-line">
          {visibles.map((n) => (
            <article key={n.id} className="relative flex min-w-0 flex-col items-start justify-between gap-4 overflow-hidden py-4 pr-6 pl-7 sm:flex-row">
              <TraitStatut ton={tonDeStatut(n.status)} />
              <div className="min-w-0 flex-1 space-y-2">
                {n.image_path && <NewsImage path={n.image_path} alt={n.title} />}
                <p className="text-[14px] leading-5 font-bold text-ink wrap-anywhere">{n.title}</p>
                <p className="line-clamp-2 text-[14px] leading-5 text-ink-2 wrap-anywhere">{n.body}</p>
                <NewsLinks links={n.links} />
                <p className="label inline-flex flex-wrap items-center gap-x-2 text-ink-2">
                  <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: POINTS[tonDeStatut(n.status)] }} />
                  {(newsStatusLabels[n.status] ?? n.status).toUpperCase()} · {n.author}{n.author_team ? ` · ${n.author_team}` : ""} · {timeAgo(n.created_at)}
                </p>
              </div>
              <RowActions
                onEdit={() => {
                  setEditing(n);
                  setErrors({});
                  setMedia(mediaFromNews(n));
                  setShowLinkErrs(false);
                  setForm({
                    title: n.title,
                    body: n.body ?? "",
                    author: n.author ?? "",
                    status: n.status,
                  });
                }}
                onDelete={() => setToDelete(n)}
              />
            </article>
          ))}
          {!list.isLoading && visibles.length === 0 && (
            <p className="px-6 py-6 text-[14px] leading-5 text-ink-2 italic">
              {(list.data?.length ?? 0) === 0 ? "Aucune actualité." : "Aucune actualité ne correspond à ces filtres."}
            </p>
          )}
        </div>
      </Encadre>

      {form && (
        <Modal title={editing ? "Modifier l'actualité" : "Nouvelle actualité"} onClose={close}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <ErrorSummary errors={errors} />
            <Field label="Titre" error={errors.title}>
              <TextInput
                value={form.title}
                maxLength={160}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Contenu" error={errors.body}>
              <TextArea
                rows={5}
                value={form.body}
                maxLength={5000}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
            <Field label="Image et liens">
              <NewsMediaEditor
                value={media}
                onChange={setMedia}
                linkErrs={showLinkErrs ? linkErrors(media.links) : {}}
                disabled={save.isPending}
                title={form.title}
              />
            </Field>
            <Field label="Auteur" error={errors.author}>
              <TextInput
                value={form.author}
                maxLength={80}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </Field>
            <Field label="Statut" error={errors.status}>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="brouillon">Brouillon</option>
                <option value="publiée">Publiée</option>
              </Select>
            </Field>
            <FormActions pending={save.isPending} onCancel={close} />
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDelete
          label={toDelete.title}
          pending={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete)}
        />
      )}
    </section>
  );
}
