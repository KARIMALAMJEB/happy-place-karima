import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CategorieOutil, Ressource } from "@/lib/outils";

const sb = supabase as unknown as SupabaseClient;
const BUCKET = "toolbox-files";
export const PDF_MAX_OCTETS = 20 * 1024 * 1024;

export type RessourceDb = {
  id: string;
  category: CategorieOutil;
  title: string;
  description: string;
  scope: string;
  url: string | null;
  pdf_path: string | null;
  pdf_name: string | null;
};

// Une ressource ajoutée par l'admin se présente comme une ressource du code, avec un repère « ajoutée »
export const enRessource = (d: RessourceDb): Ressource => ({
  id: d.id,
  titre: d.title,
  description: d.description,
  categorie: d.category,
  portee: d.scope,
  url: d.url ?? undefined,
  pdfPath: d.pdf_path ?? undefined,
  ajoutee: true,
});

export async function fetchRessourcesDb(): Promise<RessourceDb[]> {
  const { data, error } = await sb.from("toolbox_resources").select("id,category,title,description,scope,url,pdf_path,pdf_name").order("created_at");
  if (error) throw error;
  return (data ?? []) as RessourceDb[];
}

export type Brouillon = {
  id?: string;
  category: CategorieOutil;
  title: string;
  description: string;
  scope: string;
  url: string;
  fichier: File | null;
  pdf_path: string | null;
  pdf_name: string | null;
  retirerPdf: boolean;
};

export async function saveRessource(b: Brouillon, par: string) {
  let pdf_path = b.retirerPdf ? null : b.pdf_path;
  let pdf_name = b.retirerPdf ? null : b.pdf_name;
  const ancien = b.pdf_path;
  if (b.fichier) {
    const path = `${crypto.randomUUID()}.pdf`;
    const up = await sb.storage.from(BUCKET).upload(path, b.fichier, { contentType: "application/pdf" });
    if (up.error) throw up.error;
    pdf_path = path;
    pdf_name = b.fichier.name;
  }
  const url = b.url.trim() || null;
  const ligne = {
    category: b.category,
    title: b.title.trim(),
    description: b.description.trim(),
    scope: b.scope,
    url: pdf_path ? null : url,
    pdf_path: url ? null : pdf_path,
    pdf_name: url ? null : pdf_name,
    updated_at: new Date().toISOString(),
  };
  const res = b.id
    ? await sb.from("toolbox_resources").update(ligne).eq("id", b.id)
    : await sb.from("toolbox_resources").insert({ ...ligne, created_by: par });
  if (res.error) {
    if (b.fichier && pdf_path) await sb.storage.from(BUCKET).remove([pdf_path]);
    throw res.error;
  }
  if (ancien && ancien !== ligne.pdf_path) await sb.storage.from(BUCKET).remove([ancien]);
}

export async function deleteRessource(id: string, pdfPath?: string | null) {
  const { error } = await sb.from("toolbox_resources").delete().eq("id", id);
  if (error) throw error;
  if (pdfPath) await sb.storage.from(BUCKET).remove([pdfPath]);
}

export async function urlPdf(path: string) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data) throw error ?? new Error("PDF introuvable");
  return data.signedUrl;
}
