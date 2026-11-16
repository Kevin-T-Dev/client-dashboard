-- Run after the schema and auth migrations. Replace the nil UUID with the
-- verified client Auth user ID before running this entire file.
begin;

do $setup$
declare
  client_id constant uuid := '00000000-0000-0000-0000-000000000000';
  dashboard_table text;
begin
  if client_id = '00000000-0000-0000-0000-000000000000'::uuid
     or not exists (
       select 1
       from auth.users as account
       join public.profiles as profile on profile.id = account.id
       where account.id = client_id and profile.approved
     ) then
    raise exception 'Set client_id to the verified, approved client Auth user ID';
  end if;

  execute format($function$
    create or replace function public.is_approved()
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $body$
      select auth.uid() is not distinct from %L::uuid
        and exists (
          select 1 from public.profiles
          where id = auth.uid() and approved
        );
    $body$
  $function$, client_id);

  -- Restrictive policies also constrain any other permissive policies.
  foreach dashboard_table in array array[
    'students', 'lesson_plans', 'lesson_plan_images', 'media', 'yoga_sessions',
    'tasks', 'beauty_packages', 'appointments', 'student_assigned_plans', 'sync_state'
  ] loop
    execute format('alter table public.%I enable row level security', dashboard_table);
    execute format('drop policy if exists "client account only" on public.%I', dashboard_table);
    execute format(
      'create policy "client account only" on public.%I as restrictive for all to public
       using (public.is_approved()) with check (public.is_approved())',
      dashboard_table
    );
  end loop;
end;
$setup$;

-- Supabase public bucket downloads bypass object RLS.
update storage.buckets set public = false where id = 'media';

drop policy if exists "media: client account only" on storage.objects;
create policy "media: client account only"
  on storage.objects as restrictive for all to public
  using (case when bucket_id = 'media' then public.is_approved() else true end)
  with check (case when bucket_id = 'media' then public.is_approved() else true end);

grant execute on function public.is_approved() to anon, authenticated;

commit;
