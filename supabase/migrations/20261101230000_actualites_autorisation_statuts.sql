-- Circuit d'autorisation des annonces « Toute l'entreprise » (1/2) : nouveaux statuts et colonnes.
-- Les statuts sont ajoutés seuls : une valeur d'enum ne peut pas servir dans la transaction qui la crée.
alter type public.news_status add value if not exists 'en attente';
alter type public.news_status add value if not exists 'autorisée';
alter type public.news_status add value if not exists 'refusée';

alter table public.news
  add column if not exists requested_at timestamptz,
  add column if not exists authorized_by text,
  add column if not exists authorized_at timestamptz,
  add column if not exists refusal_note text;
