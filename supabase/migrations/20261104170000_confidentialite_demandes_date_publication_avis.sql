-- Migration proposée : confidentialité des demandes, date de publication, avis sur les actualités

-- 1. Demandes : l'admin n'accède qu'aux demandes où il est valideur ou que l'auteur lui ouvre
alter table public.submissions add column if not exists admin_access boolean not null default false;

drop policy if exists "Admins manage submissions" on public.submissions;

alter policy "Allowed read submissions" on public.submissions using (
  private.is_allowed() and (
    (private.is_admin() and (validator_type = 'admin' or admin_access))
    or (private.current_app_role() = 'manager'::app_role and private.can_review_team(team))
    or submitted_by_email = lower(auth.jwt() ->> 'email')
    or (status = 'validée'::submission_status and (
         visibility = 'tous'::request_visibility
         or (visibility = 'equipe'::request_visibility and lower(team) = lower(coalesce(private.current_team(), '')))))
  )
);

create policy "Admins review accessible submissions" on public.submissions
  for update to authenticated
  using (private.is_admin() and (validator_type = 'admin' or admin_access)
         and status = any (array['en attente'::submission_status, 'validée'::submission_status])
         and submitted_by_email is distinct from lower(auth.jwt() ->> 'email'))
  with check (private.is_admin() and (validator_type = 'admin' or admin_access)
         and status = any (array['validée'::submission_status, 'refusée'::submission_status])
         and submitted_by_email is distinct from lower(auth.jwt() ->> 'email'));

create or replace function public.set_submission_admin_access(_id uuid, _value boolean)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from public.submissions
                 where id = _id and submitted_by_email = lower(auth.jwt() ->> 'email')) then
    raise exception 'Seul l''auteur de la demande peut modifier cet accès.' using errcode = '42501';
  end if;
  update public.submissions set admin_access = _value where id = _id;
end $$;
revoke all on function public.set_submission_admin_access(uuid, boolean) from public, anon;
grant execute on function public.set_submission_admin_access(uuid, boolean) to authenticated;

-- 2. Pièces jointes, journal d'envoi et lectures : même règle
alter policy "Reviewers and owner read submission PDF" on storage.objects using (
  bucket_id = 'submission-attachments' and (
    (storage.foldername(name))[1] = (auth.uid())::text
    or exists (
      select 1 from public.submissions s
      where (s.attachment_path = objects.name
             or (s.complement -> 'fichiers') @> jsonb_build_array(jsonb_build_object('path', objects.name)))
        and ((private.current_app_role() = 'manager'::app_role and private.can_review_team(s.team))
             or (private.is_admin() and (s.validator_type = 'admin' or s.admin_access)))
    )
  )
);

alter policy "Admins read email log" on public.submission_email_log using (
  private.is_admin() and exists (select 1 from public.submissions s where s.id = submission_email_log.submission_id)
);

alter policy "Read own seen" on public.submission_seen using (
  user_email = lower(auth.jwt() ->> 'email')
);

-- 3. Actualités : date de publication
alter table public.news add column if not exists published_at timestamptz;
update public.news set published_at = coalesce(authorized_at, created_at)
 where status = 'publiée'::news_status and published_at is null;

create or replace function private.set_news_published_at()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if tg_op = 'INSERT' then
    NEW.published_at := case when NEW.status = 'publiée'::news_status then now() else null end;
  elsif NEW.status = 'publiée'::news_status and OLD.status is distinct from 'publiée'::news_status then
    NEW.published_at := now();
  else
    NEW.published_at := OLD.published_at;
  end if;
  return NEW;
end $$;
create trigger news_set_published_at before insert or update on public.news
  for each row execute function private.set_news_published_at();

-- 4. Actualités : avis (pouce levé ou baissé), une voix par personne et par actualité
create table public.news_reactions (
  news_id uuid not null references public.news(id) on delete cascade,
  user_email text not null,
  reaction smallint not null check (reaction in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (news_id, user_email)
);
alter table public.news_reactions enable row level security;
revoke all on public.news_reactions from anon;

create policy "Read own reaction" on public.news_reactions
  for select to authenticated using (user_email = lower(auth.jwt() ->> 'email'));
create policy "React to readable published news" on public.news_reactions
  for insert to authenticated
  with check (private.is_allowed() and user_email = lower(auth.jwt() ->> 'email')
              and exists (select 1 from public.news n where n.id = news_id and n.status = 'publiée'::news_status));
create policy "Change own reaction" on public.news_reactions
  for update to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'))
  with check (user_email = lower(auth.jwt() ->> 'email')
              and exists (select 1 from public.news n where n.id = news_id and n.status = 'publiée'::news_status));
create policy "Remove own reaction" on public.news_reactions
  for delete to authenticated using (user_email = lower(auth.jwt() ->> 'email'));

create or replace function private.reaction_counts(_ids uuid[])
returns table(news_id uuid, likes int, dislikes int)
language sql stable security definer set search_path = public as $$
  select r.news_id, (count(*) filter (where r.reaction = 1))::int, (count(*) filter (where r.reaction = -1))::int
  from public.news_reactions r where r.news_id = any(_ids) group by r.news_id
$$;
revoke all on function private.reaction_counts(uuid[]) from public, anon;
grant execute on function private.reaction_counts(uuid[]) to authenticated;

create or replace function public.news_reaction_counts(_ids uuid[])
returns table(news_id uuid, likes int, dislikes int, mine smallint)
language sql stable security invoker set search_path = public as $$
  select n.id, coalesce(c.likes, 0), coalesce(c.dislikes, 0),
         (select m.reaction from public.news_reactions m
           where m.news_id = n.id and m.user_email = lower(auth.jwt() ->> 'email'))
  from public.news n left join private.reaction_counts(_ids) c on c.news_id = n.id
  where n.id = any(_ids) and n.status = 'publiée'::news_status
$$;
revoke all on function public.news_reaction_counts(uuid[]) from public, anon;
grant execute on function public.news_reaction_counts(uuid[]) to authenticated;

-- 5. Managers de secours : au moins deux managers par équipe qui a des membres
insert into public.manager_teams (allowed_user_id, team)
select u.id, v.team from (values
  ('Finance','maelle'),('Marketing','sophie'),('Pôle Data et IA','karim'),('Product','julie')
) v(team, who)
join public.allowed_users u on (
  (v.who='maelle' and u.email like 'eleve-5e04bfb44890@%') or
  (v.who='sophie' and u.email='sophie.marchand@biggerboat.example') or
  (v.who='karim' and u.email='karim.haddad@biggerboat.example') or
  (v.who='julie' and u.email='julie.moreau@biggerboat.example'))
where not exists (select 1 from public.manager_teams m where m.allowed_user_id=u.id and m.team=v.team);
