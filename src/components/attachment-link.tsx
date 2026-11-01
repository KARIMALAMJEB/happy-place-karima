import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadAttachment } from "@/lib/dashboard";

const BUCKET = "submission-attachments";

/** Ouvre le PDF dans un nouvel onglet via une URL signée (5 min). L'onglet est
 *  ouvert immédiatement au clic pour éviter le blocage des popups. */
async function openAttachment(path: string) {
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    tab?.close();
    toast.error("Impossible d'ouvrir le document. Vérifie tes droits ou réessaie.");
    return;
  }
  if (tab) tab.location.href = data.signedUrl;
  else window.open(data.signedUrl, "_blank", "noopener");
}

export function AttachmentLink({ path, name }: { path?: string | null; name?: string | null }) {
  if (!path) return null;
  const label = name ?? "Document joint";
  return (
    <span className="inline-flex items-center gap-2 mt-2 max-w-full">
      <a
        href="#"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          void openAttachment(path);
        }}
        className="inline-flex min-w-0 items-center gap-2 text-ink underline label "
        title={`Ouvrir ${label} dans un nouvel onglet`}
      >
        <FileText size={14} aria-hidden />
        <span className="truncate">{label}</span>
      </a>
      <button
        type="button"
        aria-label={`Télécharger ${label}`}
        title="Télécharger"
        onClick={() => downloadAttachment(path, name ?? null).catch((e) => toast.error((e as Error).message))}
        className="inline-flex items-center text-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-anthracite"
      >
        <Download size={14} aria-hidden />
      </button>
    </span>
  );
}
