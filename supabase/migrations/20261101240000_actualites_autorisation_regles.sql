-- Circuit d'autorisation (2/2) : règles de passage d'un statut à l'autre.
-- brouillon -> en attente (annonce entreprise, demandée par son auteur) -> autorisée ou refusée (par un admin)
-- autorisée -> publiée (par l'auteur) ; refusée -> brouillon (l'auteur corrige) ou en attente (nouvelle demande).
-- Un manager publie seul uniquement pour ses équipes ; pour toute l'entreprise, l'autorisation d'un admin est requise.
-- Un admin n'est pas contraint : il publie directement et décide des demandes d'autorisation.

create or replace function private.news_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
begin
  if private.is_admin() then
    return NEW;
  end if;

  if NEW.status is distinct from OLD.status then
    if NEW.status = 'en attente'::news_status then
      if NEW.scope <> 'entreprise' or OLD.status not in ('brouillon'::news_status, 'refusée'::news_status) then
        raise exception 'Une demande d''autorisation ne concerne qu''une annonce pour toute l''entreprise.' using errcode = '42501';
      end if;
      NEW.requested_at := now();
    elsif NEW.status = 'publiée'::news_status then
      if not (NEW.scope = 'equipes' and OLD.status = 'brouillon'::news_status) and OLD.status <> 'autorisée'::news_status then
        raise exception 'Cette annonce doit d''abord être autorisée par un admin.' using errcode = '42501';
      end if;
    elsif NEW.status = 'brouillon'::news_status then
      if OLD.status <> 'refusée'::news_status then
        raise exception 'Changement de statut non autorisé.' using errcode = '42501';
      end if;
    else
      raise exception 'Seul un admin autorise ou refuse une annonce.' using errcode = '42501';
    end if;
  end if;

  -- Une annonce autorisée se publie telle quelle : son contenu et son périmètre ne changent plus
  if OLD.status = 'autorisée'::news_status
     and (NEW.scope <> OLD.scope or NEW.title <> OLD.title or NEW.body is distinct from OLD.body) then
    raise exception 'Une annonce autorisée ne se modifie plus.' using errcode = '42501';
  end if;

  -- La décision de l'admin n'est jamais modifiable par l'auteur
  NEW.authorized_by := OLD.authorized_by;
  NEW.authorized_at := OLD.authorized_at;
  NEW.refusal_note := case when NEW.status = 'en attente'::news_status then null else OLD.refusal_note end;
  return NEW;
end
$function$;

drop trigger if exists news_guard on public.news;
create trigger news_guard before update on public.news
  for each row execute function private.news_guard();

-- Le manager reprend la main sur ses annonces refusées ou autorisées ; ses équipes restent limitées aux siennes
drop policy if exists "Manager insert own draft news" on public.news;
create policy "Manager insert own draft news" on public.news
  for insert to authenticated
  with check (
    private.current_app_role() = 'manager'::app_role
    and status = 'brouillon'::news_status
    and author_email = lower(auth.jwt() ->> 'email')
    and (scope = 'entreprise' or not exists (select 1 from unnest(teams) t where not private.can_review_team(t)))
  );

drop policy if exists "Manager update own draft news" on public.news;
create policy "Manager update own draft news" on public.news
  for update to authenticated
  using (
    private.current_app_role() = 'manager'::app_role
    and status in ('brouillon'::news_status, 'refusée'::news_status, 'autorisée'::news_status)
    and author_email = lower(auth.jwt() ->> 'email')
  )
  with check (
    private.current_app_role() = 'manager'::app_role
    and author_email = lower(auth.jwt() ->> 'email')
    and (scope = 'entreprise' or not exists (select 1 from unnest(teams) t where not private.can_review_team(t)))
  );
