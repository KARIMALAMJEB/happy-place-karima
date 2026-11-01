import { cn } from "@/lib/utils";
import { STATE_LABEL, type RequestState } from "@/lib/requests";

// Vert et rouge réservés aux décisions (validée, refusée), ambre pour ce qui attend une action
const TON: Record<RequestState, string> = {
  en_attente: "border-[#B7791F] bg-[#FFF8E6] text-[#7A4F0B]",
  a_completer: "border-[#B7791F] bg-[#FFF8E6] text-[#7A4F0B]",
  validee: "border-[#298646] bg-[#EAF6EE] text-[#14522A]",
  refusee: "border-[#C2272D] bg-[#FDECEC] text-[#8E1A1F]",
};

export function StatutBadge({ state }: { state: RequestState }) {
  return (
    <span className={cn("label inline-flex min-h-6 items-center border px-2", TON[state])}>{STATE_LABEL[state]}</span>
  );
}

export function BloquanteMot({ bloquante }: { bloquante: boolean }) {
  return <span className="text-[12px] leading-4 text-ink-2">{bloquante ? "Bloquante" : "Non bloquante"}</span>;
}
