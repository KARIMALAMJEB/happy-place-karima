-- Test de fumée : l'actualité de test vise l'équipe du manager, car un manager publie seul pour ses équipes
-- et a besoin de l'autorisation d'un admin pour « toute l'entreprise » (règle du 2026-11-01).
do $b$
declare d text; n text;
begin
  d := pg_get_functiondef('private.run_smoke_tests'::regproc);
  n := replace(d,
    $q$INSERT INTO news(title, body, author, status) VALUES ('Actu de test', 'Corps', 'Smoke', 'brouillon') RETURNING id INTO _n;$q$,
    $q$INSERT INTO news(title, body, author, status, scope, teams) VALUES ('Actu de test', 'Corps', 'Smoke', 'brouillon', 'equipes', ARRAY[_team]) RETURNING id INTO _n;$q$);
  if n = d then raise exception 'Test de fumée : ligne à corriger introuvable'; end if;
  execute n;
end $b$;
