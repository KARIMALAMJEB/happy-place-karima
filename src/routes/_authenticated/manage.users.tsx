import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BulkImport } from "@/components/manage/bulk-import";
import { Encadre } from "@/components/hp/encadre";
import { HpButton } from "@/components/hp/button";
import { ChevronDown, Layers, Lock, Plus, Upload, UserPlus, Users, X } from "lucide-react";
import { BarreFiltres, correspond, equipesDe } from "@/components/hp/filtres-liste";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { countAttachmentDeletionQueue, processAttachmentDeletionQueue } from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/manage/users")({
  head: () => ({
    meta: [
      { title: "Équipes et utilisateurs — Happy Place" },
      { name: "description", content: "Liste blanche des comptes Google autorisés à se connecter." },
      { property: "og:title", content: "Équipes et utilisateurs — Happy Place" },
      { property: "og:description", content: "Gérer qui peut accéder à Happy Place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

type AppRole = "admin" | "manager" | "collaborateur";
type Row = {
  id: string;
  email: string;
  created_at: string;
  role: AppRole;
  teams: string[];
  team: string | null;
  departure_date: string | null;
  first_name: string | null;
  last_name: string | null;
};
const nameSchema = z.string().trim().max(100, "100 caractères maximum");
const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide").max(255);
const teamSchema = z.string().trim().min(2, "Nom d'équipe trop court").max(60, "60 caractères maximum");

function UsersPage() {
  const qc = useQueryClient();
  const { email: me } = Route.useRouteContext();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<AppRole>("collaborateur");
  const [newTeam, setNewTeam] = useState("");
  const [memberTeams, setMemberTeams] = useState<Record<string, string>>({});
  const [teamInputs, setTeamInputs] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["allowed_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("id, email, first_name, last_name, team, departure_date, created_at, allowed_user_roles(role), manager_teams(team)")
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((user) => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        team: user.team,
        departure_date: user.departure_date,
        role: user.allowed_user_roles?.role ?? "collaborateur",
        teams: user.manager_teams.map((entry) => entry.team).sort(),
      })) as Row[];
    },
  });
  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("name, is_reserved");
      if (error) throw error;
      return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
    },
  });
  const selectableTeams = (teamsQuery.data ?? []).filter((t) => !t.is_reserved && t.name.toLowerCase() !== "admin").map((t) => t.name);
  const [roleDialog, setRoleDialog] = useState<{ id: string; email: string; team: string; role: "collaborateur" | "manager" } | null>(null);
  const [nameInputs, setNameInputs] = useState<Record<string, { first: string; last: string }>>({});
  const [fQ, setFQ] = useState("");
  const [fEquipe, setFEquipe] = useState("");
  const [fRole, setFRole] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["allowed_users"] });
    qc.invalidateQueries({ queryKey: ["teams"] });
  };
  const onError = (e: unknown) => toast.error((e as Error).message);

  const add = useMutation({
    mutationFn: async (v: { email: string; role: AppRole; team: string | null; first_name: string | null; last_name: string | null }) => {
      const { data, error } = await supabase
        .from("allowed_users")
        .insert({ email: v.email, team: v.team, first_name: v.first_name, last_name: v.last_name })
        .select("id")
        .single();
      if (error) throw new Error(error.code === "23505" ? "Cet email est déjà dans la liste" : error.message);
      const { error: roleError } = await supabase
        .from("allowed_user_roles")
        .insert({ allowed_user_id: data.id, role: v.role });
      if (roleError) {
        await supabase.from("allowed_users").delete().eq("id", data.id);
        throw roleError;
      }
      // Un manager encadre au moins son équipe de rattachement
      if (v.role === "manager" && v.team) {
        const { error: mtError } = await supabase.from("manager_teams").insert({ allowed_user_id: data.id, team: v.team });
        if (mtError && mtError.code !== "23505") throw mtError;
      }
    },
    onSuccess: () => { setEmail(""); setNewTeam(""); setFirstName(""); setLastName(""); toast.success("Utilisateur ajouté"); refresh(); },
    onError,
  });
  const update = useMutation({
    mutationFn: async (v: { id: string; role: AppRole; team?: string }) => {
      if (v.role === "collaborateur" || v.role === "manager") {
        const parsed = teamSchema.safeParse(v.team ?? "");
        if (!parsed.success) throw new Error(`Équipe requise pour un ${v.role === "manager" ? "manager" : "collaborateur"} : ` + parsed.error.issues[0].message);
        const { data, error: tErr } = await supabase.from("allowed_users").update({ team: parsed.data }).eq("id", v.id).select("id");
        if (tErr) throw tErr;
        if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
      } else {
        const { data, error: tErr } = await supabase.from("allowed_users").update({ team: null }).eq("id", v.id).select("id");
        if (tErr) throw tErr;
        if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
      }
      const { data: roleRows, error } = await supabase
        .from("allowed_user_roles")
        .update({ role: v.role, updated_at: new Date().toISOString() })
        .eq("allowed_user_id", v.id)
        .select("id");
      if (error) throw error;
      if (!roleRows?.length) throw new Error("Modification refusée : vérifie que tu es admin");
      if (v.role !== "manager") {
        const { error: teamError } = await supabase.from("manager_teams").delete().eq("allowed_user_id", v.id);
        if (teamError) throw teamError;
      } else if (v.team) {
        // Le manager encadre au moins son équipe de rattachement
        const { error: mtError } = await supabase.from("manager_teams").insert({ allowed_user_id: v.id, team: v.team });
        if (mtError && mtError.code !== "23505") throw mtError;
      }
    },
    onSuccess: refresh,
    onError,
  });
  const updateName = useMutation({
    mutationFn: async (v: { id: string; first: string; last: string }) => {
      const fn = nameSchema.safeParse(v.first);
      if (!fn.success) throw new Error("Prénom : " + fn.error.issues[0].message);
      const ln = nameSchema.safeParse(v.last);
      if (!ln.success) throw new Error("Nom : " + ln.error.issues[0].message);
      const { data, error } = await supabase.from("allowed_users").update({ first_name: fn.data || null, last_name: ln.data || null }).eq("id", v.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
    },
    onSuccess: (_, v) => {
      toast.success("Nom modifié");
      setNameInputs((c) => { const n = { ...c }; delete n[v.id]; return n; });
      refresh();
    },
    onError,
  });
  const setDeparture = useMutation({
    mutationFn: async (v: { id: string; date: string | null }) => {
      const { error } = await supabase.from("allowed_users").update({ departure_date: v.date }).eq("id", v.id);
      if (error) throw error;
      return v.date;
    },
    onSuccess: (d) => { toast.success(d ? `Départ programmé le ${formatDate(d)}` : "Départ annulé"); refresh(); },
    onError,
  });
  const formatDate = (iso: string) => iso.split("-").reverse().join("/");
  const minDeparture = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const scheduleRemoval = (u: Row) => {
    if (u.departure_date && u.departure_date <= minDeparture) {
      toast.info(`Départ déjà programmé le ${formatDate(u.departure_date)}`);
      return;
    }
    if (
      confirm(
        `Retirer l'accès de ${u.email} ? Son accès sera supprimé le ${formatDate(minDeparture)}, dans 7 jours. Son manager et les admins sont prévenus dès maintenant et pourront télécharger ses documents d'ici là. Tu peux annuler avec « Annuler le départ ».`,
      )
    )
      setDeparture.mutate({ id: u.id, date: minDeparture });
  };
  const [departureInputs, setDepartureInputs] = useState<Record<string, string>>({});

  const queue = useQuery({
    queryKey: ["attachment_deletion_queue"],
    queryFn: countAttachmentDeletionQueue,
  });
  const retry = useMutation({
    mutationFn: processAttachmentDeletionQueue,
    onSuccess: (r) => {
      if (r.remaining > 0) toast.error(`${r.remaining} document(s) n'ont pas pu être supprimés.`);
      else toast.success(`${r.deleted} document(s) supprimé(s)`);
    },
    onError,
    onSettled: () => qc.invalidateQueries({ queryKey: ["attachment_deletion_queue"] }),
  });

  const addTeam = useMutation({
    mutationFn: async (v: { allowedUserId: string; team: string }) => {
      const parsed = teamSchema.safeParse(v.team);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (parsed.data.trim().toLowerCase() === "admin") throw new Error("L'équipe Admin est réservée aux admins.");
      const { data, error } = await supabase
        .from("manager_teams")
        .insert({ allowed_user_id: v.allowedUserId, team: parsed.data })
        .select("id");
      if (!error && !data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
      if (error)
        throw new Error(
          error.code === "23514"
            ? "L'équipe Admin est réservée aux admins."
            : error.code === "23505"
            ? `Ce manager a déjà l'équipe « ${parsed.data} ».`
            : error.message,
        );
    },
    onSuccess: (_, variables) => {
      setTeamInputs((current) => ({ ...current, [variables.allowedUserId]: "" }));
      toast.success("Équipe attribuée");
      refresh();
    },
    onError,
  });

  const removeTeam = useMutation({
    mutationFn: async (v: { allowedUserId: string; team: string }) => {
      const { data, error } = await supabase
        .from("manager_teams")
        .delete()
        .eq("allowed_user_id", v.allowedUserId)
        .eq("team", v.team)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
    },
    onSuccess: () => { toast.success("Équipe retirée"); refresh(); },
    onError,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    let team: string | null = null;
    if (role === "collaborateur" || role === "manager") {
      const t = teamSchema.safeParse(newTeam);
      if (!t.success) return setErr("Équipe requise : " + t.error.issues[0].message);
      team = t.data;
    }
    const fn = nameSchema.safeParse(firstName);
    if (!fn.success) return setErr("Prénom : " + fn.error.issues[0].message);
    const ln = nameSchema.safeParse(lastName);
    if (!ln.success) return setErr("Nom : " + ln.error.issues[0].message);
    setErr(null);
    add.mutate({ email: parsed.data, role, team, first_name: fn.data || null, last_name: ln.data || null });
  }

  const visibles = (list.data ?? []).filter(
    (u) =>
      correspond(fQ, u.first_name, u.last_name, u.email) &&
      (!fEquipe || u.team === fEquipe || u.teams.includes(fEquipe)) &&
      (!fRole || u.role === fRole),
  );

  const [ouvert, setOuvert] = useState<string | null>(null);
  const [panneau, setPanneau] = useState<"ajout" | "import" | null>(null);
  const nbRole = (r: AppRole) => (list.data ?? []).filter((u) => u.role === r).length;
  const roleLibelle: Record<AppRole, string> = { admin: "ADMIN", manager: "MANAGER", collaborateur: "COLLABORATEUR" };
  const champ = "min-h-11 border border-field bg-white px-3 text-[14px] leading-5 text-ink";
  const petit = "inline-flex h-11 items-center justify-center border-[1.5px] px-4 label disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6">
      {(queue.data ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-4 border border-[#8E1A1F] bg-white p-4">
          <p className="text-[14px] leading-5 text-[#8E1A1F]">{queue.data} document(s) en attente de suppression</p>
          <HpButton role="consulte" disabled={retry.isPending} onClick={() => retry.mutate()}>{retry.isPending ? "…" : "RÉESSAYER"}</HpButton>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {([
          ["Collaborateurs", nbRole("collaborateur"), "Déposent des demandes"],
          ["Managers", nbRole("manager"), "Valident pour leurs équipes"],
          ["Admins", nbRole("admin"), "Gèrent tout le site"],
        ] as const).map(([titre, n, aide]) => (
          <div key={titre} className="border border-line bg-white px-6 py-4">
            <p className="label text-ink-2">{titre.toUpperCase()}</p>
            <p className="text-[32px] leading-10 text-ink">{n}</p>
            <p className="text-[12px] leading-4 text-ink-2">{aide}</p>
          </div>
        ))}
      </div>

      <TeamsSection users={list.data ?? []} teams={teamsQuery.data ?? []} onChanged={refresh} />

      <Encadre
        icon={Users}
        title="Personnes autorisées"
        subtitle="Seules ces personnes peuvent se connecter. Ouvrez une ligne pour modifier."
        compteur={`${visibles.length} sur ${(list.data ?? []).length}`}
        filtre={
          <div className="flex w-full flex-col gap-3">
            <BarreFiltres
              sansDate
              recherche={fQ}
              onRecherche={setFQ}
              placeholder="Rechercher un nom ou un e-mail"
              equipe={fEquipe}
              onEquipe={setFEquipe}
              equipes={equipesDe((list.data ?? []).flatMap((u) => [u.team, ...u.teams]))}
              periode=""
              onPeriode={() => {}}
              actifs={!!(fQ || fEquipe || fRole)}
              onReinitialiser={() => { setFQ(""); setFEquipe(""); setFRole(""); }}
            >
              <select aria-label="Filtrer par rôle" value={fRole} onChange={(e) => setFRole(e.target.value)} className={champ}>
                <option value="">Tous les rôles</option>
                <option value="collaborateur">Collaborateur</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </BarreFiltres>
          </div>
        }
      >
        <div className="flex flex-wrap justify-end gap-3 border-b border-line px-6 py-3">
          <HpButton role="consulte" icon={Upload} onClick={() => setPanneau(panneau === "import" ? null : "import")}>IMPORTER UNE LISTE</HpButton>
          <HpButton role="principal" icon={UserPlus} onClick={() => setPanneau(panneau === "ajout" ? null : "ajout")}>AJOUTER UNE PERSONNE</HpButton>
        </div>

        {panneau === "import" && <div className="border-b border-line bg-neutral-1 p-4"><BulkImport onImported={refresh} /></div>}
        {panneau === "ajout" && (
          <form onSubmit={submit} className="flex flex-col gap-4 border-b border-line bg-neutral-1 p-6">
            <p className="label text-ink">NOUVELLE PERSONNE</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1"><span className="label text-ink-2">PRÉNOM (FACULTATIF)</span>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} className={champ} /></label>
              <label className="flex flex-col gap-1"><span className="label text-ink-2">NOM (FACULTATIF)</span>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} className={champ} /></label>
              <label className="flex flex-col gap-1"><span className="label text-ink-2">E-MAIL GOOGLE</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@gmail.com" className={champ} /></label>
              <label className="flex flex-col gap-1"><span className="label text-ink-2">RÔLE</span>
                <select value={role} onChange={(e) => setRole(e.target.value as Row["role"])} className={champ}>
                  <option value="collaborateur">Collaborateur</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select></label>
              {(role === "collaborateur" || role === "manager") && (
                <label className="flex flex-col gap-1"><span className="label text-ink-2">{role === "manager" ? "ÉQUIPE DE RATTACHEMENT (OBLIGATOIRE)" : "ÉQUIPE (OBLIGATOIRE)"}</span>
                  <select value={newTeam} onChange={(e) => setNewTeam(e.target.value)} className={champ}>
                    <option value="">Choisir une équipe</option>
                    {selectableTeams.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></label>
              )}
            </div>
            {err && <p role="alert" className="text-[14px] leading-5 font-semibold text-[#8E1A1F]">{err}</p>}
            <div className="flex justify-end gap-3">
              <HpButton role="consulte" onClick={() => setPanneau(null)}>ANNULER</HpButton>
              <button disabled={add.isPending} className={`${petit} border-anthracite bg-anthracite text-on-anthracite hover:bg-ink`}>{add.isPending ? "…" : "AJOUTER"}</button>
            </div>
          </form>
        )}

        <ul className="divide-y divide-line">
          {visibles.map((u) => {
            const nom = [u.first_name, u.last_name].filter(Boolean).join(" ");
            const ouverte = ouvert === u.id;
            const sansEquipe = (u.role === "collaborateur" || u.role === "manager") && !u.team;
            return (
              <li key={u.id} className="relative">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 pr-6 pl-7">
                  <div className="min-w-[220px] flex-1">
                    <p className="text-[14px] leading-5 font-bold text-ink wrap-anywhere">{nom || u.email}{u.email === me && <span className="font-normal text-ink-2"> (toi)</span>}</p>
                    {nom && <p className="text-[12px] leading-4 text-ink-2 wrap-anywhere">{u.email}</p>}
                  </div>
                  <span className="label w-[150px] border border-line px-2 py-1 text-center text-anthracite">{roleLibelle[u.role]}</span>
                  <div className="min-w-[200px] flex-1 text-[14px] leading-5 text-ink">
                    {u.role === "admin" ? <span className="text-ink-2">Toutes les équipes</span>
                      : sansEquipe ? <span className="font-semibold text-[#8E1A1F]">Aucune équipe : à renseigner</span>
                      : u.role === "manager" ? <span>{u.team}{u.teams.filter((t) => t !== u.team).length > 0 && <span className="text-ink-2"> · encadre aussi {u.teams.filter((t) => t !== u.team).join(", ")}</span>}</span>
                      : u.team}
                  </div>
                  {u.departure_date && <span className="label border border-[#8E1A1F] px-2 py-1 text-[#8E1A1F]">PART LE {formatDate(u.departure_date)}</span>}
                  <button type="button" aria-expanded={ouverte} aria-controls={`panneau-${u.id}`} onClick={() => setOuvert(ouverte ? null : u.id)}
                    className="inline-flex h-11 cursor-pointer items-center gap-1 px-1 text-[14px] leading-5 font-semibold text-anthracite underline underline-offset-4 hover:text-ink">
                    {ouverte ? "Fermer" : "Modifier"}
                    <ChevronDown size={16} aria-hidden className={ouverte ? "rotate-180" : ""} />
                  </button>
                </div>

                {ouverte && (
                  <div id={`panneau-${u.id}`} className="grid gap-6 border-t border-line bg-neutral-1 py-6 pr-6 pl-7 lg:grid-cols-3">
                    <div className="flex flex-col gap-3">
                      <p className="label text-ink">1 · IDENTITÉ</p>
                      <input aria-label={`Prénom de ${u.email}`} placeholder="Prénom" maxLength={100} className={champ}
                        value={nameInputs[u.id]?.first ?? u.first_name ?? ""}
                        onChange={(e) => setNameInputs((c) => ({ ...c, [u.id]: { first: e.target.value, last: c[u.id]?.last ?? u.last_name ?? "" } }))} />
                      <input aria-label={`Nom de ${u.email}`} placeholder="Nom" maxLength={100} className={champ}
                        value={nameInputs[u.id]?.last ?? u.last_name ?? ""}
                        onChange={(e) => setNameInputs((c) => ({ ...c, [u.id]: { first: c[u.id]?.first ?? u.first_name ?? "", last: e.target.value } }))} />
                      <p className="text-[12px] leading-4 text-ink-2">L'adresse e-mail ne se modifie pas.</p>
                      <HpButton role="principal" disabled={!nameInputs[u.id] || updateName.isPending}
                        onClick={() => nameInputs[u.id] && updateName.mutate({ id: u.id, first: nameInputs[u.id].first, last: nameInputs[u.id].last })}>
                        ENREGISTRER LE NOM
                      </HpButton>
                    </div>

                    <div className="flex flex-col gap-3">
                      <p className="label text-ink">2 · RÔLE ET ÉQUIPES</p>
                      <label className="flex flex-col gap-1"><span className="text-[12px] leading-4 text-ink-2">Rôle</span>
                        <select value={u.role} aria-label={`Rôle de ${u.email}`} className={champ}
                          onChange={(e) => {
                            const next = e.target.value as AppRole;
                            if (next === "collaborateur" || next === "manager") {
                              setRoleDialog({ id: u.id, email: u.email, team: u.team ?? u.teams[0] ?? "", role: next });
                            } else update.mutate({ id: u.id, role: next }, { onSuccess: () => toast.success("Rôle modifié") });
                          }}>
                          <option value="collaborateur">Collaborateur</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select></label>
                      {(u.role === "collaborateur" || u.role === "manager") && (() => {
                        const chosen = memberTeams[u.id] ?? u.team ?? "";
                        const saving = update.isPending && update.variables?.id === u.id;
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="text-[12px] leading-4 text-ink-2">{u.role === "manager" ? "Équipe de rattachement" : "Équipe"}</span>
                            <div className="flex gap-2">
                              <select value={chosen} aria-label={`Équipe de ${u.email}`} className={`${champ} min-w-0 flex-1`}
                                onChange={(e) => setMemberTeams((c) => ({ ...c, [u.id]: e.target.value }))}>
                                <option value="">Choisir une équipe</option>
                                {(u.team && !selectableTeams.includes(u.team) ? [u.team, ...selectableTeams] : selectableTeams).map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <HpButton role="principal" disabled={!chosen || chosen === u.team || saving}
                                onClick={() => update.mutate({ id: u.id, role: u.role, team: chosen }, {
                                  onSuccess: () => { toast.success("Équipe modifiée"); setMemberTeams((c) => { const n = { ...c }; delete n[u.id]; return n; }); },
                                })}>
                                {saving ? "…" : "OK"}
                              </HpButton>
                            </div>
                          </div>
                        );
                      })()}
                      {u.role === "manager" && (
                        <div className="flex flex-col gap-2">
                          <span className="text-[12px] leading-4 text-ink-2">Équipes encadrées</span>
                          <div className="flex flex-wrap gap-2">
                            {u.teams.map((team) => (
                              <button key={team} type="button" title={`Retirer l'équipe ${team}`} aria-label={`Retirer l'équipe ${team}`}
                                onClick={() => removeTeam.mutate({ allowedUserId: u.id, team })}
                                className="inline-flex h-8 cursor-pointer items-center gap-1 border border-field bg-white px-2 text-[13px] leading-5 hover:bg-neutral-1">
                                {team} <X size={12} aria-hidden />
                              </button>
                            ))}
                            {u.teams.length === 0 && <span className="text-[13px] leading-5 text-ink-2">Aucune</span>}
                          </div>
                          <div className="flex gap-2">
                            <select value={teamInputs[u.id] ?? ""} aria-label={`Ajouter une équipe à ${u.email}`} className={`${champ} min-w-0 flex-1`}
                              onChange={(e) => setTeamInputs((current) => ({ ...current, [u.id]: e.target.value }))}>
                              <option value="">Ajouter une équipe</option>
                              {selectableTeams.filter((t) => !u.teams.includes(t)).map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <HpButton role="consulte" disabled={!teamInputs[u.id] || addTeam.isPending}
                              onClick={() => addTeam.mutate({ allowedUserId: u.id, team: teamInputs[u.id] ?? "" })}>
                              AJOUTER
                            </HpButton>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <p className="label text-ink">3 · ACCÈS</p>
                      <label className="flex flex-col gap-1" htmlFor={`dep-${u.id}`}><span className="text-[12px] leading-4 text-ink-2">Départ prévu le (7 jours minimum)</span></label>
                      <input id={`dep-${u.id}`} type="date" min={minDeparture} className={champ}
                        value={departureInputs[u.id] ?? u.departure_date ?? ""}
                        onChange={(e) => setDepartureInputs((c) => ({ ...c, [u.id]: e.target.value }))} />
                      <div className="flex flex-wrap gap-2">
                        <HpButton role="principal" disabled={setDeparture.isPending || !(departureInputs[u.id] ?? u.departure_date)}
                          onClick={() => setDeparture.mutate({ id: u.id, date: departureInputs[u.id] ?? u.departure_date ?? null })}>
                          PROGRAMMER
                        </HpButton>
                        {u.departure_date && (
                          <HpButton role="consulte" disabled={setDeparture.isPending}
                            onClick={() => { setDepartureInputs((c) => ({ ...c, [u.id]: "" })); setDeparture.mutate({ id: u.id, date: null }); }}>
                            ANNULER LE DÉPART
                          </HpButton>
                        )}
                      </div>
                      <HpButton role="refuse" disabled={u.email === me || setDeparture.isPending} onClick={() => scheduleRemoval(u)}
                        title={u.email === me ? "Tu ne peux pas programmer ton propre départ" : undefined}>
                        RETIRER L'ACCÈS (J+7)
                      </HpButton>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {list.isLoading && <li className="p-6 text-[14px] leading-5 text-ink-2">Chargement…</li>}
          {!list.isLoading && visibles.length === 0 && <li className="p-6 text-[14px] leading-5 text-ink-2 italic">Aucune personne ne correspond à ces filtres.</li>}
        </ul>
      </Encadre>
      <Dialog open={!!roleDialog} onOpenChange={(o) => !o && setRoleDialog(null)}>
        <DialogContent className="hp-shell rounded-none border border-anthracite bg-white p-6 text-ink">
          <DialogHeader>
            <DialogTitle>{roleDialog?.role === "manager" ? "Équipe de rattachement du manager" : "Équipe du collaborateur"} : {roleDialog?.email}</DialogTitle>
          </DialogHeader>
          <select
            value={roleDialog?.team ?? ""}
            onChange={(e) => roleDialog && setRoleDialog({ ...roleDialog, team: e.target.value })}
            aria-label="Équipe du collaborateur"
            className="w-full border border-line bg-white px-4 py-2 text-[14px] leading-5"
          >
            <option value="">Choisir une équipe</option>
            {selectableTeams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <DialogFooter>
            <HpButton role="consulte" onClick={() => setRoleDialog(null)}>ANNULER</HpButton>
            <button
              type="button"
              disabled={!roleDialog?.team || update.isPending}
              title={!roleDialog?.team ? "Choisis d'abord une équipe" : undefined}
              onClick={() => {
                if (!roleDialog?.team) return;
                update.mutate(
                  { id: roleDialog.id, role: roleDialog.role, team: roleDialog.team },
                  { onSuccess: () => { toast.success("Rôle modifié"); setRoleDialog(null); } },
                );
              }}
              className="px-6 py-2 bg-anthracite text-on-anthracite label-13  disabled:opacity-50"
            >
              {update.isPending ? "…" : "Enregistrer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamsSection({ users, teams, onChanged }: { users: Row[]; teams: { name: string; is_reserved: boolean }[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const collabs = (t: string) => users.filter((u) => u.role === "collaborateur" && u.team === t).length;
  const managers = (t: string) => users.filter((u) => u.role === "manager" && u.teams.includes(t)).length;
  const onError = (e: unknown) => toast.error((e as Error).message);

  const create = useMutation({
    mutationFn: async (n: string) => {
      const { error } = await supabase.from("teams").insert({ name: n });
      if (error) throw new Error(error.code === "23505" ? "Cette équipe existe déjà" : error.message);
    },
    onSuccess: () => { setName(""); toast.success("Équipe ajoutée"); onChanged(); },
    onError: (e) => setErr((e as Error).message),
  });
  const rename = useMutation({
    mutationFn: async (v: { from: string; to: string }) => {
      const { error } = await supabase.from("teams").update({ name: v.to }).eq("name", v.from);
      if (error) throw new Error(error.code === "23505" ? "Cette équipe existe déjà" : error.message);
    },
    onSuccess: () => { setEditing(null); toast.success("Équipe renommée"); onChanged(); },
    onError,
  });
  const del = useMutation({
    mutationFn: async (n: string) => {
      const { error } = await supabase.from("teams").delete().eq("name", n);
      if (error)
        throw new Error(error.code === "23503" ? "Impossible : cette équipe est encore utilisée (personnes ou demandes). Réaffecte-les d'abord." : error.message);
    },
    onSuccess: () => { toast.success("Équipe supprimée"); onChanged(); },
    onError,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = teamSchema.safeParse(name);
    if (!p.success) return setErr(p.error.issues[0].message);
    setErr(null);
    create.mutate(p.data);
  }
  const lien = "inline-flex h-9 cursor-pointer items-center px-1 text-[14px] leading-5 font-semibold underline underline-offset-4 hover:text-ink disabled:opacity-50";

  return (
    <Encadre icon={Layers} title="Équipes" subtitle="Les équipes du cabinet : chaque collaborateur et chaque manager en a une" compteur={`${teams.length} équipe${teams.length > 1 ? "s" : ""}`}>
      <form onSubmit={submit} className="flex flex-wrap items-start gap-3 border-b border-line px-6 py-4">
        <div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la nouvelle équipe" aria-label="Nouvelle équipe" maxLength={60}
            className="min-h-11 w-[280px] max-w-full border border-field bg-white px-3 text-[14px] leading-5 text-ink" />
          {err && <p role="alert" className="mt-1 text-[12px] leading-4 font-semibold text-[#8E1A1F]">{err}</p>}
        </div>
        <HpButton type="submit" role="principal" icon={Plus} disabled={create.isPending}>CRÉER L'ÉQUIPE</HpButton>
      </form>
      <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <li key={t.name} className="flex flex-col justify-between gap-3 bg-white p-4">
            {editing?.from === t.name ? (
              <div className="flex flex-col gap-2">
                <input value={editing.to} onChange={(e) => setEditing({ ...editing, to: e.target.value })} aria-label={`Nouveau nom pour ${t.name}`} maxLength={60}
                  className="min-h-11 border border-field bg-white px-3 text-[14px] leading-5 text-ink" />
                <div className="flex gap-2">
                  <HpButton role="principal" disabled={rename.isPending} onClick={() => {
                    const p = teamSchema.safeParse(editing.to);
                    if (!p.success) return toast.error(p.error.issues[0].message);
                    rename.mutate({ from: t.name, to: p.data });
                  }}>ENREGISTRER</HpButton>
                  <HpButton role="consulte" onClick={() => setEditing(null)}>ANNULER</HpButton>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="flex items-center gap-2 text-[16px] leading-6 font-semibold text-ink">
                    {t.is_reserved && <Lock size={14} aria-label="Équipe réservée" className="text-ink-2" />}
                    {t.name}
                  </p>
                  <p className="text-[12px] leading-4 text-ink-2">{collabs(t.name)} collaborateur{collabs(t.name) > 1 ? "s" : ""} · {managers(t.name)} manager{managers(t.name) > 1 ? "s" : ""}</p>
                </div>
                {!t.is_reserved && (
                  <div className="flex gap-3">
                    <button type="button" className={`${lien} text-anthracite`} onClick={() => setEditing({ from: t.name, to: t.name })}>Renommer</button>
                    <button type="button" className={`${lien} text-[#8E1A1F]`} disabled={del.isPending}
                      onClick={() => confirm(`Supprimer l'équipe « ${t.name} » ?`) && del.mutate(t.name)}>Supprimer</button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </Encadre>
  );
}
