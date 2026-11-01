import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Lock, Send, Upload, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HpButton } from "@/components/hp/button";
import { Encadre } from "@/components/hp/encadre";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { supabase } from "@/integrations/supabase/client";
import { MAX_PDF_BYTES, THEMES, VISIBILITY_LABEL, createRequest, type Theme, type Visibility } from "@/lib/requests";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/deposer")({
  head: () => ({ meta: [{ title: "Déposer une demande — Happy Place" }] }),
  component: DeposerPage,
});

const MAX_TITRE = 120;
const MAX_DESCRIPTION = 1000;
const champ = "min-h-11 w-full border border-field bg-white px-3 text-[14px] leading-5 text-ink";

function Erreur({ children }: { children?: string }) {
  return children ? <p role="alert" className="text-[12px] leading-4 font-semibold text-[#8E1A1F]">{children}</p> : null;
}

function Choix<T extends string>({ nom, valeur, options, onChange }: {
  nom: string;
  valeur: T | null;
  onChange: (v: T) => void;
  options: { valeur: T; label: string; aide: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <label
          key={o.valeur}
          className={cn(
            "flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 hover:bg-neutral-1",
            valeur === o.valeur ? "border-anthracite bg-neutral-1" : "border-line",
          )}
        >
          <input
            type="radio"
            name={nom}
            value={o.valeur}
            checked={valeur === o.valeur}
            onChange={() => onChange(o.valeur)}
            className="mt-0.5 size-5 shrink-0 accent-anthracite"
          />
          <span className="flex flex-col gap-1">
            <span className="text-[14px] leading-5 font-semibold">{o.label}</span>
            <span className="text-[12px] leading-4 text-ink-2">{o.aide}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function DeposerPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = Route.useRouteContext();
  const { fullName, email } = useOwnProfile();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [bloquante, setBloquante] = useState<"oui" | "non" | null>(null);
  const [destinataire, setDestinataire] = useState<"manager" | "admin" | null>(role === "admin" ? "admin" : null);
  const [theme, setTheme] = useState<Theme | "">("");
  const [visibilite, setVisibilite] = useState<Visibility | null>(null);
  const [confidentielle, setConfidentielle] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [equipe, setEquipe] = useState("");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  // Un manager choisit l'une de ses équipes ; collaborateur et admin : l'équipe est fixée par la base
  const equipes = useQuery({
    queryKey: ["manager_teams", "mine", email],
    enabled: role === "manager" && !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manager_teams")
        .select("team, allowed_users!inner(email)")
        .eq("allowed_users.email", email);
      if (error) throw error;
      return (data ?? []).map((t) => t.team as string).sort();
    },
  });

  const envoi = useMutation({
    mutationFn: () =>
      createRequest(
        {
          author_name: fullName,
          team: role === "collaborateur" ? "auto" : role === "admin" ? "Admin" : equipe || (equipes.data?.[0] ?? ""),
          title: titre.trim(),
          content: description.trim(),
          blocking: bloquante === "oui",
          visibility: visibilite ?? "tous",
          theme: theme || null,
          confidential_identity: confidentielle,
          validator_type: destinataire ?? "manager",
        },
        fichier,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Demande envoyée");
      navigate({ to: "/demandes" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "L'envoi a échoué"),
  });

  function valider(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (titre.trim().length < 3) err.titre = "Le titre doit faire au moins 3 caractères.";
    if (description.trim().length < 5) err.description = "Décris ta demande en 5 caractères minimum.";
    if (!bloquante) err.bloquante = "Indique si ta demande est bloquante.";
    if (!destinataire) err.destinataire = "Choisis qui doit répondre à ta demande.";
    if (!visibilite) err.visibilite = "Choisis qui peut voir ta demande.";
    if (role === "manager" && !(equipe || equipes.data?.length)) err.equipe = "Choisis une de tes équipes.";
    setErreurs(err);
    if (Object.keys(err).length) return;
    envoi.mutate();
  }

  return (
    <HpPage>
      <section className="flex flex-col gap-2 border border-line bg-white px-6 py-6 lg:px-8">
        <p className="text-[14px] leading-5 text-ink-2">
          <Link to="/demandes" className="underline underline-offset-4 hover:text-ink">Demandes</Link> · Nouvelle demande
        </p>
        <h1 className="self-start border-b-[3px] border-line pb-1 text-[28px] leading-9 lg:text-[36px] lg:leading-[44px]">
          Déposer une demande
        </h1>
      </section>

      <form onSubmit={valider} noValidate className="flex flex-col gap-6">
        <Encadre title="Ta demande">
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="titre" className="label text-ink">Titre</label>
              <input id="titre" className={champ} value={titre} maxLength={MAX_TITRE} onChange={(e) => setTitre(e.target.value)} />
              <span className="text-[12px] leading-4 text-ink-2">{titre.length} / {MAX_TITRE} caractères</span>
              <Erreur>{erreurs.titre}</Erreur>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="label text-ink">Description</label>
              <textarea
                id="description"
                className={cn(champ, "min-h-40 py-2")}
                value={description}
                maxLength={MAX_DESCRIPTION}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="text-[12px] leading-4 text-ink-2">{description.length} / {MAX_DESCRIPTION} caractères</span>
              <Erreur>{erreurs.description}</Erreur>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="theme" className="label text-ink">Thème (facultatif)</label>
              <select id="theme" className={champ} value={theme} onChange={(e) => setTheme(e.target.value as Theme | "")}>
                <option value="">Aucun thème</option>
                {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </Encadre>

        <Encadre title="Nature de la demande">
          <div className="flex flex-col gap-2 p-6">
            <Choix
              nom="bloquante"
              valeur={bloquante}
              onChange={setBloquante}
              options={[
                { valeur: "oui", label: "Bloquante", aide: "Tu ne peux pas poursuivre ton travail tant qu'elle n'est pas traitée. Après validation, un suivi s'ouvre (Ouvert, En cours, Résolu)." },
                { valeur: "non", label: "Non bloquante", aide: "Tu peux continuer à travailler en attendant." },
              ]}
            />
            <Erreur>{erreurs.bloquante}</Erreur>
          </div>
        </Encadre>

        <Encadre title="Qui répond à ta demande ?">
          <div className="flex flex-col gap-2 p-6">
            {role === "admin" ? (
              <p className="text-[14px] leading-5">En tant qu'admin, ta demande est traitée par l'administration.</p>
            ) : (
              <Choix
                nom="destinataire"
                valeur={destinataire}
                onChange={setDestinataire}
                options={[
                  { valeur: "manager", label: "Mon manager", aide: "Sujet opérationnel de ton équipe." },
                  { valeur: "admin", label: "L'administration", aide: "Sujet lié au fonctionnement de l'entreprise (cantine, outils, conditions de travail)." },
                ]}
              />
            )}
            <Erreur>{erreurs.destinataire}</Erreur>
            {role === "manager" && (
              <div className="mt-3 flex flex-col gap-2">
                <label htmlFor="equipe" className="label text-ink">Équipe concernée</label>
                <select id="equipe" className={champ} value={equipe} onChange={(e) => setEquipe(e.target.value)}>
                  <option value="">Choisir une équipe</option>
                  {(equipes.data ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Erreur>{erreurs.equipe}</Erreur>
              </div>
            )}
          </div>
        </Encadre>

        <Encadre title="Qui peut voir ta demande ?">
          <div className="flex flex-col gap-3 p-6">
            <Choix
              nom="visibilite"
              valeur={visibilite}
              onChange={setVisibilite}
              options={[
                { valeur: "tous", label: VISIBILITY_LABEL.tous, aide: "Une fois validée, tous les collaborateurs la lisent (hors identité confidentielle)." },
                { valeur: "equipe", label: VISIBILITY_LABEL.equipe, aide: "Une fois validée, seuls les membres de ton équipe la lisent." },
                { valeur: "manager", label: VISIBILITY_LABEL.manager, aide: "Seuls toi, ton manager et l'administration la lisent." },
              ]}
            />
            <Erreur>{erreurs.visibilite}</Erreur>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 border border-line px-4 py-3 hover:bg-neutral-1">
              <input
                type="checkbox"
                checked={confidentielle}
                onChange={(e) => setConfidentielle(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-anthracite"
              />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-[14px] leading-5 font-semibold"><Lock size={16} aria-hidden /> Identité confidentielle</span>
                <span className="text-[12px] leading-4 text-ink-2">
                  Les autres lecteurs verront « Auteur confidentiel ». Seul le valideur connaît ton nom et doit le garder confidentiel.
                </span>
              </span>
            </label>
          </div>
        </Encadre>

        <Encadre title="Document (facultatif)">
          <div className="flex flex-col gap-3 p-6">
            <label className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-field bg-neutral-1 px-6 py-6 text-center hover:bg-neutral-2">
              <Upload size={20} aria-hidden />
              <span className="text-[14px] leading-5">
                <span className="font-semibold underline underline-offset-4">Parcourir tes dossiers</span> pour joindre un PDF
              </span>
              <span className="text-[12px] leading-4 text-ink-2">PDF uniquement · 20 Mo maximum</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  if (!f) return;
                  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setErreurs({ ...erreurs, fichier: "Seuls les fichiers PDF sont acceptés." });
                  if (f.size > MAX_PDF_BYTES) return setErreurs({ ...erreurs, fichier: "Le fichier dépasse 20 Mo." });
                  const { fichier: _f, ...reste } = erreurs;
                  setErreurs(reste);
                  setFichier(f);
                }}
              />
            </label>
            <Erreur>{erreurs.fichier}</Erreur>
            {fichier && (
              <p className="flex items-center justify-between gap-3 border border-line px-4 py-2 text-[14px] leading-5">
                <span className="truncate">{fichier.name}</span>
                <button type="button" onClick={() => setFichier(null)} className="underline underline-offset-4 hover:text-ink">Retirer</button>
              </p>
            )}
          </div>
        </Encadre>

        <div className="flex flex-wrap items-center gap-3">
          <HpButton type="submit" role="publie" icon={Send} disabled={envoi.isPending}>
            {envoi.isPending ? "ENVOI EN COURS…" : "ENVOYER LA DEMANDE"}
          </HpButton>
          <Link to="/demandes" className="label-13 inline-flex h-11 items-center border-[1.5px] border-field bg-white px-4 text-anthracite hover:bg-neutral-1">
            ANNULER
          </Link>
        </div>
        <p className="flex items-center gap-2 text-[12px] leading-4 text-ink-2">
          <Building2 size={14} aria-hidden /> <Users size={14} aria-hidden /> Tu seras prévenu(e) par e-mail dès que ta demande reçoit une réponse.
        </p>
      </form>
    </HpPage>
  );
}
