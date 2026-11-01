-- Périmètre d'une actualité : toute l'entreprise (par défaut) ou une ou plusieurs équipes
alter table public.news
  add column scope text not null default 'entreprise' check (scope in ('entreprise','equipes')),
  add column teams text[] not null default '{}',
  add constraint news_teams_coherentes check (
    (scope = 'entreprise' and cardinality(teams) = 0)
    or (scope = 'equipes' and cardinality(teams) > 0)
  );

-- Lecture : publiée ET (entreprise, ou équipe du lecteur, ou équipe que le manager encadre) ; l'admin et l'auteur gardent leur accès
drop policy "Allowed read published news" on public.news;
create policy "Allowed read published news" on public.news
  for select to authenticated
  using (
    private.is_allowed() and (
      private.is_admin()
      or (author_email = lower((auth.jwt() ->> 'email')))
      or (status = 'publiée' and (
            scope = 'entreprise'
            or private.current_team() = any (teams)
            or exists (select 1 from unnest(teams) t where private.can_review_team(t))
      ))
    )
  );
