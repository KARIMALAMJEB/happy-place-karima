import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDelete, Field, FormActions, Modal, Select, TextArea, TextInput } from "@/components/manage/crud-ui";
import { BOITE_A_OUTILS, type CategorieOutil } from "@/lib/outils";
import { PDF_MAX_OCTETS, deleteRessource, saveRessource, type Brouillon, type RessourceDb } from "@/lib/toolbox";
import { useOwnProfile } from "@/components/hp/page";

const vide: Brouillon = { category: "OUTILS", title: "", description: "", scope: "entreprise", url: "", fichier: null, pdf_path: null, pdf_name: null, retirerPdf: false };

export function RessourceForm({ initial, onClose }: { initial: RessourceDb | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { fullName } = useOwnProfile();
  const [b, setB] = useState<Brouillon>(
    initial
      ? { id: initial.id, category: initial.category, title: initial.title, description: initial.description, scope: initial.scope, url: initial.url ?? "", fichier: null, pdf_path: initial.pdf_path, pdf_name: initial.pdf_name, retirerPdf: false }
      : vide,
  );
  const [erreur, setErreur] = useState("");
  const [confirme, setConfirme] = useState(false);
  const equipes = useQuery({
    queryKey: ["teams-names"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("name").order("name");
      return (data ?? []).map((t) => t.name as string);
    },
  });
  const maj = <K extends keyof Brouillon>(k: K, v: Brouillon[K]) => setB((x) => ({ ...x, [k]: v }));
  const apres = () => qc.invalidateQueries({ queryKey: ["toolbox_resources"] });

  const enregistrer = useMutation({
    mutationFn: () => saveRessource(b, fullName),
    onSuccess: () => { toast.success(initial ? "Ressource modifiée" : "Ressource ajoutée"); apres(); onClose(); },
    onError: (e) => setErreur(e instanceof Error ? e.message : "L'enregistrement a échoué"),
  });
  const supprimer = useMutation({
    mutationFn: () => deleteRessource(initial!.id, initial!.pdf_path),
    onSuccess: () => { toast.success("Ressource supprimée"); apres(); onClose(); },
    onError: (e) => { setConfirme(false); setErreur(e instanceof Error ? e.message : "La suppression a échoué"); },
  });

  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (!b.title.trim()) return setErreur("Le titre est obligatoire.");
    if (b.title.trim().length > 120) return setErreur("Titre : 120 caractères maximum.");
    if (b.description.length > 300) return setErreur("Description : 300 caractères maximum.");
    const url = b.url.trim();
    if (url && !/^https?:\/\//i.test(url)) return setErreur("Le lien doit commencer par http:// ou https://.");
    if (url && (b.fichier || (b.pdf_path && !b.retirerPdf))) return setErreur("Choisis un lien ou un PDF, pas les deux.");
    if (b.fichier && b.fichier.size > PDF_MAX_OCTETS) return setErreur("Le PDF dépasse 20 Mo.");
    enregistrer.mutate();
  };

  if (confirme) return <ConfirmDelete label={initial!.title} pending={supprimer.isPending} onCancel={() => setConfirme(false)} onConfirm={() => supprimer.mutate()} />;
  const aPdf = !!b.fichier || (!!b.pdf_path && !b.retirerPdf);

  return (
    <Modal title={initial ? "Modifier la ressource" : "Ajouter une ressource"} onClose={onClose}>
      <form onSubmit={valider} className="flex flex-col gap-4">
        <Field label="TITRE"><TextInput value={b.title} maxLength={120} onChange={(e) => maj("title", e.target.value)} /></Field>
        <Field label="DESCRIPTION"><TextArea rows={3} maxLength={300} value={b.description} onChange={(e) => maj("description", e.target.value)} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="CATÉGORIE">
            <Select value={b.category} onChange={(e) => maj("category", e.target.value as CategorieOutil)}>
              {BOITE_A_OUTILS.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="PORTÉE">
            <Select value={b.scope} onChange={(e) => maj("scope", e.target.value)}>
              <option value="entreprise">Toute l'entreprise</option>
              {(equipes.data ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="LIEN (OPTIONNEL)"><TextInput type="url" placeholder="https://" value={b.url} disabled={aPdf} onChange={(e) => maj("url", e.target.value)} /></Field>
        <Field label="OU UN PDF (20 MO MAXIMUM)">
          {b.pdf_path && !b.retirerPdf && !b.fichier && (
            <p className="flex items-center gap-3 text-[14px] leading-5">
              {b.pdf_name ?? "PDF"}
              <button type="button" className="underline underline-offset-4" onClick={() => maj("retirerPdf", true)}>Retirer</button>
            </p>
          )}
          <input type="file" accept="application/pdf" disabled={!!b.url.trim()} onChange={(e) => maj("fichier", e.target.files?.[0] ?? null)} className="text-[14px]" />
        </Field>
        {erreur && <p role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">{erreur}</p>}
        <FormActions pending={enregistrer.isPending} onCancel={onClose} />
        {initial && (
          <button type="button" onClick={() => setConfirme(true)} className="self-start text-[14px] leading-5 font-semibold text-[#8E1A1F] underline underline-offset-4">
            Supprimer cette ressource
          </button>
        )}
      </form>
    </Modal>
  );
}
