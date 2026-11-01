-- Rappel groupé de l'admin : relance les valideurs de toutes les demandes en attente depuis 5 jours ouvrés ou plus.
-- Même e-mail « relance » que la relance de l'auteur (scénario Make existant). Réservé à l'admin.
-- Une demande déjà relancée (par son auteur ou par l'admin) n'est relancée qu'après 5 nouveaux jours ouvrés.
create or replace function public.remind_overdue_submissions()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'private', 'extensions'
as $function$
declare
  _s public.submissions%rowtype;
  _since timestamptz;
  _jours int;
  _url text; _base text; _demo text;
  _dest record; _to text; _req bigint;
  _n int := 0;
begin
  if not private.is_admin() then
    raise exception 'Seul un admin peut envoyer un rappel groupé.' using errcode = '42501';
  end if;
  select decrypted_secret into _url  from vault.decrypted_secrets where name = 'make_webhook_url';
  select decrypted_secret into _base from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into _demo from vault.decrypted_secrets where name = 'demo_recipient';

  for _s in select * from public.submissions where status = 'en attente'::public.submission_status order by created_at loop
    _since := greatest(_s.created_at, coalesce(_s.reminded_at, _s.created_at));
    select count(*) into _jours
      from generate_series((_since at time zone 'Europe/Paris')::date + 1, (now() at time zone 'Europe/Paris')::date, interval '1 day') d
     where extract(isodow from d) < 6;
    continue when _jours < 5;

    update public.submissions set reminded_at = now() where id = _s.id;
    _n := _n + 1;
    if _url is null then
      insert into public.submission_email_log(submission_id, status, error) values (_s.id, 'erreur', 'webhook Make non configuré (rappel groupé)');
      continue;
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
        insert into public.submission_email_log(submission_id, status, error) values (_s.id, 'erreur', 'aucune adresse délivrable pour le valideur (rappel groupé)');
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
        insert into public.submission_email_log(submission_id, status, request_id) values (_s.id, 'envoyé à Make', _req);
      exception when others then
        insert into public.submission_email_log(submission_id, status, error) values (_s.id, 'erreur', left(sqlerrm, 300));
      end;
    end loop;
  end loop;
  return _n;
end
$function$;

revoke execute on function public.remind_overdue_submissions() from public, anon;
grant execute on function public.remind_overdue_submissions() to authenticated;
