-- Sign-in gate for the Client Dashboard.
--
-- 1. A public.profiles row per auth user, with an `approved` flag that the
--    dashboard owner flips by hand (anyone can register; only approved users
--    see data).
-- 2. Row Level Security on every dashboard table: approved, signed-in users
--    only. Anonymous access is removed.
-- 3. The private "media" storage bucket gets the same rule.
--
-- Run this in the Supabase SQL editor (Database -> SQL). It is safe to re-run.
--
-- To approve someone afterwards:
--   update public.profiles set approved = true where id = '<verified-auth-user-uuid>';

-- 1. Profiles ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Keep a profile row for every auth user. The name comes from the register form
-- (auth.signUp options.data.full_name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users that registered before this migration existed.
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

-- True for a signed-in user whose profile has been approved.
-- security definer so the check works even though profiles has RLS.
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select approved from public.profiles where id = auth.uid()),
    false
  );
$$;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

revoke all on table public.profiles from anon;
grant select on table public.profiles to authenticated;

-- 2. Dashboard tables -------------------------------------------------------

do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array[
    'students',
    'lesson_plans',
    'lesson_plan_images',
    'media',
    'yoga_sessions',
    'tasks',
    'beauty_packages',
    'appointments',
    'student_assigned_plans',
    'sync_state'
  ]
  loop
    if to_regclass('public.' || tbl) is null then
      raise notice 'table public.% does not exist, skipped', tbl;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', tbl);

    -- Drop whatever policies exist today (including the anonymous ones).
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_approved()) with check (public.is_approved())',
      tbl || ': approved users',
      tbl
    );

    execute format('revoke all on table public.%I from anon', tbl);
  end loop;
end
$$;

-- 3. Storage bucket "media" ------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (coalesce(qual, '') ilike '%media%' or coalesce(with_check, '') ilike '%media%')
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end
$$;

create policy "media: approved users read"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_approved());

create policy "media: approved users insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_approved());

create policy "media: approved users update"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_approved())
  with check (bucket_id = 'media' and public.is_approved());

create policy "media: approved users delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_approved());
