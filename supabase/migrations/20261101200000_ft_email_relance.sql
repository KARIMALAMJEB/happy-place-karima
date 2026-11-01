-- E-mail de relance : quand l'auteur relance sa demande (5 jours ouvrés), la personne qui doit décider reçoit
-- un e-mail via le même webhook Make (route « relance », statut = 'relance').
-- Destinataires : validator_type = 'admin' -> les admins ; sinon -> les managers de l'équipe de la demande.
-- Adresses internes de démonstration -> destinataire de démo (comme pour les décisions).
create or replace function public.remind_submission(_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'private', 'extensions'
as $function$
declare
  _email text := lower(auth.jwt() ->> 'email');
  _since timestamptz;
  _jours int;
  _s public.submissions%rowtype;
  _url text;
  _base text;
  _demo text;
  _dest record;
  _to text;
  _req bigint;
begin
  if _email is null or not private.is_allowed() then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select * into _s from public.submissions
   where id = _id and submitted_by_email = _email and status = 'en attente'::public.submission_status;
  if not found then
    raise exception 'Cette demande ne peut pas être relancée.';
  end if;
  _since := greatest(_s.created_at, coalesce(_s.reminded_at, _s.created_at));
  select count(*) into _jours
    from generate_series((_since at time zone 'Europe/Paris')::date + 1, (now() at time zone 'Europe/Paris')::date, interval '1 day') d
   where extract(isodow from d) < 6;
  if _jours < 5 then
    raise exception 'Relance possible après 5 jours ouvrés.';
  end if;
  update public.submissions set reminded_at = now() where id = _id;

  select decrypted_secret into _url  from vault.decrypted_secrets where name = 'make_webhook_url';
  select decrypted_secret into _base from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into _demo from vault.decrypted_secrets where name = 'demo_recipient';
  if _url is null then
    insert into public.submission_email_log(submission_id, status, error) values (_id, 'erreur', 'webhook Make non configuré (relance)');
    return;
  end if;

  for _dest in
    select distinct lower(u.email) as email
      from public.allowed_users u
      join public.allowed_user_roles r on r.allowed_user_id = u.id
     where (_s.validator_type = 'admin' and r.role = 'admin'::public.app_role)
        or (coalesce(_s.validator_type, 'manager') <> 'admin'
            and r.role = 'manager'::public.app_role
            and exists (select 1 from public.manager_teams m where m.allowed_user_id = u.id and m.team = _s.team))
  loop
    _to := _dest.email;
    if _to ~* '@(happyplace\.test|biggerboat\.example)$' then _to := _demo; end if;
    if _to is null then
      insert into public.submission_email_log(submission_id, status, error) values (_id, 'erreur', 'aucune adresse délivrable pour le valideur (relance)');
      continue;
    end if;
    begin
      select net.http_post(
        url := _url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'submission_id', _s.id,
          'statut', 'relance',
          'to', _to,
          'extrait', left(coalesce(nullif(btrim(_s.title), ''), _s.content), 80),
          'auteur', case when _s.confidential_identity then '' else coalesce(_s.author_name, '') end,
          'depose_le', to_char(_s.created_at at time zone 'Europe/Paris', 'DD/MM/YYYY'),
          'jours', _jours,
          'lien', coalesce(_base, '') || '/demande/' || _s.id)
      ) into _req;
      insert into public.submission_email_log(submission_id, status, request_id) values (_id, 'envoyé à Make', _req);
    exception when others then
      insert into public.submission_email_log(submission_id, status, error) values (_id, 'erreur', left(sqlerrm, 300));
    end;
  end loop;
end
$function$;

revoke all on function public.remind_submission(uuid) from public, anon;
grant execute on function public.remind_submission(uuid) to authenticated;
