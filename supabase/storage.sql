  -- Run after 202607280001_initial_league_schema.sql.
  -- Creates public asset buckets with staff-only write access.

  begin;

  insert into storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
  )
  values
    (
      'team-logos', 'team-logos', true, 5242880,
      array['image/png', 'image/jpeg', 'image/webp']
    ),
    (
      'player-photos', 'player-photos', true, 5242880,
      array['image/png', 'image/jpeg', 'image/webp']
    ),
    (
      'news-images', 'news-images', true, 10485760,
      array['image/png', 'image/jpeg', 'image/webp']
    ),
    (
      'staff-avatars', 'staff-avatars', true, 5242880,
      array['image/png', 'image/jpeg', 'image/webp']
    )
  on conflict (id) do nothing;

  -- Never turn an existing private bucket public implicitly. Review its contents
  -- and make that decision explicitly before rerunning this file.
  do $storage_setup$
  declare
    private_buckets text;
  begin
    select string_agg(id, ', ' order by id)
    into private_buckets
    from storage.buckets
    where id in ('team-logos', 'player-photos', 'news-images', 'staff-avatars')
      and not public;

    if private_buckets is not null then
      raise exception 'Existing buckets are private (%). Review before making public.',
        private_buckets;
    end if;
  end
  $storage_setup$;

  update storage.buckets
  set
    file_size_limit = case when id = 'news-images' then 10485760 else 5242880 end,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id in ('team-logos', 'player-photos', 'news-images', 'staff-avatars');

  -- These bucket names are owned by this app. Remove every policy that references
  -- them so a permissive legacy policy cannot combine with the canonical policies.
  do $storage_setup$
  declare
    legacy_policy record;
  begin
    for legacy_policy in
      select policyname
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and (
          policyname like 'pbl_%'
          or coalesce(qual, '') || ' ' || coalesce(with_check, '')
            ~ '(team-logos|player-photos|news-images|staff-avatars)'
        )
    loop
      execute format(
        'drop policy if exists %I on storage.objects',
        legacy_policy.policyname
      );
    end loop;
  end
  $storage_setup$;

  create policy pbl_assets_public_read on storage.objects
    for select to anon, authenticated
    using (bucket_id in ('team-logos', 'player-photos', 'news-images', 'staff-avatars'));

  create policy pbl_team_logos_write on storage.objects
    for all to authenticated
    using (
      bucket_id = 'team-logos'
      and case
        when (storage.foldername(name))[1]
          ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        then public.can_manage_team(((storage.foldername(name))[1])::uuid)
        else false
      end
    )
    with check (
      bucket_id = 'team-logos'
      and char_length(name) between 1 and 512
      and case
        when (storage.foldername(name))[1]
          ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        then public.can_manage_team(((storage.foldername(name))[1])::uuid)
        else false
      end
    );

  create policy pbl_editor_player_photos_write on storage.objects
    for all to authenticated
    using (bucket_id = 'player-photos' and public.is_editor())
    with check (
      bucket_id = 'player-photos'
      and public.is_editor()
      and char_length(name) between 1 and 512
    );

  create policy pbl_editor_news_images_write on storage.objects
    for all to authenticated
    using (bucket_id = 'news-images' and public.is_editor())
    with check (
      bucket_id = 'news-images'
      and public.is_editor()
      and char_length(name) between 1 and 512
    );

  create policy pbl_admin_staff_avatars_write on storage.objects
    for all to authenticated
    using (bucket_id = 'staff-avatars' and public.is_admin())
    with check (bucket_id = 'staff-avatars' and public.is_admin());

  commit;
