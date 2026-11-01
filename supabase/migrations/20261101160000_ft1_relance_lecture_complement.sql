-- Lot 2 (FT1), audit contre le prototype : relance, réponse non lue, réponse par question avec documents.
-- Migration ADDITIVE sauf le remplacement de complete_submission (3 paramètres -> 4, le 4e est facultatif).
-- Les triggers de FT2 (notify_decision, record_submission_status, set_decision_info) ne sont pas touchés.

-- 1. Dernière consultation de la décision par l'auteur (pour « Réponse non lue »)
alter table public.submissions add column if not exists author_seen_at timestamptz;

create or replace function public.mark_submission_seen(_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
begin
  if auth.jwt() ->> 'email' is null or not private.is_allowed() then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  update public.submissions
     set author_seen_at = now()
   where id = _id
     and submitted_by_email = lower(auth.jwt() ->> 'email')
     and decided_at is not null
     and (author_seen_at is null or author_seen_at < decided_at);
end
$function$;

-- 2. Relance : l'auteur d'une demande en attente depuis 5 jours ouvrés (ou 5 jours ouvrés après la dernière relance)
create or replace function public.remind_submission(_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  _email text := lower(auth.jwt() ->> 'email');
  _since timestamptz;
  _jours int;
begin
  if _email is null or not private.is_allowed() then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select greatest(created_at, coalesce(reminded_at, created_at)) into _since
    from public.submissions
   where id = _id and submitted_by_email = _email and status = 'en attente'::public.submission_status;
  if not found then
    raise exception 'Cette demande ne peut pas être relancée.';
  end if;
  select count(*) into _jours
    from generate_series((_since at time zone 'Europe/Paris')::date + 1, (now() at time zone 'Europe/Paris')::date, interval '1 day') d
   where extract(isodow from d) < 6;
  if _jours < 5 then
    raise exception 'Relance possible après 5 jours ouvrés.';
  end if;
  update public.submissions set reminded_at = now() where id = _id;
end
$function$;

-- 3. Compléter : une réponse par précision demandée + documents justificatifs
drop function if exists public.complete_submission(uuid, jsonb, text);
create or replace function public.complete_submission(_id uuid, _answers jsonb, _infos text default null, _files jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  _email text := lower(auth.jwt() ->> 'email');
begin
  if _email is null or not private.is_allowed() then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  update public.submissions
     set complement = jsonb_build_object(
           'reponses', coalesce(_answers, '[]'::jsonb),
           'fichiers', coalesce(_files, '[]'::jsonb),
           'infos', nullif(btrim(coalesce(_infos, '')), ''),
           'date', now()),
         status = 'en attente'::public.submission_status,
         rejection_category = null,
         rejection_note = null,
         decided_at = null,
         decided_by_name = null
   where id = _id
     and submitted_by_email = _email
     and status = 'refusée'::public.submission_status
     and rejection_category = 'à clarifier'::public.rejection_category;
  if not found then
    raise exception 'Cette demande ne peut pas être complétée.';
  end if;
end
$function$;

revoke all on function public.complete_submission(uuid, jsonb, text, jsonb) from public, anon;
grant execute on function public.complete_submission(uuid, jsonb, text, jsonb) to authenticated;
revoke all on function public.remind_submission(uuid) from public, anon;
grant execute on function public.remind_submission(uuid) to authenticated;
revoke all on function public.mark_submission_seen(uuid) from public, anon;
grant execute on function public.mark_submission_seen(uuid) to authenticated;

-- 4. Lecture des documents justificatifs par le valideur : ils sont désormais dans complement.fichiers
drop policy if exists "Reviewers and owner read submission PDF" on storage.objects;
create policy "Reviewers and owner read submission PDF" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submission-attachments'
    and (
      private.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.submissions s
         where private.current_app_role() = 'manager'::public.app_role
           and private.can_review_team(s.team)
           and (
             s.attachment_path = objects.name
             or s.complement -> 'fichiers' @> jsonb_build_array(jsonb_build_object('path', objects.name))
           )
      )
    )
  );
