import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { HpButton } from "@/components/hp/button";
import {
  downloadAttachment,
  downloadDepartureZip,
  fetchMyDepartureNotices,
  markDepartureNoticeDownloaded,
  type DepartureNotice,
} from "@/lib/dashboard";

const frDate = (iso: string) => new Intl.DateTimeFormat("fr-FR").format(new Date(iso));
const frDay = (ymd: string) => ymd.split("-").reverse().join("/");

export function DepartureNotices({ email }: { email: string }) {
  const q = useQuery({
    queryKey: ["departure_notices", email.toLowerCase()],
    queryFn: () => fetchMyDepartureNotices(email),
  });
  if (!q.data?.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {q.data.map((n) => (
        <NoticeBanner key={n.id} notice={n} email={email} />
      ))}
    </div>
  );
}

function NoticeBanner({ notice: n, email }: { notice: DepartureNotice; email: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [zipping, setZipping] = useState(false);
  const count = n.documents.length;
  const reminder = !!n.reminder_at;
  const deleteOn = new Date(new Date(n.created_at).getTime() + 7 * 86400000).toISOString();
  const text =
    count === 0
      ? n.kind === "préavis"
        ? `${n.departing_label} quitte Happy Place le ${frDay(n.departure_date)}. Aucun document à télécharger.`
        : `${n.departing_label} a quitté Happy Place. Aucun document à télécharger.`
      : n.kind === "préavis"
        ? `${n.departing_label} quitte Happy Place le ${frDay(n.departure_date)} : ${count} document(s) joint(s) à ses demandes seront alors supprimés.`
        : `${n.departing_label} a quitté Happy Place : ${count} document(s) joint(s) à ses demandes seront supprimés le ${frDate(deleteOn)}`;

  const mark = useMutation({
    mutationFn: () => markDepartureNoticeDownloaded(n.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departure_notices", email.toLowerCase()] }),
    onError: (e) => toast.error((e as Error).message),
  });

  async function zipAll() {
    setZipping(true);
    try {
      await downloadDepartureZip(n);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setZipping(false);
    }
  }

  return (
    <div
      role={reminder ? "alert" : "status"}
      className="flex flex-col gap-3 border border-line border-l-4 border-l-anthracite bg-neutral-1 px-6 py-4"
    >
      <p className="text-[14px] leading-5">
        {reminder && <strong>Rappel : </strong>}
        {text}
      </p>
      <div className="flex flex-wrap gap-3">
        {count > 0 && (
          <>
            <HpButton role="consulte" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? "MASQUER LES DOCUMENTS" : "VOIR LES DOCUMENTS"}
            </HpButton>
            <HpButton role="consulte" onClick={zipAll} disabled={zipping}>
              {zipping ? "PRÉPARATION…" : "TOUT TÉLÉCHARGER (.ZIP)"}
            </HpButton>
          </>
        )}
        <HpButton role="modifie" onClick={() => mark.mutate()} disabled={mark.isPending}>
          {count > 0 ? "J'AI TÉLÉCHARGÉ LES DOCUMENTS" : "J'AI PRIS NOTE"}
        </HpButton>
      </div>
      {open && (
        <ul className="flex flex-col gap-1 border-t border-line pt-3">
          {n.documents.map((d) => (
            <li key={d.path} className="flex flex-wrap items-center justify-between gap-3 text-[14px] leading-5">
              <span>
                <span className="font-semibold">{frDate(d.created_at)}</span> — {d.excerpt}
              </span>
              <button
                type="button"
                className="inline-flex h-11 cursor-pointer items-center px-1 text-[14px] leading-5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink"
                onClick={() => downloadAttachment(d.path, d.name).catch((e) => toast.error((e as Error).message))}
              >
                Télécharger
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
