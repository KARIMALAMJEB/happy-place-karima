import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Check, Download, ExternalLink, FileText, Image as ImageIcon, Link2, Paperclip, Pencil, Plus, Trash2, Upload, X, type LucideIcon } from "lucide-react";
import {
  MAX_NEWS_LINKS,
  NEWS_IMAGE_TYPES,
  imageError,
  linkDisplay,
  signedNewsImageUrl,
  type MediaDraft,
  type NewsLink,
} from "@/lib/news-media";

const ICONES: Record<string, LucideIcon> = {
  open_in_new: ExternalLink, close: X, add: Plus, delete: Trash2, image: ImageIcon, link: Link2, upload: Upload,
  add_photo_alternate: ImageIcon, error: AlertCircle, check: Check, edit: Pencil, attach_file: Paperclip, picture_as_pdf: FileText, download: Download,
};
function I({ name, className = "" }: { name: string; className?: string }) {
  const Icone = ICONES[name] ?? ImageIcon;
  const px = /text-\[(\d+)px\]/.exec(className)?.[1];
  return <Icone aria-hidden size={px ? Number(px) : 16} className={className.replace(/text-\[\d+px\]/, "").trim()} />;
}

export function NewsImage({ path, alt, className = "" }: { path: string; alt: string; className?: string }) {
  const q = useQuery({ queryKey: ["news-image", path], queryFn: () => signedNewsImageUrl(path), staleTime: 50 * 60 * 1000, retry: false });
  if (!q.data) return null;
  return <img src={q.data} alt={alt} className={`w-full max-h-60 object-cover border border-line ${className}`} />;
}

export function NewsLinks({ links }: { links: unknown }) {
  const list = Array.isArray(links) ? (links as NewsLink[]) : [];
  if (!list.length) return null;
  return (
    <ul className="space-y-1 min-w-0">
      {list.map((l, i) => (
        <li key={i} className="min-w-0">
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-start gap-1 max-w-full text-ink underline underline-offset-2 text-[14px] leading-5 wrap-anywhere"
          >
            <span className="wrap-anywhere">{linkDisplay(l)}</span>
            <I name="open_in_new" className="text-[14px] shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Boutons et champs « Ajouter un média » / « Ajouter un lien » d'un formulaire d'actualité. */
export function NewsMediaEditor({
  value,
  onChange,
  linkErrs,
  disabled,
  title,
}: {
  value: MediaDraft;
  onChange: (v: MediaDraft) => void;
  linkErrs: Record<number, string>;
  disabled?: boolean;
  title: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const preview = useMemo(() => (value.file ? URL.createObjectURL(value.file) : null), [value.file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const showExisting = !value.file && value.existingPath && !value.removeExisting;
  const hasImage = !!value.file || !!showExisting;
  const full = value.links.length >= MAX_NEWS_LINKS;

  const pick = () => input.current?.click();

  return (
    <div className="space-y-4 min-w-0">
      <input
        ref={input}
        type="file"
        accept={NEWS_IMAGE_TYPES.join(",")}
        className="hidden"
        data-testid="news-image-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const err = imageError(f);
          setImgError(err);
          if (err) { toast.error(err); return; }
          onChange({ ...value, file: f });
        }}
      />
      {hasImage && (
        <div className="space-y-2">
          {preview ? (
            <img src={preview} alt={title || "Aperçu de l'image"} className="w-full max-w-xs max-h-40 object-cover border border-line" />
          ) : (
            showExisting && <NewsImage path={value.existingPath!} alt={title || "Image de l'actualité"} className="max-w-xs max-h-40" />
          )}
          <div className="flex gap-4">
            <button type="button" disabled={disabled} onClick={pick} className="label  text-ink underline disabled:opacity-50">Remplacer</button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...value, file: null, removeExisting: !!value.existingPath })}
              className="label  text-[#8E1A1F] underline disabled:opacity-50"
            >
              Retirer
            </button>
          </div>
        </div>
      )}
      {imgError && <p role="alert" className="text-[14px] leading-5 text-[#8E1A1F]">{imgError}</p>}

      {value.links.map((l, i) => (
        <div key={i} className="space-y-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <input
              aria-label={`Adresse du lien ${i + 1}`}
              placeholder="https://…"
              maxLength={2000}
              value={l.url}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, links: value.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
              className="min-w-0 flex-[2] bg-white border border-line p-2 text-[14px] leading-5 focus:outline-none focus:border-anthracite"
            />
            <div className="flex gap-2 min-w-0 flex-1">
              <input
                aria-label={`Libellé du lien ${i + 1} (facultatif)`}
                placeholder="Libellé (facultatif)"
                maxLength={80}
                value={l.label}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, links: value.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                className="min-w-0 flex-1 bg-white border border-line p-2 text-[14px] leading-5 focus:outline-none focus:border-anthracite"
              />
              <button
                type="button"
                aria-label={`Retirer le lien ${i + 1}`}
                disabled={disabled}
                onClick={() => onChange({ ...value, links: value.links.filter((_, j) => j !== i) })}
                className="text-ink-2 hover:text-[#8E1A1F]"
              >
                <I name="close" />
              </button>
            </div>
          </div>
          {linkErrs[i] && <p role="alert" className="text-[14px] leading-5 text-[#8E1A1F]">{linkErrs[i]}</p>}
        </div>
      ))}

      <div className="flex flex-wrap gap-4 items-center">
        <button
          type="button"
          disabled={disabled}
          onClick={pick}
          className="text-ink-2 flex items-center gap-2 hover:text-ink transition-colors disabled:opacity-50"
        >
          <I name="image" /> <span className="label ">{hasImage ? "CHANGER LE MÉDIA" : "AJOUTER UN MÉDIA"}</span>
        </button>
        <button
          type="button"
          disabled={disabled || full}
          title={full ? "3 liens maximum" : undefined}
          onClick={() => onChange({ ...value, links: [...value.links, { url: "", label: "" }] })}
          className="text-ink-2 flex items-center gap-2 hover:text-ink transition-colors disabled:opacity-50 disabled:hover:text-ink-2"
        >
          <I name="link" /> <span className="label ">AJOUTER UN LIEN</span>
        </button>
        {full && <span className="label  text-ink-2">3 liens maximum</span>}
      </div>
    </div>
  );
}
