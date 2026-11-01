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
import { piecesOf } from "@/lib/requests";
import { AttachmentLink } from "@/components/attachment-link";
import { Encadre } from "@/components/hp/encadre";
import { HpButton } from "@/components/hp/button";
import { POINTS, TraitStatut, type Ton } from "@/components/hp/statut";
import { BarreFiltres, correspond, dansPeriode, equipesDe, type Periode } from "@/components/hp/filtres-liste";
import { Inbox, Plus } from "lucide-react";
import { CharCounter, rejectionErrorMessage } from "@/components/expandable-card";
import { Linkify } from "@/components/linkify";
import { SubmissionReader } from "@/components/submission-reader";
import { SubmissionHistory } from "@/components/manage/submission-history";
import { submissionSchema, validate, type FieldErrors } from "@/lib/manage-schemas";
import {
  REJECTION_CATEGORIES,
  createSubmission,
  deleteSubmission,
  fetchAllSubmissions,
  timeAgo,
  updateSubmission,
  type Submission,
  type SubmissionInput,
} from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/manage/submissions")({
  head: () => ({
    meta: [
      { title: "Gestion des demandes — Happy Place" },
      { name: "description", content: "Retrouvez, modifiez et supprimez les demandes dans Happy Place." },
      { property: "og:title", content: "Gestion des demandes — Happy Place" },
      { property: "og:description", content: "Gérez les demandes des équipes du cabinet dans Happy Place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageSubmissions,
});

const submissionStatusLabels: Record<string, string> = {
  "en attente": "En attente",
  validée: "Validée",
  refusée: "Refusée",
};

const tonDeStatut = (s: string): Ton => (s === "validée" ? "vert" : s === "refusée" ? "rouge" : "ambre");

const empty: SubmissionInput = { author_name: "", team: "", content: "", status: "en attente" };

function ManageSubmissions() {
  const qc = useQueryClient();
  const [form, setForm] = useState<SubmissionInput | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<Submission | null>(null);

  const list = useQuery({
    queryKey: ["submissions", "all"],
    queryFn: fetchAllSubmissions,
    retry: false,
  });
  const [reading, setReading] = useState<Submission | null>(null);
  const [fQ, setFQ] = useState("");
  const [fEquipe, setFEquipe] = useState("");
  const [fPeriode, setFPeriode] = useState<Periode>("");
  const [fStatut, setFStatut] = useState("");
  const visibles = (list.data ?? []).filter(
    (s) =>
      correspond(fQ, s.author_name, s.team, s.content, s.submitted_by_email) &&
      (!fEquipe || s.team === fEquipe) &&
      (!fStatut || s.status === fStatut) &&
      dansPeriode(s.created_at, fPeriode),
  );
  const invalidate = () => qc.invalidateQueries({ queryKey: ["submissions"] });
  const onError = (e: unknown) => toast.error((e as Error).message);

  const save = useMutation({
    mutationFn: (input: SubmissionInput) =>
      editing ? updateSubmission(editing.id, input) : createSubmission(input),
    onSuccess: () => {
      toast.success(editing ? "Demande modifiée" : "Demande créée");
      close();
      invalidate();
    },
    onError: (e: unknown) => toast.error(rejectionErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSubmission(id),
    onSuccess: () => {
      toast.success("Demande supprimée");
      setToDelete(null);
      invalidate();
    },
    onError,
  });

  function close() {
    setForm(null);
    setEditing(null);
    setErrors({});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const res = validate(submissionSchema, form);
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    save.mutate(res.data);
  }

  return (
    <section className="space-y-6">
      <Encadre
        icon={Inbox}
        title="Demandes"
        subtitle="Toutes les demandes déposées, quel que soit leur statut"
        compteur={`${visibles.length} sur ${list.data?.length ?? 0}`}
        filtre={
          <div className="flex w-full flex-col gap-3">
            <BarreFiltres
              recherche={fQ}
              onRecherche={setFQ}
              placeholder="Rechercher un nom, une équipe ou un mot de la demande"
              equipe={fEquipe}
              onEquipe={setFEquipe}
              equipes={equipesDe((list.data ?? []).map((s) => s.team))}
              periode={fPeriode}
              onPeriode={setFPeriode}
              actifs={!!(fQ || fEquipe || fPeriode || fStatut)}
              onReinitialiser={() => { setFQ(""); setFEquipe(""); setFPeriode(""); setFStatut(""); }}
            >
              <select aria-label="Filtrer par statut" value={fStatut} onChange={(e) => setFStatut(e.target.value)} className="min-h-11 border border-field bg-white px-3 text-[14px] leading-5 text-ink">
                <option value="">Tous les statuts</option>
                <option value="en attente">En attente</option>
                <option value="validée">Validée</option>
                <option value="refusée">Refusée</option>
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
              setForm({ ...empty });
            }}
          >
            NOUVELLE DEMANDE
          </HpButton>
        </div>

        {list.isLoading && <p className="px-6 py-4 text-[14px] leading-5 text-ink-2">Chargement…</p>}
        {list.isError && (
          <p className="px-6 py-4 text-[14px] leading-5 text-[#8E1A1F]">Impossible de charger les demandes.</p>
        )}

        <div className="divide-y divide-line">
          {visibles.map((s) => (
            <article key={s.id} className="relative flex min-w-0 flex-col items-start justify-between gap-4 overflow-hidden py-4 pr-6 pl-7 sm:flex-row">
              <TraitStatut ton={tonDeStatut(s.status)} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-5 font-bold text-ink wrap-anywhere">
                  {s.author_name} <span className="font-normal text-ink-2">· {s.team}</span>
                </p>
                <p className="mt-1 line-clamp-3 text-[14px] leading-5 whitespace-pre-line text-ink-2 italic wrap-anywhere">“<Linkify text={s.content} />”</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setReading(s)}
                    className="label text-ink underline underline-offset-2 hover:text-anthracite focus:outline-none focus-visible:ring-2 focus-visible:ring-anthracite"
                  >
                    OUVRIR
                  </button>
                  {piecesOf(s).map((f) => <AttachmentLink key={f.path} path={f.path} name={f.name} />)}
                </div>
                <p className="label mt-2 inline-flex items-center gap-2 text-ink-2">
                  <span aria-hidden className="size-2.5 shrink-0" style={{ backgroundColor: POINTS[tonDeStatut(s.status)] }} />
                  {(submissionStatusLabels[s.status] ?? s.status).toUpperCase()} · {timeAgo(s.created_at)}
                </p>
                {s.status === "refusée" && s.rejection_category && (
                  <p className="mt-2 text-[14px] leading-5 text-[#8E1A1F] wrap-anywhere">
                    Motif : {s.rejection_category} — <Linkify text={s.rejection_note ?? ""} />
                  </p>
                )}
                <SubmissionHistory submissionId={s.id} />
              </div>
              <RowActions
                onEdit={() => {
                  setEditing(s);
                  setErrors({});
                  setForm({
                    author_name: s.author_name,
                    team: s.team,
                    content: s.content,
                    status: s.status,
                    rejection_category: s.rejection_category ?? "",
                    rejection_note: s.rejection_note ?? "",
                  });
                }}
                onDelete={() => setToDelete(s)}
              />
            </article>
          ))}
          {!list.isLoading && visibles.length === 0 && (
            <p className="px-6 py-6 text-[14px] leading-5 text-ink-2 italic">
              {(list.data?.length ?? 0) === 0 ? "Aucune demande." : "Aucune demande ne correspond à ces filtres."}
            </p>
          )}
        </div>
      </Encadre>

      <SubmissionReader
        submission={reading}
        statusLabel={reading ? submissionStatusLabels[reading.status] ?? reading.status : undefined}
        onClose={() => setReading(null)}
      />
      {form && (
        <Modal title={editing ? "Modifier la demande" : "Nouvelle demande"} onClose={close}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <ErrorSummary errors={errors} />
            <Field label="Auteur" error={errors.author_name}>
              <TextInput
                value={form.author_name}
                maxLength={80}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              />
            </Field>
            <Field label="Équipe" error={errors.team}>
              <TextInput
                value={form.team}
                maxLength={60}
                placeholder="Ex. Product team, Cloud & DevOps…"
                onChange={(e) => setForm({ ...form, team: e.target.value })}
              />
            </Field>
            <Field label="Contenu" error={errors.content}>
              <TextArea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <CharCounter value={form.content} max={2000} min={5} />
            </Field>
            <Field label="Statut" error={errors.status}>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="en attente">En attente</option>
                <option value="validée">Validée</option>
                <option value="refusée">Refusée</option>
              </Select>
            </Field>
            {form.status === "refusée" && (
              <>
                <Field label="Motif du refus" error={errors.rejection_category}>
                  <Select
                    value={form.rejection_category ?? ""}
                    onChange={(e) => setForm({ ...form, rejection_category: e.target.value })}
                  >
                    <option value="">— Choisir un motif —</option>
                    {REJECTION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Raison du refus (obligatoire)" error={errors.rejection_note}>
                  <TextArea
                    rows={4}
                    value={form.rejection_note ?? ""}
                    onChange={(e) => setForm({ ...form, rejection_note: e.target.value })}
                  />
                  <CharCounter value={form.rejection_note ?? ""} max={500} />
                </Field>
              </>
            )}
            <FormActions pending={save.isPending} onCancel={close} />
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDelete
          label={toDelete.author_name}
          pending={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete.id)}
        />
      )}
    </section>
  );
}
