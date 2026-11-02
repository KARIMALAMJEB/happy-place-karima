-- Rédiger une actualité, comme au prototype : catégorie, jusqu'à 3 photos (la première = couverture),
-- accord des personnes photographiées, jusqu'à 4 fichiers PDF joints.
alter table public.news
  add column if not exists category text,
  add column if not exists image_paths text[] not null default '{}',
  add column if not exists image_consent boolean not null default false,
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Les actualités existantes gardent leur photo : elle devient la couverture
update public.news set image_paths = array[image_path] where image_path is not null and image_paths = '{}';

-- Le bucket des médias d'actualité accepte aussi les PDF (en plus des photos)
drop policy if exists "News media insert" on storage.objects;
create policy "News media insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'news-media'
    and private.is_allowed()
    and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'pdf'])
    and private.can_edit_news_media((storage.foldername(name))[1])
  );

drop policy if exists "News media update" on storage.objects;
create policy "News media update" on storage.objects
  for update to authenticated
  using (bucket_id = 'news-media' and private.can_edit_news_media((storage.foldername(name))[1]))
  with check (
    bucket_id = 'news-media'
    and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'pdf'])
    and private.can_edit_news_media((storage.foldername(name))[1])
  );
