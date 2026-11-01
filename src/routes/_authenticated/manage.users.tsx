import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BulkImport } from "@/components/manage/bulk-import";
import { BarreFiltres, correspond, equipesDe } from "@/components/hp/filtres-liste";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { countAttachmentDeletionQueue, processAttachmentDeletionQueue } from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/manage/users")({
  head: () => ({
    meta: [
      { title: "Utilisateurs autorisés — Happy Place" },
      { name: "description", content: "Liste blanche des comptes Google autorisés à se connecter." },
      { property: "og:title", content: "Utilisateurs autorisés — Happy Place" },
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

  return (
    <div className="space-y-6">
      {(queue.data ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-4 border border-[#8E1A1F] bg-white p-4">
          <p className="text-[14px] leading-5 text-[#8E1A1F]">{queue.data} document(s) en attente de suppression</p>
          <button
            type="button"
            onClick={() => retry.mutate()}
            disabled={retry.isPending}
            className="px-6 py-2 border border-field text-ink label-13  hover:bg-neutral-1 disabled:opacity-50"
          >
            {retry.isPending ? "…" : "Réessayer"}
          </button>
        </div>
      )}
      <TeamsSection users={list.data ?? []} teams={teamsQuery.data ?? []} onChanged={refresh} />
      <BulkImport onImported={refresh} />
      <form onSubmit={submit} className="flex flex-col md:flex-row gap-2 md:items-start bg-white border border-line p-6">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Prénom (facultatif)"
          aria-label="Prénom"
          maxLength={100}
          className="border border-line bg-white px-4 py-2 text-[14px] leading-5"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nom (facultatif)"
          aria-label="Nom"
          maxLength={100}
          className="border border-line bg-white px-4 py-2 text-[14px] leading-5"
        />
        <div className="flex-1">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@gmail.com"
            aria-label="Email Google"
            className="w-full border border-line bg-white px-4 py-2 text-[14px] leading-5"
          />
          {err && <p className="text-[#8E1A1F] text-[14px] mt-1">{err}</p>}
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Row["role"])}
          aria-label="Rôle"
          className="border border-line bg-white px-4 py-2 text-[14px] leading-5"
        >
          <option value="collaborateur">Collaborateur</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        {(role === "collaborateur" || role === "manager") && (
<select
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            aria-label={role === "manager" ? "Équipe de rattachement du manager" : "Équipe du collaborateur"}
            className="border border-line bg-white px-4 py-2 text-[14px] leading-5"
          >
            <option value="">{role === "manager" ? "Équipe de rattachement" : "Choisir une équipe"}</option>
            {selectableTeams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <button disabled={add.isPending} className="px-6 py-2 bg-anthracite text-on-anthracite label-13 ">
          AJOUTER
        </button>
      </form>

      <div className="border border-line bg-white p-6">
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
          <select aria-label="Filtrer par rôle" value={fRole} onChange={(e) => setFRole(e.target.value)} className="min-h-11 border border-field bg-white px-3 text-[14px] leading-5 text-ink">
            <option value="">Tous les rôles</option>
            <option value="collaborateur">Collaborateur</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </BarreFiltres>
        <p role="status" className="pt-2 text-[12px] leading-4 text-ink-2">{visibles.length} sur {(list.data ?? []).length} utilisateur{(list.data ?? []).length > 1 ? "s" : ""}</p>
      </div>

      <div className="border border-line divide-y divide-line bg-white">
        {visibles.map((u) => (
          <div key={u.id} className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-[14px] leading-5 text-ink">
                {(u.first_name || u.last_name) && <span className="mr-2">{[u.first_name, u.last_name].filter(Boolean).join(" ")} ·</span>}
                {u.email}{u.email === me && " (toi)"}
                {u.departure_date && (
                  <span className="ml-2 px-2 py-[1px] border border-[#8E1A1F] text-[#8E1A1F] label ">
                    Part le {u.departure_date.split("-").reverse().join("/")}
                  </span>
                )}
              </span>
              <div className="flex gap-2">
              <select
                value={u.role}
                onChange={(e) => {
                  const next = e.target.value as AppRole;
                  if (next === "collaborateur" || next === "manager") {
                    setRoleDialog({ id: u.id, email: u.email, team: u.team ?? u.teams[0] ?? "", role: next });
                  } else update.mutate({ id: u.id, role: next }, { onSuccess: () => toast.success("Rôle modifié") });
                }}
                aria-label={`Rôle de ${u.email}`}
                className="border border-line bg-white px-4 py-2 text-[14px] leading-5"
              >
                <option value="collaborateur">Collaborateur</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => scheduleRemoval(u)}
                disabled={u.email === me || setDeparture.isPending}
                title={u.email === me ? "Tu ne peux pas programmer ton propre départ" : undefined}
                className="px-4 py-2 border border-field text-[#8E1A1F] label-13  disabled:opacity-50"
              >
                RETIRER (J+7)
              </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="label text-ink-2">NOM :</span>
              <input
                aria-label={`Prénom de ${u.email}`}
                placeholder="Prénom"
                maxLength={100}
                value={nameInputs[u.id]?.first ?? u.first_name ?? ""}
                onChange={(e) => setNameInputs((c) => ({ ...c, [u.id]: { first: e.target.value, last: c[u.id]?.last ?? u.last_name ?? "" } }))}
                className="border border-line bg-white px-4 py-1 text-[14px] leading-5"
              />
              <input
                aria-label={`Nom de ${u.email}`}
                placeholder="Nom"
                maxLength={100}
                value={nameInputs[u.id]?.last ?? u.last_name ?? ""}
                onChange={(e) => setNameInputs((c) => ({ ...c, [u.id]: { first: c[u.id]?.first ?? u.first_name ?? "", last: e.target.value } }))}
                className="border border-line bg-white px-4 py-1 text-[14px] leading-5"
              />
              <button
                type="button"
                disabled={!nameInputs[u.id] || updateName.isPending}
                onClick={() => nameInputs[u.id] && updateName.mutate({ id: u.id, first: nameInputs[u.id].first, last: nameInputs[u.id].last })}
                className="bg-anthracite text-on-anthracite px-4 py-1 label disabled:opacity-50"
              >
                ENREGISTRER
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <label className="label  text-ink-2" htmlFor={`dep-${u.id}`}>
                Départ prévu le
              </label>
              <input
                id={`dep-${u.id}`}
                type="date"
                min={minDeparture}
                value={departureInputs[u.id] ?? u.departure_date ?? ""}
                onChange={(e) => setDepartureInputs((c) => ({ ...c, [u.id]: e.target.value }))}
                className="border border-line bg-white px-4 py-1 text-[14px] leading-5"
              />
              <button
                type="button"
                disabled={setDeparture.isPending || !(departureInputs[u.id] ?? u.departure_date)}
                onClick={() => setDeparture.mutate({ id: u.id, date: departureInputs[u.id] ?? u.departure_date ?? null })}
                className="bg-anthracite text-on-anthracite px-4 py-1 label  disabled:opacity-50"
              >
                Enregistrer
              </button>
              {u.departure_date && (
                <button
                  type="button"
                  disabled={setDeparture.isPending}
                  onClick={() => {
                    setDepartureInputs((c) => ({ ...c, [u.id]: "" }));
                    setDeparture.mutate({ id: u.id, date: null });
                  }}
                  className="px-4 py-1 border border-field text-ink label "
                >
                  Annuler le départ
                </button>
              )}
            </div>
            {(u.role === "collaborateur" || u.role === "manager") && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <span className="label  text-ink-2">{u.role === "manager" ? "ÉQUIPE DE RATTACHEMENT :" : "ÉQUIPE :"}</span>
<select
            value={memberTeams[u.id] ?? u.team ?? ""}
            onChange={(e) => setMemberTeams((c) => ({ ...c, [u.id]: e.target.value }))}
            aria-label={`Équipe de ${u.email}`}
            className="border border-line bg-white px-4 py-1 text-[14px] leading-5"
          >
            <option value="">Choisir une équipe</option>
            {(u.team && !selectableTeams.includes(u.team) ? [u.team, ...selectableTeams] : selectableTeams).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
                {(() => {
                  const chosen = memberTeams[u.id] ?? u.team ?? "";
                  const saving = update.isPending && update.variables?.id === u.id;
                  return (
                    <button
                      type="button"
                      disabled={!chosen || chosen === u.team || saving}
                      onClick={() =>
                        update.mutate(
                          { id: u.id, role: u.role, team: chosen },
                          {
                            onSuccess: () => {
                              toast.success("Équipe modifiée");
                              setMemberTeams((c) => { const n = { ...c }; delete n[u.id]; return n; });
                            },
                          },
                        )
                      }
                      className="bg-anthracite text-on-anthracite px-4 py-1 label  disabled:opacity-50"
                    >
                      {saving ? "…" : "ENREGISTRER"}
                    </button>
                  );
                })()}
                {!u.team && <span className="text-[#8E1A1F] text-[14px]">Aucune équipe définie</span>}
              </div>
            )}
            {u.role === "manager" && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <span className="label  text-ink-2">ÉQUIPES :</span>
                {u.teams.map((team) => (
                  <button
                    key={team}
                    type="button"
                    title={`Retirer l'équipe ${team}`}
                    onClick={() => removeTeam.mutate({ allowedUserId: u.id, team })}
                    className="border border-line bg-white px-2 py-1 label "
                  >
                    {team} ×
                  </button>
                ))}
<select
            value={teamInputs[u.id] ?? ""}
            onChange={(e) => setTeamInputs((current) => ({ ...current, [u.id]: e.target.value }))}
            aria-label={`Ajouter une équipe à ${u.email}`}
            className="border border-line bg-white px-4 py-1 text-[14px] leading-5"
          >
            <option value="">Choisir une équipe</option>
            {selectableTeams.filter((t) => !u.teams.includes(t)).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
                <button
                  type="button"
                  disabled={!teamInputs[u.id] || addTeam.isPending}
                  onClick={() => addTeam.mutate({ allowedUserId: u.id, team: teamInputs[u.id] ?? "" })}
                  className="bg-anthracite text-on-anthracite px-4 py-1 label  disabled:opacity-50"
                >
                  {addTeam.isPending && addTeam.variables?.allowedUserId === u.id ? "…" : "AJOUTER"}
                </button>
              </div>
            )}
          </div>
        ))}
        {list.isLoading && <p className="p-4">Chargement…</p>}
      </div>
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
            <button type="button" onClick={() => setRoleDialog(null)} className="px-6 py-2 border border-field text-ink label-13 ">Annuler</button>
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
  const count = (t: string) =>
    users.filter((u) => (u.role === "collaborateur" && u.team === t) || (u.role === "manager" && u.teams.includes(t))).length;
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
  const btn = "px-4 py-1 border border-field text-ink label  disabled:opacity-50";

  return (
    <section className="space-y-4 bg-white border border-line p-6">
      <h2 className="label-13  text-ink">Équipes</h2>
      <form onSubmit={submit} className="flex flex-wrap items-start gap-2">
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nouvelle équipe"
            aria-label="Nouvelle équipe"
            maxLength={60}
            className="border border-line bg-white px-4 py-2 text-[14px] leading-5"
          />
          {err && <p className="text-[#8E1A1F] text-[14px] mt-1">{err}</p>}
        </div>
        <button disabled={create.isPending} className="px-6 py-2 bg-anthracite text-on-anthracite label-13 ">AJOUTER</button>
      </form>
      <ul className="divide-y divide-line border border-line">
        {teams.map((t) => (
          <li key={t.name} className="flex flex-wrap items-center justify-between gap-2 p-2">
            {editing?.from === t.name ? (
              <span className="flex flex-wrap gap-2">
                <input
                  value={editing.to}
                  onChange={(e) => setEditing({ ...editing, to: e.target.value })}
                  aria-label={`Nouveau nom pour ${t.name}`}
                  maxLength={60}
                  className="border border-line bg-white px-4 py-1 text-[14px] leading-5"
                />
                <button
                  type="button"
                  className="bg-anthracite text-on-anthracite px-4 py-1 label "
                  disabled={rename.isPending}
                  onClick={() => {
                    const p = teamSchema.safeParse(editing.to);
                    if (!p.success) return toast.error(p.error.issues[0].message);
                    rename.mutate({ from: t.name, to: p.data });
                  }}
                >
                  Enregistrer
                </button>
                <button type="button" className={btn} onClick={() => setEditing(null)}>Annuler</button>
              </span>
            ) : (
              <span className="text-[14px] leading-5 text-ink">
                {t.is_reserved && <span aria-label="Équipe réservée" title="Équipe réservée" className="mr-2">🔒</span>}
                {t.name} <span className="text-ink-2 text-[14px] leading-5">· {count(t.name)} personne(s)</span>
              </span>
            )}
            {!t.is_reserved && editing?.from !== t.name && (
              <span className="flex gap-2">
                <button type="button" className={btn} onClick={() => setEditing({ from: t.name, to: t.name })}>Renommer</button>
                <button
                  type="button"
                  className={`${btn} text-[#8E1A1F]`}
                  disabled={del.isPending}
                  onClick={() => confirm(`Supprimer l'équipe « ${t.name} » ?`) && del.mutate(t.name)}
                >
                  Supprimer
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
