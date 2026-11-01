import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Linkify } from "@/components/linkify";
import { piecesOf } from "@/lib/requests";
import { AttachmentLink } from "@/components/attachment-link";
import { formatExactDate } from "@/components/expandable-card";
import type { Submission } from "@/lib/dashboard";

/** Grande fenêtre de lecture d'une demande (focus piégé, Échap, clic fond). */
export function SubmissionReader({
  submission: s,
  statusLabel,
  onClose,
  onReject,
  onApprove,
  approving,
}: {
  submission: Submission | null;
  statusLabel?: string;
  onClose: () => void;
  onReject?: () => void;
  onApprove?: () => void;
  approving?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={!!s} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        {s && (
          <DialogPrimitive.Content
            className="hp-shell fixed z-50 inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[min(48rem,calc(100vw-2rem))] h-dvh md:h-auto md:max-h-[85vh] flex flex-col bg-white border border-anthracite focus:outline-none"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-6">
              <div className="min-w-0">
                <DialogPrimitive.Title className=" text-[22px] leading-7 text-ink wrap-anywhere">
                  {s.author_name}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="label  text-ink-2">
                  {s.team} • {(statusLabel ?? s.status).toUpperCase()} • Soumise le {formatExactDate(s.created_at)}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label="Fermer"
                className="text-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-anthracite"
              >
                <X size={20} aria-hidden />
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <p className="text-[14px] leading-5 text-ink whitespace-pre-line wrap-anywhere">
                <Linkify text={s.content} />
              </p>
              {piecesOf(s).map((f) => <AttachmentLink key={f.path} path={f.path} name={f.name} />)}
              {s.status === "refusée" && s.rejection_category && (
                <div className="p-4 bg-neutral-1 text-ink text-[14px] leading-5 wrap-anywhere">
                  <p className="font-bold">Motif : {s.rejection_category}</p>
                  <p className="whitespace-pre-line">Raison : <Linkify text={s.rejection_note ?? ""} /></p>
                </div>
              )}
            </div>
            {(onReject || onApprove) && (
              <div className="flex gap-2 border-t border-line p-6">
                {onReject && (
                  <button
                    type="button"
                    onClick={onReject}
                    className="flex-1 py-4 border border-field text-ink label  hover:bg-neutral-1 transition-colors"
                  >
                    REFUSER
                  </button>
                )}
                {onApprove && (
                  <button
                    type="button"
                    disabled={approving}
                    onClick={onApprove}
                    className="flex-1 py-4 bg-anthracite text-on-anthracite label  hover:opacity-90 transition-colors disabled:opacity-60"
                  >
                    VALIDER
                  </button>
                )}
              </div>
            )}
          </DialogPrimitive.Content>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
