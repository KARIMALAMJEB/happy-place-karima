import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Clock, FileText, Lock, Send, Trash2, TriangleAlert, Upload, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { HpButton, HpIconButton } from "@/components/hp/button";
import { RichTextEditor } from "@/components/hp/rich-text";
import { HpPage, useOwnProfile } from "@/components/hp/page";
import { ReglesArbitrage } from "@/components/hp/regles";
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

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border border-line bg-white p-6">
      <h2 className="text-[22px] leading-7">{titre}</h2>
      {children}
    </section>
  );
}

const Compteur = ({ n, max }: { n: number; max: number }) => <span className="text-[12px] leading-4 text-ink-2">{n} / {max} caractères</span>;
const LIEN = "inline-flex h-11 items-center px-1 text-[14px] leading-5 font-semibold whitespace-nowrap text-anthracite underline underline-offset-4 hover:text-ink cursor-pointer";

// Choix exclusif en cartes (radio natif, libellé + phrase d'aide)
function Choix<T extends string>({ nom, valeur, options, onChange, erreur }: {
  nom: string;
  valeur: T | null;
  onChange: (v: T) => void;
  erreur?: boolean;
  options: { valeur: T; label: string; aide: string; icon: LucideIcon }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <label
          key={o.valeur}
          className={cn(
            "flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 hover:bg-neutral-1",
            valeur === o.valeur ? "border-anthracite bg-neutral-1" : erreur ? "border-anthracite" : "border-line",
          )}
        >
          <input type="radio" name={nom} value={o.valeur} checked={valeur === o.valeur} onChange={() => onChange(o.valeur)} className="mt-0.5 size-5 shrink-0 accent-anthracite" />
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-[14px] leading-5 font-semibold">
              <o.icon size={16} aria-hidden />
              {o.label}
            </span>
            <span className="text-[12px] leading-4 text-ink-2">{o.aide}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

const taille = (o: number) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`);

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

  // Brouillon : enregistré automatiquement dans ce navigateur (par compte), repris à la réouverture
  const cle = `hp-brouillon-demande:${email}`;
  const [repris, setRepris] = useState(false);
  const charge = useRef(false);
  useEffect(() => {
    if (!email || charge.current) return;
    charge.current = true;
    try {
      const b = JSON.parse(localStorage.getItem(cle) ?? "null");
      if (b) {
        setTitre(b.titre ?? ""); setDescription(b.description ?? ""); setBloquante(b.bloquante ?? null);
        if (role !== "admin") setDestinataire(b.destinataire ?? null);
        setTheme(b.theme ?? ""); setVisibilite(b.visibilite ?? null); setConfidentielle(!!b.confidentielle);
        setRepris(true);
      }
    } catch { /* stockage indisponible : pas de brouillon */ }
  }, [email, cle, role]);
  useEffect(() => {
    if (!email || !charge.current) return;
    const vide = !titre && !description && !bloquante && !theme && !visibilite;
    try {
      if (vide) localStorage.removeItem(cle);
      else localStorage.setItem(cle, JSON.stringify({ titre, description, bloquante, destinataire, theme, visibilite, confidentielle }));
    } catch { /* ignoré */ }
  }, [email, cle, titre, description, bloquante, destinataire, theme, visibilite, confidentielle]);
  function effacerBrouillon() {
    setTitre(""); setDescription(""); setBloquante(null); setTheme(""); setVisibilite(null); setConfidentielle(false);
    if (role !== "admin") setDestinataire(null);
    setRepris(false);
    try { localStorage.removeItem(cle); } catch { /* ignoré */ }
  }

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
      try { localStorage.removeItem(cle); } catch { /* ignoré */ }
      toast.success("Demande envoyée");
      navigate({ to: "/demandes" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "L'envoi a échoué"),
  });

  function valider(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (titre.trim().length < 3) err.titre = "Indique un titre.";
    if (description.trim().length < 5) err.description = "Décris ta demande.";
    if (!bloquante) err.bloquante = "Choisis la nature de ta demande.";
    if (!destinataire) err.destinataire = "Choisis qui valide cette demande.";
    if (!visibilite) err.visibilite = "Choisis qui peut voir cette demande.";
    if (role === "manager" && !(equipe || equipes.data?.length)) err.equipe = "Choisis une de tes équipes.";
    setErreurs(err);
    if (Object.keys(err).length) return;
    envoi.mutate();
  }

  const [survol, setSurvol] = useState(false);
  const ajouterPdf = (liste: FileList | null) => {
    const f = liste?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setErreurs({ ...erreurs, fichier: `« ${f.name} » refusé : seuls les fichiers PDF sont acceptés.` });
    if (f.size > MAX_PDF_BYTES) return setErreurs({ ...erreurs, fichier: `« ${f.name} » refusé : il dépasse 20 Mo.` });
    const { fichier: _f, ...reste } = erreurs;
    setErreurs(reste);
    setFichier(f);
  };
  const [message, setMessage] = useState("");
  const enregistrerBrouillon = () => {
    try { localStorage.setItem(cle, JSON.stringify({ titre, description, bloquante, destinataire, theme, visibilite, confidentielle })); } catch { /* ignoré */ }
    setMessage(`Brouillon enregistré à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`);
  };
  const nomValideur = destinataire === "admin" ? "L'administration" : destinataire === "manager" ? "Ton manager" : undefined;

  return (
    <HpPage>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 border border-line bg-white px-8 py-6">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-[14px] leading-5">
            <Link to="/demandes" className="inline-flex min-h-6 items-center text-ink-2 underline underline-offset-2 hover:text-ink">Mes demandes</Link>
            <span aria-hidden className="text-ink-2">/</span>
            <span aria-current="page" className="font-semibold">Déposer une demande</span>
          </nav>
          <h1 className="text-[36px] leading-[44px]">Déposer une demande</h1>
          <p className="text-[16px] leading-6">
            Demande au nom de <span className="font-semibold">{fullName}</span>{role === "admin" ? " · Admin" : ""}
          </p>
        </header>

        <form onSubmit={valider} noValidate className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {repris && (
              <p role="status" className="flex flex-wrap items-center justify-between gap-3 border border-line border-l-4 border-l-anthracite bg-neutral-1 px-4 py-3 text-[14px] leading-5">
                <span>Brouillon repris : ton texte est enregistré automatiquement sur cet appareil.</span>
                <button type="button" onClick={effacerBrouillon} className={LIEN}>Effacer le brouillon</button>
              </p>
            )}
            <Bloc titre="Ta demande">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor="titre" className="label text-ink">Titre *</label>
                  <Compteur n={titre.length} max={MAX_TITRE} />
                </div>
                <input id="titre" className={champ} value={titre} maxLength={MAX_TITRE} aria-invalid={!!erreurs.titre} onChange={(e) => setTitre(e.target.value)} />
                <Erreur>{erreurs.titre}</Erreur>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor="description" className="label text-ink">Description *</label>
                  <Compteur n={description.length} max={MAX_DESCRIPTION} />
                </div>
                <RichTextEditor id="description" rows={5} maxLength={MAX_DESCRIPTION} value={description} onChange={setDescription} invalide={!!erreurs.description} />
                <Erreur>{erreurs.description}</Erreur>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <fieldset className="col-span-2 flex flex-col gap-2">
                  <legend className="label mb-2 text-ink">Nature <span aria-hidden>*</span><span className="sr-only">(obligatoire)</span></legend>
                  <div role="radiogroup" aria-required="true" aria-invalid={!!erreurs.bloquante} className="grid grid-cols-2 gap-3">
                    {([
                      { v: "oui" as const, l: "BLOQUANTE", aide: "Tu ne peux pas poursuivre ton travail tant qu'elle n'est pas traitée. Après validation, un suivi s'ouvre (Ouvert, En cours, Résolu).", icone: TriangleAlert },
                      { v: "non" as const, l: "NON BLOQUANTE", aide: "Tu peux continuer à travailler en attendant.", icone: Clock },
                    ]).map(({ v, l, aide, icone: Icone }) => (
                      <label key={v} className={cn("flex min-h-11 cursor-pointer items-start gap-3 border px-4 py-3 hover:bg-neutral-1", bloquante === v ? "border-anthracite bg-neutral-1" : erreurs.bloquante ? "border-anthracite" : "border-line")}>
                        <input type="radio" name="bloquante" checked={bloquante === v} onChange={() => setBloquante(v)} aria-required="true" className="mt-0.5 size-5 shrink-0 accent-anthracite" />
                        <span className="flex flex-col gap-1">
                          <span className="label flex items-center gap-2 text-anthracite"><Icone size={16} aria-hidden />{l}</span>
                          <span className="text-[12px] leading-4 text-ink-2">{aide}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[12px] leading-4 text-ink-2">* Obligatoire : choisis la nature de ta demande.</p>
                  <Erreur>{erreurs.bloquante}</Erreur>
                </fieldset>
                <div className="flex flex-col gap-2">
                  <label htmlFor="theme" className="label text-ink">Thème (facultatif)</label>
                  <select id="theme" className={champ} value={theme} onChange={(e) => setTheme(e.target.value as Theme | "")}>
                    <option value="">Aucun</option>
                    {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </Bloc>

            <Bloc titre="Qui peut voir cette demande ? *">
              <Choix
                nom="visibilite"
                valeur={visibilite}
                erreur={!!erreurs.visibilite}
                onChange={setVisibilite}
                options={[
                  { valeur: "tous", label: "Tous", aide: "Une fois validée, tous les salariés la lisent (hors identité confidentielle).", icon: Building2 },
                  { valeur: "equipe", label: "Mon équipe", aide: "Une fois validée, seuls les membres de ton équipe la lisent.", icon: Users },
                  { valeur: "manager", label: "Mon manager uniquement", aide: "Seuls toi, ton manager et l'administration la lisent.", icon: Lock },
                ]}
              />
              <Erreur>{erreurs.visibilite}</Erreur>
              <p className="bg-neutral-1 px-4 py-3 text-[14px] leading-5 font-semibold">Tu ne pourras plus modifier la visibilité après l'envoi.</p>
            </Bloc>

            <Bloc titre="Qui valide cette demande ? *">
              {role === "admin" ? (
                <p className="text-[14px] leading-5">En tant qu'admin, ta demande est traitée par l'administration.</p>
              ) : (
                <Choix
                  nom="destinataire"
                  valeur={destinataire}
                  erreur={!!erreurs.destinataire}
                  onChange={setDestinataire}
                  options={[
                    { valeur: "manager", label: "Mon manager", aide: "Pour un sujet de travail au quotidien.", icon: Users },
                    { valeur: "admin", label: "L'admin", aide: "Pour un sujet de fonctionnement de l'entreprise (cantine, outils, conditions de travail).", icon: Building2 },
                  ]}
                />
              )}
              <Erreur>{erreurs.destinataire}</Erreur>
              {role === "manager" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="equipe" className="label text-ink">Équipe concernée *</label>
                  <select id="equipe" className={champ} value={equipe} onChange={(e) => setEquipe(e.target.value)}>
                    <option value="">Choisir une équipe</option>
                    {(equipes.data ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Erreur>{erreurs.equipe}</Erreur>
                </div>
              )}
              <label className="flex min-h-11 cursor-pointer items-start gap-3 border border-line px-4 py-3 hover:bg-neutral-1">
                <input type="checkbox" checked={confidentielle} onChange={(e) => setConfidentielle(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-anthracite" />
                <span className="flex flex-col gap-1">
                  <span className="text-[14px] leading-5 font-semibold">Identité confidentielle</span>
                  <span className="text-[12px] leading-4 text-ink-2">
                    Les autres lecteurs voient « Auteur confidentiel ». Seule la personne qui décide voit ton nom et elle est tenue à la confidentialité. Tu reçois toujours la réponse par e-mail.
                  </span>
                </span>
              </label>
            </Bloc>

            <Bloc titre="Pièces jointes (facultatif)">
              <div className="flex flex-col gap-3">
                {fichier ? (
                  <p className="bg-neutral-1 px-4 py-3 text-[14px] leading-5">1 fichier rattaché : retire-le pour en ajouter un autre.</p>
                ) : (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
                    onDragLeave={() => setSurvol(false)}
                    onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouterPdf(e.dataTransfer.files); }}
                    className={cn("flex cursor-pointer flex-col items-center gap-2 border border-dashed border-field px-6 py-6 text-center", survol ? "bg-neutral-2" : "bg-neutral-1 hover:bg-neutral-2")}
                  >
                    <Upload size={20} aria-hidden />
                    <span className="text-[14px] leading-5">Glisse ton fichier ici ou <span className="font-semibold underline underline-offset-4">parcours tes dossiers</span></span>
                    <span className="text-[12px] leading-4 text-ink-2">PDF uniquement · 20 Mo maximum</span>
                    <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { ajouterPdf(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
                <Erreur>{erreurs.fichier}</Erreur>
                {fichier && (
                  <div className="flex flex-col gap-2">
                    <h3 className="label text-ink">Documents rattachés</h3>
                    <ul className="flex flex-col border border-line">
                      <li className="flex items-center gap-3 px-4 py-1">
                        <FileText size={16} aria-hidden className="text-ink-2" />
                        <span className="min-w-0 flex-1 truncate text-[14px] leading-5">{fichier.name}</span>
                        <span className="text-[12px] leading-4 text-ink-2">{taille(fichier.size)}</span>
                        <HpIconButton icon={Trash2} label={`Retirer ${fichier.name}`} className="border-0" onClick={() => setFichier(null)} />
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </Bloc>

            <div className="flex items-center justify-end gap-4 border border-line bg-white p-6">
              <span role="status" className="mr-auto text-[12px] leading-4 text-ink-2">{message}</span>
              <Link to="/demandes" className={LIEN}>Annuler</Link>
              <button type="button" onClick={enregistrerBrouillon} className={LIEN}>Enregistrer le brouillon</button>
              <HpButton type="submit" role="principal" icon={Send} disabled={envoi.isPending}>{envoi.isPending ? "ENVOI EN COURS…" : "ENVOYER LA DEMANDE"}</HpButton>
            </div>
          </div>

          <ReglesArbitrage>
            <aside className="flex flex-col gap-4 border border-line bg-white p-6">
              <h2 className="label-13 font-label text-ink">CE QUI SE PASSE ENSUITE</h2>
              <ol className="flex flex-col gap-3 text-[14px] leading-5">
                <li><span className="font-semibold">1. Envoi.</span> {nomValideur ? `${nomValideur} reçoit ta demande.` : "La personne qui valide reçoit ta demande."}</li>
                <li><span className="font-semibold">2. Décision.</span> Validée, refusée ou à compléter.</li>
                <li><span className="font-semibold">3. Réponse.</span> Tu es prévenu par e-mail en moins de 5 minutes.</li>
              </ol>
              <p className="border-t border-line pt-4 text-[12px] leading-4 text-ink-2">Sans réponse après 5 jours ouvrés, tu peux relancer la personne qui décide.</p>
            </aside>
          </ReglesArbitrage>
        </form>
      </div>
    </HpPage>
  );
}
