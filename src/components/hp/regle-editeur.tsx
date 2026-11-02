import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Encadre } from "@/components/hp/encadre";
import { HpButton } from "@/components/hp/button";
import { REGLE_MAX, saveRegle, useRegle } from "@/lib/regle";
import { useOwnProfile } from "@/components/hp/page";

// Règle de publication : l'admin la modifie, les managers la voient telle quelle sur Actualités et Rédiger
export function RegleEditeur() {
  const qc = useQueryClient();
  const { fullName } = useOwnProfile();
  const regle = useRegle();
  const [texte, setTexte] = useState(regle);
  useEffect(() => setTexte(regle), [regle]);
  const propre = texte.trim();
  const valide = propre.length >= 1 && propre.length <= REGLE_MAX;
  const inchange = propre === regle.trim();

  const enregistrer = useMutation({
    mutationFn: () => saveRegle(propre, fullName),
    onSuccess: () => { toast.success("Règle de publication enregistrée"); qc.invalidateQueries({ queryKey: ["publication_rule"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "L'enregistrement a échoué"),
  });

  return (
    <Encadre icon={ScrollText} title="Règle de publication" subtitle="Le texte que voient les managers quand ils rédigent une actualité">
      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="regle-texte" className="label text-ink-2">TEXTE DE LA RÈGLE</label>
          <textarea
            id="regle-texte"
            rows={5}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            aria-describedby="regle-compte"
            className="border border-line bg-white p-3 text-[14px] leading-5"
          />
          <div className="flex items-center justify-between gap-4">
            <span id="regle-compte" className={propre.length > REGLE_MAX ? "text-[12px] leading-4 font-semibold text-anthracite" : "text-[12px] leading-4 text-ink-2"}>
              {propre.length} / {REGLE_MAX} caractères
            </span>
            <HpButton role="publie" disabled={!valide || inchange || enregistrer.isPending} onClick={() => enregistrer.mutate()}>
              ENREGISTRER
            </HpButton>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="label text-ink-2">APERÇU CÔTÉ MANAGER</p>
          <p className="border border-line bg-neutral-1 p-3 text-[14px] leading-5">
            <span className="font-semibold">Règle de publication : </span>
            {propre || "…"}
          </p>
        </div>
      </div>
    </Encadre>
  );
}
