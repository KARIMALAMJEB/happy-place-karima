-- FT2 (correctif) : le scénario Make attend statut = 'à clarifier' et le champ 'precisions' pour l'e-mail « Demande à compléter »;
-- sans cela, une demande « à clarifier » partait en e-mail « refusée ». Aucune modification de Make nécessaire.
-- FT2 : l'e-mail de retour à l'auteur pointe vers la page de la demande (/demande/{id}) et porte
-- la référence, le titre et les questions posées. Même déclencheur, même webhook Make.
create or replace function private.notify_decision()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'private', 'extensions'
as $function$
declare
  _url text;
  _base text;
  _demo text;
  _to text;
  _req bigint;
begin
  if NEW.status not in ('validée', 'refusée') or NEW.status is not distinct from OLD.status then
    return NEW;
  end if;
  select decrypted_secret into _url  from vault.decrypted_secrets where name = 'make_webhook_url';
  select decrypted_secret into _base from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into _demo from vault.decrypted_secrets where name = 'demo_recipient';
  _to := NEW.submitted_by_email;
  -- Adresses internes de démonstration (comptes anonymes, membres fictifs) : non délivrables
  if _to ~* '@(happyplace\.test|biggerboat\.example)$' then
    _to := _demo;
  end if;
  if _url is null or _to is null then
    insert into public.submission_email_log(submission_id, status, error)
    values (NEW.id, 'erreur', case when _url is null then 'webhook Make non configuré' else 'aucune adresse délivrable pour l''auteur' end);
    return NEW;
  end if;
  begin
    select net.http_post(
      url := _url,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'submission_id', NEW.id,
        'reference', '#D-' || to_char(NEW.created_at at time zone 'Europe/Paris', 'YYYY') || '-' || lpad(coalesce(NEW.ref_number, 0)::text, 3, '0'),
        'titre', coalesce(nullif(btrim(NEW.title), ''), left(NEW.content, 80)),
        'to', _to,
        'extrait', left(NEW.content, 80),
        'statut', case when NEW.status = 'refusée' and NEW.rejection_category = 'à clarifier' then 'à clarifier' else NEW.status end,
        'decidee_le', to_char(NEW.decided_at, 'DD/MM/YYYY'),
        'decidee_par', NEW.decided_by_name,
        'motif_categorie', NEW.rejection_category,
        'motif', NEW.rejection_note,
        'precisions', coalesce((select string_agg(' - ' || q, E'\n') from jsonb_array_elements_text(coalesce(NEW.clarifications, '[]'::jsonb)) q), ''),
        'lien', coalesce(_base, '') || '/demande/' || NEW.id)
    ) into _req;
    insert into public.submission_email_log(submission_id, status, request_id)
    values (NEW.id, 'envoyé à Make', _req);
  exception when others then
    insert into public.submission_email_log(submission_id, status, error)
    values (NEW.id, 'erreur', left(sqlerrm, 300));
  end;
  return NEW;
end $function$;
