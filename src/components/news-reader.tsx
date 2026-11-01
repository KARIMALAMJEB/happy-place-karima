import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RichText } from "@/components/hp/rich-text";
import { openNewsFile, tailleFichier, type NewsFile } from "@/lib/news-media";
import { formatExactDate } from "@/components/expandable-card";
import { NewsImage, NewsLinks } from "@/components/news-media";
import type { News } from "@/lib/dashboard";

/** Fenêtre de lecture d'une actualité publiée (lecture seule, Échap, clic fond). */
export function NewsReader({ news: n, onClose }: { news: News | null; onClose: () => void }) {
  return (
    <DialogPrimitive.Root open={!!n} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        {n && (
          <DialogPrimitive.Content
            className="fixed z-50 inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[min(48rem,calc(100vw-2rem))] h-dvh md:h-auto md:max-h-[85vh] flex flex-col bg-surface-container-lowest border border-outline shadow-lg focus:outline-none"
          >
            <div className="flex items-start justify-between gap-sm border-b border-outline-variant p-md">
              <div className="min-w-0">
                <DialogPrimitive.Title className="font-headline-sm text-headline-sm text-primary wrap-anywhere">
                  {n.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="font-label-sm text-label-sm text-on-surface-variant">
                  Publiée le {formatExactDate(n.created_at)} • Par {n.author}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label="Fermer"
                className="text-on-surface-variant hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-md space-y-md">
              {n.image_path && <NewsImage path={n.image_path} alt={n.title} />}
              {(n.image_paths ?? []).slice(1).map((p) => <NewsImage key={p} path={p} alt="" />)}
              {n.body && (
                <div className="flex flex-col gap-2 text-[14px] leading-6 wrap-anywhere">
                  <RichText texte={n.body} />
                </div>
              )}
              {Array.isArray(n.attachments) && (n.attachments as NewsFile[]).length > 0 && (
                <ul className="flex flex-col gap-1">
                  {(n.attachments as NewsFile[]).map((f) => (
                    <li key={f.path}>
                      <button type="button" onClick={() => void openNewsFile(f.path)} className="text-left text-[14px] font-semibold underline underline-offset-4">
                        {f.name} <span className="font-normal text-ink-2">({tailleFichier(f.size)})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <NewsLinks links={n.links} />
            </div>
          </DialogPrimitive.Content>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
