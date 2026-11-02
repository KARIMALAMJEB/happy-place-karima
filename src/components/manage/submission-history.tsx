import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSubmissionHistory } from "@/lib/dashboard";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export function SubmissionHistory({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["submissions", "history", submissionId],
    queryFn: () => fetchSubmissionHistory(submissionId),
    enabled: open,
  });
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-[11px] label uppercase text-ink-2 underline"
      >
        {open ? "▾" : "▸"} Historique
      </button>
      {open && (
        <div className="mt-2 border-l border-line pl-4 space-y-2">
          {q.isLoading && <p className="text-[14px] leading-5 text-ink-2">Chargement…</p>}
          {q.isError && <p className="text-[14px] leading-5 text-[#8E1A1F]">Impossible de charger l'historique.</p>}
          {q.data?.length === 0 && (
            <p className="text-[14px] leading-5 italic text-ink-2">Aucun changement enregistré.</p>
          )}
          {q.data?.map((h) => (
            <div key={h.id} className="text-[14px] leading-5">
              <p className="text-ink-2">
                <span className="font-bold text-ink">{fmt.format(new Date(h.changed_at))}</span>
                {" — "}
                {h.old_status ?? "Création"} → {h.new_status}
                {" — "}
                {h.is_automatic ? "Automatique" : (h.changed_by_name ?? h.changed_by_email ?? "—")}
              </p>
              {h.new_status === "refusée" && h.rejection_category && (
                <p className="text-[#8E1A1F]">
                  Motif : {h.rejection_category}
                  {h.rejection_note ? ` — ${h.rejection_note}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
