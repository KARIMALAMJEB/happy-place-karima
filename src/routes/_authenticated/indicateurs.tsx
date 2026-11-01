import { Link, createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Eye, Plus, SquarePen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HpButton, HpIconButton, hpButtonVariants } from "@/components/hp/button";
import { Encadre } from "@/components/hp/encadre";
import { LABEL_METRIC, MetricTile, dateMaj, derniereMaj } from "@/components/hp/indicateurs";
import { HpPage } from "@/components/hp/page";
import { createMetric, deleteMetric, fetchMetrics, updateMetricRow, type Metric } from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/indicateurs")({
  head: () => ({ meta: [{ title: "Happy Place — Indicateurs" }] }),
  component: Indicateurs,
});

type Ligne = { cle: string; libelle: string; valeur: string; unite: string };
const CHAMPS: { cle: keyof Omit<Ligne, "cle">; label: string; largeur: string }[] = [
  { cle: "libelle", label: "Libellé", largeur: "w-[44%]" },
  { cle: "valeur", label: "Valeur", largeur: "w-[22%]" },
  { cle: "unite", label: "Unité", largeur: "w-[22%]" },
];
const versLignes = (l: Metric[]): Ligne[] => l.map((m) => ({ cle: m.key, libelle: LABEL_METRIC[m.key] ?? m.label, valeur: String(m.value).replace(".", ","), unite: m.unit ?? "" }));
const nombre = (v: string) => Number(v.trim().replace(",", ".").replace(/\s/g, ""));
const valides = (l: Ligne[]) => l.filter((x) => x.libelle.trim() && x.valeur.trim() && Number.isFinite(nombre(x.valeur)));
const slug = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || `indicateur_${Date.now()}`;

function Indicateurs() {
  return (
    <HpPage>
      <Page />
    </HpPage>
  );
}

function Page() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics, retry: false });
  const liste = metrics.data ?? [];
  const editable = role === "admin";
  const maj = derniereMaj(liste);
  const [brouillon, setBrouillon] = useState<Ligne[]>([]);
  const ref = JSON.stringify(versLignes(liste));
  useEffect(() => { setBrouillon(versLignes(liste)); }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps
  const modifie = JSON.stringify(brouillon) !== ref;
  const changer = (i: number, cle: keyof Ligne, valeur: string) => setBrouillon((b) => b.map((x, k) => (k === i ? { ...x, [cle]: valeur } : x)));

  const publier = useMutation({
    mutationFn: async () => {
      const lignes = valides(brouillon);
      const gardees = new Set(lignes.map((x) => x.cle).filter(Boolean));
      for (const m of liste) if (!gardees.has(m.key)) await deleteMetric(m.key);
      const utilisees = new Set(liste.map((m) => m.key));
      for (const x of lignes) {
        const input = { key: x.cle || slug(x.libelle), label: x.libelle.trim(), value: nombre(x.valeur), unit: x.unite.trim() || null };
        if (x.cle && utilisees.has(x.cle)) {
          const avant = liste.find((m) => m.key === x.cle)!;
          if (versLignes([avant])[0].libelle !== x.libelle || Number(avant.value) !== input.value || (avant.unit ?? "") !== x.unite.trim()) await updateMetricRow(x.cle, input);
        } else {
          let key = input.key;
          while (utilisees.has(key)) key = `${key}_2`;
          utilisees.add(key);
          await createMetric({ ...input, key });
        }
      }
    },
    onSuccess: () => { toast.success("Indicateurs publiés"); qc.invalidateQueries({ queryKey: ["metrics"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "La publication a échoué"),
  });

  const apercu: Metric[] = editable
    ? valides(brouillon).map((x, i) => {
        const base = liste.find((m) => m.key === x.cle);
        return { key: x.cle || `nouveau-${i}`, label: x.libelle, value: nombre(x.valeur), unit: x.unite.trim() || null, trend: base?.trend ?? "stable", previous_value: base?.previous_value ?? null, delta: base?.delta ?? null } as Metric;
      })
    : liste;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/" className={hpButtonVariants({ role: "consulte" })}>
          <ArrowLeft size={16} aria-hidden />
          <span>RETOUR AU TABLEAU DE BORD</span>
        </Link>
      </div>
      <header className="flex flex-col gap-2 border border-line bg-white px-8 py-6">
        <h1 className="text-[36px] leading-[44px]">Indicateurs de performance de l'entreprise</h1>
        <p className="text-[16px] leading-6">Ces indicateurs sont saisis à la main par l'admin. Ils s'affichent sur le tableau de bord de tous les collaborateurs.</p>
      </header>

      {metrics.isError ? (
        <p role="alert">Les indicateurs sont indisponibles.</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          {editable && (
            <Encadre icon={SquarePen} title="Saisie des indicateurs" className="lg:col-span-2">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-neutral-1">
                    {CHAMPS.map((c) => (
                      <th key={c.cle} scope="col" className={`label h-11 px-3 text-ink-2 first:pl-6 ${c.largeur}`}>{c.label}</th>
                    ))}
                    <th scope="col" className="label h-11 pr-6 text-right text-ink-2"><span className="sr-only">Supprimer</span></th>
                  </tr>
                </thead>
                <tbody>
                  {brouillon.map((x, i) => (
                    <tr key={i} className="border-b border-line">
                      {CHAMPS.map((c) => (
                        <td key={c.cle} className="px-3 py-3 first:pl-6">
                          <input
                            aria-label={`${c.label} de l'indicateur ${i + 1}`}
                            value={x[c.cle]}
                            inputMode={c.cle === "valeur" ? "decimal" : undefined}
                            onChange={(e) => changer(i, c.cle, e.target.value)}
                            className="h-11 w-full border border-field bg-white px-3 text-[14px] text-ink"
                          />
                        </td>
                      ))}
                      <td className="py-3 pr-6 text-right">
                        <HpIconButton icon={Trash2} label={`Supprimer l'indicateur ${x.libelle || i + 1}`} onClick={() => setBrouillon((b) => b.filter((_, k) => k !== i))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex px-6 py-4">
                <HpButton role="modifie" icon={Plus} onClick={() => setBrouillon((b) => [...b, { cle: "", libelle: "", valeur: "", unite: "" }])}>AJOUTER UN INDICATEUR</HpButton>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-4">
                <p className="text-[12px] leading-4 text-ink-2">{maj ? `Mis à jour le ${dateMaj(maj)}` : "Jamais mis à jour"}</p>
                <div className="flex items-center gap-3">
                  {!modifie && <span className="text-[12px] leading-4 text-ink-2">Aucune modification à publier</span>}
                  <HpButton role="consulte" disabled={!modifie} onClick={() => setBrouillon(versLignes(liste))}>ANNULER</HpButton>
                  <HpButton role="modifie" icon={Check} disabled={!modifie || publier.isPending} onClick={() => publier.mutate()}>ENREGISTRER ET PUBLIER</HpButton>
                </div>
              </div>
            </Encadre>
          )}

          <Encadre icon={Eye} title={editable ? "Aperçu côté collaborateur" : "Indicateurs clés"} subtitle="Performance de l'entreprise">
            {metrics.isLoading ? (
              <p className="px-6 py-6 text-ink-2">Chargement…</p>
            ) : apercu.length === 0 ? (
              <p className="px-6 py-6 text-[14px] leading-5 text-ink-2">Aucun indicateur.</p>
            ) : (
              <div className="flex flex-col gap-3 p-6" aria-live="polite">
                {apercu.map((m) => <MetricTile key={m.key} m={m} />)}
              </div>
            )}
            {!editable && maj && <p className="border-t border-line px-6 py-4 text-[12px] leading-4 text-ink-2">Mis à jour le {dateMaj(maj)}</p>}
          </Encadre>
        </div>
      )}
    </div>
  );
}
