import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useOwnProfile } from "@/components/hp/page";
import { fetchReactionCounts, setReaction } from "@/lib/news-reactions";
import { cn } from "@/lib/utils";

// Pouces sous une actualité publiée : chacun voit son propre avis et les totaux, jamais l'avis des autres.
export function NewsAvis({ newsId }: { newsId: string }) {
  const { email } = useOwnProfile();
  const qc = useQueryClient();
  const cle = ["news-reactions", newsId];
  const q = useQuery({ queryKey: cle, queryFn: async () => (await fetchReactionCounts([newsId]))[newsId] ?? null });
  const mine = q.data?.mine ?? 0;
  const maj = useMutation({
    mutationFn: (v: -1 | 1) => setReaction(newsId, email, mine === v ? null : v),
    onSuccess: () => qc.invalidateQueries({ queryKey: cle }),
    onError: () => toast.error("Ton avis n'a pas pu être enregistré."),
  });
  const bouton = (v: -1 | 1, Icone: typeof ThumbsUp, nom: string, total: number) => (
    <button
      type="button"
      aria-pressed={mine === v}
      aria-label={`${nom} (${total})`}
      disabled={maj.isPending || !email}
      onClick={() => maj.mutate(v)}
      className={cn(
        "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 border border-line px-4 text-[14px] leading-5 font-semibold hover:bg-neutral-1",
        mine === v && "bg-anthracite text-white hover:bg-anthracite",
      )}
    >
      <Icone size={16} aria-hidden />
      <span>{total}</span>
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line px-8 py-4" role="group" aria-label="Ton avis sur cette actualité">
      <span className="label text-ink">Cette actualité t'a-t-elle été utile ?</span>
      {bouton(1, ThumbsUp, "Utile", q.data?.likes ?? 0)}
      {bouton(-1, ThumbsDown, "Pas utile", q.data?.dislikes ?? 0)}
    </div>
  );
}
