-- Lets the Forgot Password page check whether an email has an account before
-- sending a reset link, so unknown addresses can be sent to the Register page.
--
-- profiles is only readable by its own signed-in user, so this is a
-- security definer function that returns a single true/false and nothing else.
-- Note: this lets anyone test whether an address is registered.
--
-- Run this in the Supabase SQL editor (Database -> SQL). It is safe to re-run.

create or replace function public.email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;

revoke all on function public.email_registered(text) from public;
grant execute on function public.email_registered(text) to anon, authenticated;
