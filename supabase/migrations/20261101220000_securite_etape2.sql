-- Sécurité, étape 2 (à valider avant application)
-- 1) Un dépôt ne peut être fait qu'en son propre nom (adresse = celle du compte connecté).
-- 2) Un manager ne décide pas ses propres demandes.
-- 3) Un manager ne rédige que pour les équipes qu'il gère (ou pour toute l'entreprise).

-- 1) Dépôt en son propre nom
drop policy if exists "Allowed create pending submissions" on public.submissions;
create policy "Allowed create pending submissions" on public.submissions
  for insert to authenticated
  with check (
    private.is_allowed()
    and status = 'en attente'::submission_status
    and submitted_by_email = lower(auth.jwt() ->> 'email')
  );

-- 2) Pas d'auto-décision pour un manager
drop policy if exists "Managers review assigned submissions" on public.submissions;
create policy "Managers review assigned submissions" on public.submissions
  for update to authenticated
  using (
    private.current_app_role() = 'manager'::app_role
    and private.can_review_team(team)
    and status = any (array['en attente'::submission_status, 'validée'::submission_status])
    and submitted_by_email is distinct from lower(auth.jwt() ->> 'email')
  )
  with check (
    private.current_app_role() = 'manager'::app_role
    and private.can_review_team(team)
    and status = any (array['validée'::submission_status, 'refusée'::submission_status])
    and submitted_by_email is distinct from lower(auth.jwt() ->> 'email')
  );

-- 3) Équipes d'une actualité de manager : uniquement les siennes
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
    and status = 'brouillon'::news_status
    and author_email = lower(auth.jwt() ->> 'email')
  )
  with check (
    private.current_app_role() = 'manager'::app_role
    and status = any (array['brouillon'::news_status, 'publiée'::news_status])
    and author_email = lower(auth.jwt() ->> 'email')
    and (scope = 'entreprise' or not exists (select 1 from unnest(teams) t where not private.can_review_team(t)))
  );
