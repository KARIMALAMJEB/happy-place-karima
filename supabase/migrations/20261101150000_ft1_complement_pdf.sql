-- Lot 2 (FT1) : documents justificatifs joints par l'auteur quand il complète sa demande.
-- Les PDF sont déposés dans le même bucket (dossier de l'auteur) et référencés dans submissions.complement.
-- Migration ADDITIVE : seule la lecture est élargie, au valideur (manager de l'équipe) ; admin et auteur lisaient déjà.
-- L'écriture reste limitée au dossier de l'auteur (règle existante), PDF uniquement.

drop policy if exists "Reviewers and owner read submission PDF" on storage.objects;
create policy "Reviewers and owner read submission PDF" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submission-attachments'
    and (
      private.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.submissions s
         where private.current_app_role() = 'manager'::public.app_role
           and private.can_review_team(s.team)
           and (
             s.attachment_path = objects.name
             or s.complement -> 'reponses' @> jsonb_build_array(jsonb_build_object('path', objects.name))
           )
      )
    )
  );
