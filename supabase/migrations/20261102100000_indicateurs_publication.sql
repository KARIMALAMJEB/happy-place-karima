-- Indicateurs : clés cohérentes, publication choisie par l'admin, date et auteur de la mise à jour,
-- source et définition, historique pour les graphiques. Corrige aussi le test de fumée (manager avec équipe).

-- 1. Nouvelles colonnes
alter table public.metrics
  add column if not exists published boolean not null default false,
  add column if not exists updated_by_name text,
  add column if not exists source text,
  add column if not exists definition text;

-- 2. Clés techniques alignées sur le contenu (l'historique suit la clé via le déclencheur record_metric_history)
update public.metrics set key = 'candidate_response_rate', label = 'Taux de réponse candidats' where key = 'absenteeism';
update public.metrics set key = 'active_missions',          label = 'Mandats actifs', value = 34 where key = 'active_users';
update public.metrics set key = 'acceptance_rate',          label = 'Taux d''acceptation'        where key = 'engagement';
update public.metrics set key = 'candidate_nps',            label = 'NPS candidats'              where key = 'nps';
update public.metrics set key = 'interviews_done',          label = 'Entretiens réalisés'        where key = 'training_hours';
update public.metrics set key = 'placement_rate',           label = 'Taux de placement'          where key = 'training_kpi';
update public.metrics set key = 'time_to_hire',             label = 'Délai moyen de recrutement' where key = 'turnover';

-- 3. Indicateurs ajoutés (effectif du kick-off, objectif annuel)
insert into public.metrics (key, label, value, unit) values
  ('headcount',     'Effectif',                         220, null),
  ('annual_target', 'Objectif annuel de placements',    480, null),
  ('placements_ytd','Placements depuis janvier',        392, null)
on conflict (key) do nothing;

-- 4. Publication par défaut, source, définition, auteur de la dernière mise à jour
update public.metrics m set
  published = v.published,
  source = v.source,
  definition = v.definition,
  updated_by_name = 'Olivia Brun',
  updated_at = now()
from (values
  ('headcount',               true,  'Kick-off du projet (220 salariés)',       'Nombre de salariés de Bigger Boat.'),
  ('active_missions',         true,  'Donnée fictive (cas d''école)',            'Nombre de mandats de recrutement en cours pour des entreprises clientes.'),
  ('open_positions',          true,  'Donnée fictive (cas d''école)',            'Nombre de postes ouverts chez les clients.'),
  ('placement_rate',          true,  'Donnée fictive (cas d''école)',            'Part des candidats présentés qui sont embauchés.'),
  ('time_to_hire',            true,  'Donnée fictive (cas d''école)',            'Nombre moyen de jours entre l''ouverture d''un mandat et la signature du candidat.'),
  ('acceptance_rate',         true,  'Donnée fictive (cas d''école)',            'Part des offres acceptées par les candidats.'),
  ('interviews_done',         false, 'Donnée fictive (cas d''école)',            'Nombre d''entretiens candidats réalisés sur le mois.'),
  ('candidate_nps',           false, 'Donnée fictive (cas d''école)',            'Recommandation des candidats après le processus, de -100 à 100.'),
  ('candidate_response_rate', false, 'Donnée fictive (cas d''école)',            'Part des candidats contactés qui répondent.'),
  ('annual_target',           false, 'Donnée fictive (cas d''école)',            'Nombre de placements visé sur l''année.'),
  ('placements_ytd',          false, 'Donnée fictive (cas d''école)',            'Nombre de placements réalisés depuis le 1er janvier.')
) as v(key, published, source, definition)
where m.key = v.key;

-- 5. Historique pour les graphiques : 6 points mensuels fictifs, le dernier égal à la valeur actuelle
delete from public.metrics_history;
insert into public.metrics_history (metric_key, value, recorded_at)
select s.key, s.vals[i], now() - ((6 - i) * interval '1 month')
from (values
  ('headcount',               array[204,208,211,214,217,220]::numeric[]),
  ('active_missions',         array[28,30,31,33,32,34]::numeric[]),
  ('open_positions',          array[51,54,58,60,66,63]::numeric[]),
  ('placement_rate',          array[34.2,36.0,37.5,38.9,39.8,40.6]::numeric[]),
  ('time_to_hire',            array[38,36,35,33,32,31]::numeric[]),
  ('acceptance_rate',         array[79.5,80.8,81.9,82.7,83.6,84.3]::numeric[]),
  ('interviews_done',         array[140,152,165,171,180,186]::numeric[]),
  ('candidate_nps',           array[60,63,65,68,69,71]::numeric[]),
  ('candidate_response_rate', array[21.0,22.5,24.1,25.6,26.9,27.8]::numeric[]),
  ('annual_target',           array[480,480,480,480,480,480]::numeric[]),
  ('placements_ytd',          array[210,248,285,323,358,392]::numeric[])
) as s(key, vals), generate_series(1, 6) as i;

-- 6. Date et auteur de la mise à jour : posés par la base, jamais par l'écran
create or replace function private.stamp_metric_update()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private'
as $$
begin
  if tg_op = 'INSERT'
     or new.value is distinct from old.value
     or new.label is distinct from old.label
     or new.unit is distinct from old.unit then
    new.updated_at := now();
    new.updated_by_name := coalesce(
      (select trim(u.first_name || ' ' || u.last_name) from public.allowed_users u
        where lower(u.email) = lower(auth.jwt() ->> 'email') limit 1),
      'Système');
  else
    new.updated_at := old.updated_at;
    new.updated_by_name := old.updated_by_name;
  end if;
  return new;
end $$;

drop trigger if exists stamp_metric_update on public.metrics;
create trigger stamp_metric_update before insert or update on public.metrics
  for each row execute function private.stamp_metric_update();

-- 7. Lecture : les indicateurs non publiés ne sont visibles que de l'admin
drop policy if exists "Allowed read" on public.metrics;
create policy "Read published or admin" on public.metrics
  for select using (private.is_allowed() and (published or private.is_admin()));

drop policy if exists "Allowed read metrics history" on public.metrics_history;
create policy "Read history of visible metrics" on public.metrics_history
  for select using (
    private.is_allowed() and (
      private.is_admin()
      or exists (select 1 from public.metrics m where m.key = metrics_history.metric_key and m.published)
    )
  );

-- 8. Vue : ajoute publication, auteur, source, définition (colonnes ajoutées en fin de vue)
create or replace view public.metrics_with_trend with (security_invoker = true) as
select m.key, m.label, m.value, m.unit, m.updated_at,
       p.value as previous_value,
       case when p.value is null or p.value = m.value then 'stable'
            when m.value > p.value then 'hausse' else 'baisse' end as trend,
       case when p.value is null then null::numeric else m.value - p.value end as delta,
       m.published, m.updated_by_name, m.source, m.definition
from public.metrics m
left join lateral (
  select h.value from public.metrics_history h
  where h.metric_key = m.key
  order by h.recorded_at desc offset 1 limit 1
) p on true;

-- 9. Test de fumée : un manager doit avoir une équipe (règle manager_requires_team du 2026-11-01)
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('private.run_smoke_tests'::regproc);
  n := replace(d,
    $q$INSERT INTO allowed_users(email) VALUES ('smoke.manager@test.invalid')$q$,
    $q$INSERT INTO allowed_users(email, team) VALUES ('smoke.manager@test.invalid', _team)$q$);
  if n = d then raise exception 'Test de fumée : ligne à corriger introuvable'; end if;
  execute n;
end $$;
